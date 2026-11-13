// Read-only instruction observer over the exact HostMachine power-on replay.
// c++ -O2 -std=c++20 -ffp-contract=off -I LAB/rl/csrc -I LAB/.cache/nesle-src/cpp/include \
// tools/harness/native-enemy-cursor-observer.cpp LAB/.cache/nesle-src/cpp/src/rom.cpp -o /tmp/native-enemy-cursor-observer
// ROM PADS EXPECTED_RAM OUT_JSONL [MAX_FRAMES]. Every completed PPU RAM row must match.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <optional>
#include <string>
using namespace nesle::cuda;
std::vector<std::uint8_t> readBytes(const char* p){std::ifstream in(p,std::ios::binary);if(!in)throw std::runtime_error(p);return {(std::istreambuf_iterator<char>(in)),{}};}
struct Init {int slot,id,flag,x,y;};
struct Attempt {std::size_t frame;int slot,offset,page,selected,camera,hard,primary,frenzy,vine,queue,sp,ret,pointer;std::vector<Init> init;};
int main(int argc,char** argv){try{
 if(argc<5||argc>6)throw std::runtime_error("ROM PADS EXPECTED_RAM OUT_JSONL [MAX_FRAMES]");
 const auto rom=readBytes(argv[1]),pads=readBytes(argv[2]);std::ifstream expected(argv[3],std::ios::binary);std::ofstream out(argv[4]);if(!expected||!out)throw std::runtime_error("Input/output unavailable");
 rle::HostMachine m(rom);if(m.mode!=0)throw std::runtime_error("NROM required");
 const auto find=[&](std::initializer_list<unsigned char> bytes){int found=-1;for(std::size_t i=0;i+bytes.size()<=m.prg.size();i++)if(std::equal(bytes.begin(),bytes.end(),m.prg.begin()+i)){if(found>=0)throw std::runtime_error("Nonunique source signature");found=static_cast<int>(i)+0x8000;}if(found<0)throw std::runtime_error("Missing source signature");return found;};
 const int check=find({0xad,0xcd,0x06,0xf0}),checkpoint=find({0xb5,0x16,0xc9,0x15,0xb0,0x0d,0xa8,0xb5,0xcf,0x69,0x08});
 const int initPC=checkpoint+6+static_cast<std::int8_t>(m.prg[checkpoint-0x8000+5]);
 std::optional<Attempt> active;std::size_t calls=0,initialized=0;std::uint8_t reference[2048];
 const auto observe=[&](const auto& cpu,std::size_t frame){
  const auto* r=m.b.cpu.ram;
  if(active&&cpu.pc==active->ret&&cpu.sp==((active->sp+2)&255)){
   const auto& a=*active;out<<"{\"frame\":"<<a.frame<<",\"endFrame\":"<<frame<<",\"pointer\":"<<a.pointer<<",\"slot\":"<<a.slot<<",\"camera\":"<<a.camera<<",\"hard\":"<<a.hard<<",\"primaryHard\":"<<a.primary<<",\"frenzy\":"<<a.frenzy<<",\"vine\":"<<a.vine<<",\"queue\":"<<a.queue<<",\"before\":["<<a.offset<<','<<a.page<<','<<a.selected<<"],\"after\":["<<int(r[0x739])<<','<<int(r[0x73a])<<','<<int(r[0x73b])<<"],\"flag\":"<<int(r[15+a.slot])<<",\"init\":[";
   bool comma=false;for(const auto& i:a.init){if(comma)out<<',';comma=true;out<<'['<<i.slot<<','<<i.id<<','<<i.flag<<','<<i.x<<','<<i.y<<']';}out<<"]}\n";calls++;active.reset();
  }
  if(cpu.pc==check){
   if(active){if(cpu.sp==active->sp&&cpu.x==active->slot)return;throw std::runtime_error("Nested enemy parser attempt");}const int sp=cpu.sp,ret=(r[0x100+((sp+1)&255)]+r[0x100+((sp+2)&255)]*256+1)&65535;
   active=Attempt{frame,int(cpu.x),int(r[0x739]),int(r[0x73a]),int(r[0x73b]),r[0x71a]*256+r[0x71c],int(r[0x6cc]),int(r[0x76a]),int(r[0x6cb]),int(r[0x398]),int(r[0x6cd]),sp,ret,r[0xe9]+r[0xea]*256,{}};
  }
  if(active&&cpu.pc==initPC){const int slot=cpu.x;active->init.push_back({slot,int(r[0x16+slot]),int(r[15+slot]),r[0x6e + slot]*256+r[0x87+slot],(int(r[0xb6+slot])-1)*256+r[0xcf+slot]});initialized++;}
 };
 const auto last=argc==6?std::min<std::size_t>(pads.size(),std::stoull(argv[5])):pads.size();
 for(std::size_t frame=0;frame<last;frame++){
  auto& b=m.b;b.action_masks[0]=pads[frame];auto state=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);std::uint32_t pending=0,toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);bool done=false;
  for(std::uint64_t instructions=0;instructions<rlm::kBudget&&!done;instructions++){
   if(pending>=toEvent){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;}
   observe(state,frame);const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,state,hot,pending);if(step.cpu.illegal)throw std::runtime_error("Illegal instruction");pending+=step.ppu_cycles;
   if(step.cpu.opcode==0x4c&&state.pc==step.cpu.pc){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;(void)fast_forward_batch_console_idle_loop_hot<kBankModeNrom>(b,0,state,hot);toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);done=hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target;}
  }
  if(pending)batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);store_cpu_state(b,0,state);store_ppu_hot_state(b,0,hot);m.target+=rlm::kFrameDots;
  expected.read(reinterpret_cast<char*>(reference),2048);if(!expected||std::memcmp(reference,b.cpu.ram,2048))throw std::runtime_error("Native prefix mismatch row"+std::to_string(frame));
 }
 std::cout<<"{\"verifiedRows\":"<<last<<",\"attempts\":"<<calls<<",\"initializers\":"<<initialized<<"}\n";
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
