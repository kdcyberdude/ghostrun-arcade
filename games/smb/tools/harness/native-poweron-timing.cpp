// Timing-only observer of the rollout's unmodified HostMachine; ROM is supplied locally, never bundled.
// c++ -O2 -std=c++20 -ffp-contract=off -I LAB/rl/csrc -I LAB/.cache/nesle-src/cpp/include \
//   tools/harness/native-poweron-timing.cpp LAB/.cache/nesle-src/cpp/src/rom.cpp -o /tmp/native-poweron-timing
// ROM PADS EXPECTED_RAM FROM TO [BRANCH_START]. Baseline compares every RAM sample through TO.
// Optional diagnostic branches restore the exact native CPU/PPU snapshot and modify only listed native RAM inputs.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <string>
#include <utility>
std::vector<std::uint8_t> bytes(const char* file){std::ifstream in(file,std::ios::binary);if(!in)throw std::runtime_error(file);return {(std::istreambuf_iterator<char>(in)),{}};}

struct Profile {
 struct Call {bool active=false;unsigned caller=0,entry=0;std::uint64_t start=0;};
 struct Finished {unsigned caller,entry;std::uint64_t cycles;};
 Call calls[256];std::vector<Finished> finished;bool nmi=false;unsigned vector=0;std::uint64_t start=0,dot=0,skippedDots=0,startSkippedDots=0;std::size_t startRow=0;
 void step(const nesle::cuda::BatchConsoleStepResult& step,const nesle::cpu::CpuState& state,std::uint64_t before,unsigned sp,std::uint64_t ppu,std::size_t row,const std::string& branch){
  if(step.nmi_serviced){nmi=true;start=before;dot=ppu;startSkippedDots=skippedDots;startRow=row;finished.clear();for(auto& call:calls)call.active=false;}
  if(!nmi)return;
  if(step.cpu.opcode==0x20)calls[sp]={true,step.cpu.pc,state.pc,before};
  if(step.cpu.opcode==0x60){auto& call=calls[state.sp];if(call.active){finished.push_back({call.caller,call.entry,state.cycles-call.start});call.active=false;}}
  if(step.cpu.opcode==0x40){
   std::cout<<"{\"kind\":\"nmi\",\"branch\":\""<<branch<<"\",\"startRow\":"<<startRow<<",\"endRow\":"<<row<<",\"startCycles\":"<<start<<",\"endCycles\":"<<state.cycles<<",\"cycles\":"<<state.cycles-start<<",\"shortFrameDots\":"<<skippedDots-startSkippedDots<<",\"startPpuAbsolute\":"<<dot<<",\"endPpuAbsolute\":"<<ppu+step.ppu_cycles<<",\"entryPc\":"<<vector<<",\"rtiPc\":"<<step.cpu.pc<<",\"rootCalls\":[";
   bool first=true;for(const auto& call:finished)if(call.caller>=vector&&call.caller<=step.cpu.pc){if(!first)std::cout<<',';first=false;std::cout<<"{\"caller\":"<<call.caller<<",\"entry\":"<<call.entry<<",\"cycles\":"<<call.cycles<<'}';}std::cout<<"],\"majorCalls\":[";first=true;for(const auto& call:finished)if(call.cycles>=300&&!(call.caller>=vector&&call.caller<=step.cpu.pc)){if(!first)std::cout<<',';first=false;std::cout<<"{\"caller\":"<<call.caller<<",\"entry\":"<<call.entry<<",\"cycles\":"<<call.cycles<<'}';}std::cout<<"]}\n";nmi=false;
  }
 }
};
// Exact copy of rlm::step_until's instruction/settlement/idle algorithm, with a read-only profile callback.
std::uint32_t profiledFrame(rle::HostMachine& machine,std::uint8_t pad,Profile& profile,std::size_t row,const std::string& branch){
 using namespace nesle::cuda;auto& buffers=machine.b;buffers.action_masks[0]=pad;
 auto state=load_cpu_state(buffers,0);auto hot=load_ppu_hot_state(buffers,0);std::uint32_t pending=0,fault=0;
 std::uint32_t to_event=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(buffers,0,hot);bool done=false;std::uint64_t instructions=0;
 const auto absolute=[&](){return hot.frame*rlm::kFrameDots+hot.frame_dot;};
 const auto settle=[&](){const auto before=absolute();batch_ppu_step_env_hot<kBankModeNrom>(buffers,0,pending,hot);profile.skippedDots+=absolute()-before-pending;};
 while(instructions<rlm::kBudget&&!done){
  if(pending>=to_event){settle();pending=0;to_event=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(buffers,0,hot);if(hot.frame*rlm::kFrameDots+hot.frame_dot>=machine.target)break;}
  const auto before=state.cycles;const auto sp=state.sp;const auto ppu=hot.frame*rlm::kFrameDots+hot.frame_dot+pending;
  const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(buffers,0,state,hot,pending);
  profile.step(step,state,before,sp,ppu,row,branch);
  if(step.cpu.illegal){fault=(static_cast<std::uint32_t>(step.cpu.pc)<<8)|step.cpu.opcode;break;}
  pending+=step.ppu_cycles;++instructions;
  if(step.cpu.opcode==0x4c&&state.pc==step.cpu.pc){settle();pending=0;if(hot.frame*rlm::kFrameDots+hot.frame_dot>=machine.target)break;const auto idleBefore=absolute();const auto idle=fast_forward_batch_console_idle_loop_hot<kBankModeNrom>(buffers,0,state,hot);profile.skippedDots+=absolute()-idleBefore-idle.ppu_cycles;to_event=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(buffers,0,hot);done=hot.frame*rlm::kFrameDots+hot.frame_dot>=machine.target;}
 }
 if(pending)settle();
 store_cpu_state(buffers,0,state);store_ppu_hot_state(buffers,0,hot);machine.target+=rlm::kFrameDots;return fault;
}
void sample(rle::HostMachine& m,std::size_t row,const std::string& branch){auto& b=m.b;auto* r=b.cpu.ram;
 std::cout<<"{\"kind\":\"sample\",\"branch\":\""<<branch<<"\",\"row\":"<<row<<",\"counter\":"<<+r[9]<<",\"parser\":"<<+r[0x71f]<<",\"pc\":"<<b.cpu.pc[0]<<",\"cycles\":"<<b.cpu.cycles[0]<<",\"ppuFrame\":"<<b.ppu.frame[0]<<",\"ppuDot\":"<<b.ppu.frame_dot[0]<<",\"sp\":"<<+b.cpu.sp[0]<<",\"a\":"<<+b.cpu.a[0]<<",\"x\":"<<+b.cpu.x[0]<<",\"y\":"<<+b.cpu.y[0]<<",\"cpuNmi\":"<<+b.cpu.nmi_pending[0]<<",\"ppuNmi\":"<<+b.ppu.nmi_pending[0]<<",\"buffer1\":"<<+r[0x300]<<",\"buffer2\":"<<+r[0x340]<<",\"vramControl\":"<<+r[0x773]<<",\"engine\":"<<+r[14]<<",\"pause\":"<<+r[0x776]<<"}\n";
}
int main(int argc,char** argv){try{
 if(argc<6||argc>7){std::cerr<<"usage: native-poweron-timing ROM PADS EXPECTED_RAM FROM TO [BRANCH_START]\n";return 2;}
 const auto rom=bytes(argv[1]),pads=bytes(argv[2]);std::ifstream expected(argv[3],std::ios::binary);if(!expected)return 3;
 const auto from=std::stoull(argv[4]),to=std::stoull(argv[5]),branchStart=argc==7?std::stoull(argv[6]):to+1;
 if(from>to||to>=pads.size()||(argc==7&&branchStart>to))throw std::runtime_error("Invalid observation window");
 rle::HostMachine machine(rom);if(machine.mode!=0)throw std::runtime_error("Profiler requires the SMB NROM image");Profile profile;profile.vector=rom[16+0x7ffa]+rom[16+0x7ffb]*256;std::vector<std::vector<std::uint8_t>> saved;std::uint64_t savedTarget=0;std::uint8_t reference[2048];
 for(std::size_t f=0;f<=to&&f<pads.size();++f){
  if(f==branchStart){saved=machine.arrays;savedTarget=machine.target;}
  if(f>=from?profiledFrame(machine,pads[f],profile,f,"baseline"):machine.frame(pads[f]))throw std::runtime_error("native CPU fault");
  expected.read(reinterpret_cast<char*>(reference),2048);if(!expected||std::memcmp(reference,machine.b.cpu.ram,2048))throw std::runtime_error("RAM mismatch row"+std::to_string(f));
  if(f>=from)sample(machine,f,"baseline");
 }
 if(!saved.empty())for(const auto& branch:std::vector<std::string>{"repeat","empty-buffer1","no-running-enemies","no-sprite0-wait","counter-plus-one","empty-sound-queues"}){
  for(std::size_t i=0;i<saved.size();++i)std::memcpy(machine.arrays[i].data(),saved[i].data(),saved[i].size());machine.target=savedTarget;profile=Profile{};profile.vector=rom[16+0x7ffa]+rom[16+0x7ffb]*256;auto* r=machine.b.cpu.ram;
  if(branch=="empty-buffer1")r[0x300]=r[0x301]=0;
  if(branch=="no-running-enemies")for(int slot=0;slot<5;++slot)if(r[15+slot])r[22+slot]=35; // source NoRunCode keeps the occupied flag
  if(branch=="no-sprite0-wait")r[0x722]=0;
  if(branch=="counter-plus-one")++r[9];
  if(branch=="empty-sound-queues")for(unsigned a=0xfa;a<=0xff;++a)r[a]=0;
  for(std::size_t f=branchStart;f<=to&&f<pads.size();++f){if(profiledFrame(machine,pads[f],profile,f,branch))throw std::runtime_error("native branch CPU fault");sample(machine,f,branch);}
 }
 return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
