// Capture actual source procedure entry/return, without modifying native RAM.
// Build exactly like native-poweron-timing.cpp. BIN ROM PADS EXPECTED_RAM FROM TO ENTRY_PC
#include "rlenv_build.hpp"
#include <array>
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <vector>
using namespace nesle::cuda;
std::vector<unsigned char> bytes(const char* path){std::ifstream f(path,std::ios::binary);if(!f)throw std::runtime_error(path);return {(std::istreambuf_iterator<char>(f)),{}};}
void cpu(const nesle::cpu::CpuState& c){std::cout<<"{\"pc\":"<<c.pc<<",\"a\":"<<+c.a<<",\"x\":"<<+c.x<<",\"y\":"<<+c.y<<",\"p\":"<<+c.p<<",\"sp\":"<<+c.sp<<",\"cycles\":"<<c.cycles<<'}';}
void ram(const unsigned char* r){const char* h="0123456789abcdef";std::cout<<'"';for(unsigned i=0;i<2048;i++)std::cout<<h[r[i]>>4]<<h[r[i]&15];std::cout<<'"';}
struct Procedure {
 unsigned entry;bool active=false,comma=false;std::size_t startRow=0;nesle::cpu::CpuState initial;unsigned char before[2048];unsigned instructions=0;
 struct Partial {std::size_t row;nesle::cpu::CpuState cpu;std::array<unsigned char,2048> ram;};std::vector<Partial> partials;
 void sample(const nesle::cpu::CpuState& c,const unsigned char* r,std::size_t row){if(active){Partial p{row,c,{}};std::memcpy(p.ram.data(),r,2048);partials.push_back(p);}}
 void begin(const nesle::cpu::CpuState& c,const unsigned char* r,std::size_t row){if(!active&&c.pc==entry){active=true;initial=c;std::memcpy(before,r,2048);startRow=row;instructions=0;partials.clear();}}
 void end(const BatchConsoleStepResult& step,const nesle::cpu::CpuState& c,const unsigned char* r,std::size_t row){
  if(!active)return;instructions++;
  if(step.cpu.opcode==0x60&&c.sp==((initial.sp+2)&255)){if(comma)std::cout<<',';comma=true;std::cout<<"{\"from\":"<<startRow<<",\"to\":"<<row<<",\"instructions\":"<<instructions<<",\"initial\":";cpu(initial);std::cout<<",\"before\":";ram(before);std::cout<<",\"final\":";cpu(c);std::cout<<",\"after\":";ram(r);std::cout<<",\"partials\":[";bool first=true;for(const auto& partial:partials){if(!first)std::cout<<',';first=false;std::cout<<"{\"row\":"<<partial.row<<",\"cpu\":";cpu(partial.cpu);std::cout<<",\"ram\":";ram(partial.ram.data());std::cout<<'}';}std::cout<<"]}";active=false;}
 }
};
// Same lazy instruction/PPU-settlement/idle-forward order as HostMachine::frame.
unsigned frame(rle::HostMachine& m,unsigned char pad,Procedure& p,std::size_t row){
 auto& b=m.b;b.action_masks[0]=pad;auto state=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);unsigned pending=0,toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot),fault=0;bool done=false;
 const auto settle=[&](){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;};
 for(std::uint64_t count=0;count<rlm::kBudget&&!done;count++){
  if(pending>=toEvent){settle();toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;}
  p.begin(state,b.cpu.ram,row);const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,state,hot,pending);if(step.cpu.illegal){fault=1;break;}p.end(step,state,b.cpu.ram,row);pending+=step.ppu_cycles;
  if(step.cpu.opcode==0x4c&&state.pc==step.cpu.pc){settle();if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;(void)fast_forward_batch_console_idle_loop_hot<kBankModeNrom>(b,0,state,hot);toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);done=hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target;}
 }
 if(pending)settle();p.sample(state,b.cpu.ram,row);store_cpu_state(b,0,state);store_ppu_hot_state(b,0,hot);m.target+=rlm::kFrameDots;return fault;
}
int main(int argc,char** argv){try{
 if(argc!=7)return 2;const auto rom=bytes(argv[1]),pads=bytes(argv[2]);std::ifstream reference(argv[3],std::ios::binary);const auto from=std::stoull(argv[4]),to=std::stoull(argv[5]);if(from>to||to>=pads.size())return 3;Procedure p{static_cast<unsigned>(std::stoul(argv[6],nullptr,0))};rle::HostMachine m(rom);if(m.mode!=0)return 4;unsigned char expected[2048];std::cout<<'[';
 for(std::size_t f=0;f<=to;f++){if(f>=from?frame(m,pads[f],p,f):m.frame(pads[f]))throw std::runtime_error("CPU fault");reference.read(reinterpret_cast<char*>(expected),2048);if(!reference||std::memcmp(expected,m.b.cpu.ram,2048))throw std::runtime_error("Native RAM mismatch "+std::to_string(f));}
 if(p.active)throw std::runtime_error("Observation ends inside selected procedure");std::cout<<"]\n";return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
