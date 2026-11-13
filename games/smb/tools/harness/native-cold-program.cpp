// Source-readable cold-start instruction/table closure and native PPU samples.
// Local ROM required. No raw ROM image or instruction bytes are emitted.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
#include <map>
#include <string>
using namespace nesle::cuda;
const char* opNames[]={"Illegal","LDA","LDX","LDY","STA","STX","STY","TAX","TAY","TXA","TYA","TSX","TXS","PHA","PHP","PLA","PLP","ORA","AND","EOR","ADC","SBC","CMP","CPX","CPY","BIT","INC","DEC","INX","INY","DEX","DEY","ASL","LSR","ROL","ROR","JMP","JSR","RTS","RTI","BRK","Branch","CLC","SEC","CLI","SEI","CLV","CLD","SED","NOP"};
const char* modes[]={"imp","acc","imm","zp","zpx","zpy","abs","absx","absy","indx","indy","ind","rel"};
struct Node {std::string op,mode;int operand,size,cycles,penalty;};
struct ColdProgram {
 const std::vector<std::uint8_t>& rom;bool returned=false;std::uint64_t nmiStart=0,nmiCycles=0;std::map<int,Node> nodes;std::map<int,int> data;
 unsigned byte(int address)const{return rom[16+((address-0x8000)&0x7fff)];}
 void collect(int pc,const nesle::cpu::CpuState& before,const unsigned char* ram){
  const auto opcode=byte(pc);const auto d=nesle::cpu::detail::decode(opcode);const int mode=int(d.mode),size=mode<2?1:mode==6||mode==7||mode==8||mode==11?3:2;int operand=size==1?0:byte(pc+1);if(size==3)operand|=byte(pc+2)<<8;
  std::string name=opNames[int(d.op)];if(name=="Branch"){const char* branches[]={"BPL","BMI","BVC","BVS","BCC","BCS","BNE","BEQ"};name=branches[(opcode>>5)&7];operand=(pc+2+static_cast<std::int8_t>(operand))&65535;}
  nodes.emplace(pc,Node{name,modes[mode],operand,size,int(d.base_cycles),int(d.flags&1)});
  int address=-1;switch(mode){case 3:address=operand;break;case 4:address=(operand+before.x)&255;break;case 5:address=(operand+before.y)&255;break;case 6:address=operand;break;case 7:address=(operand+before.x)&65535;break;case 8:address=(operand+before.y)&65535;break;case 9:{const int p=(operand+before.x)&255;address=ram[p]|ram[(p+1)&255]<<8;break;}case 10:address=((ram[operand]|ram[(operand+1)&255]<<8)+before.y)&65535;break;}
  if(address>=0x8000&&name!="JMP"&&name!="JSR"&&!(d.flags&4))data[address]=byte(address);
 }
};
void dumpRam(const unsigned char* r){const char* h="0123456789abcdef";std::cout<<'"';for(int i=0;i<2048;i++)std::cout<<h[r[i]>>4]<<h[r[i]&15];std::cout<<'"';}
void sample(rle::HostMachine& m,int row,const ColdProgram& program){const auto c=load_cpu_state(m.b,0);const auto h=load_ppu_hot_state(m.b,0);std::cout<<"{\"frame\":"<<row<<",\"pc\":"<<c.pc<<",\"cycles\":"<<c.cycles<<",\"a\":"<<+c.a<<",\"x\":"<<+c.x<<",\"y\":"<<+c.y<<",\"p\":"<<+c.p<<",\"sp\":"<<+c.sp<<",\"ppuFrame\":"<<h.frame<<",\"ppuDot\":"<<h.frame_dot<<",\"ctrl\":"<<+h.ctrl<<",\"mask\":"<<+h.mask<<",\"status\":"<<+h.status<<",\"nmi\":"<<+h.nmi_pending<<",\"openBus\":"<<+m.b.ppu.open_bus[0]<<",\"done\":"<<(program.returned?"true":"false")<<",\"nmiCycles\":"<<(program.returned?std::to_string(program.nmiCycles):"null")<<",\"ram\":";dumpRam(m.b.cpu.ram);std::cout<<'}';}
void frame(rle::HostMachine& m,unsigned char pad,ColdProgram& program){
 auto& b=m.b;b.action_masks[0]=pad;auto state=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);std::uint32_t pending=0,toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);bool done=false;
 for(std::uint64_t count=0;count<rlm::kBudget&&!done;count++){
  if(pending>=toEvent){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;}
  const auto before=state;unsigned char priorRam[2048];std::memcpy(priorRam,b.cpu.ram,2048);const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,state,hot,pending);if(step.cpu.illegal)throw std::runtime_error("Native CPU fault");program.collect(step.cpu.pc,before,priorRam);if(step.nmi_serviced)program.nmiStart=before.cycles;if(step.cpu.opcode==0x40){program.returned=true;program.nmiCycles=state.cycles-program.nmiStart;}pending+=step.ppu_cycles;
  if(step.cpu.opcode==0x4c&&state.pc==step.cpu.pc){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;if(hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target)break;(void)fast_forward_batch_console_idle_loop_hot<kBankModeNrom>(b,0,state,hot);toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);done=hot.frame*rlm::kFrameDots+hot.frame_dot>=m.target;}
 }
 if(pending)batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);store_cpu_state(b,0,state);store_ppu_hot_state(b,0,hot);m.target+=rlm::kFrameDots;
}
int main(int argc,char** argv){try{
 if(argc!=2)return 2;std::ifstream f(argv[1],std::ios::binary);const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(f)),{});ColdProgram program{rom};std::cout<<"{\"samples\":[";
 for(unsigned pad=0;pad<256;pad++){if(pad)std::cout<<',';program.returned=false;program.nmiCycles=0;rle::HostMachine m(rom);if(m.mode!=0)throw std::runtime_error("NROM required");std::cout<<"{\"pad\":"<<pad<<",\"rows\":[";for(int row=0;row<7;row++){if(row)std::cout<<',';frame(m,pad,program);sample(m,row,program);}std::cout<<"]}";}
 std::cout<<"],\"reset\":"<<program.byte(0xfffc)+program.byte(0xfffd)*256<<",\"nmi\":"<<program.byte(0xfffa)+program.byte(0xfffb)*256<<",\"instructions\":[";bool comma=false;for(const auto& [pc,n]:program.nodes){if(comma)std::cout<<',';comma=true;std::cout<<'['<<pc<<",\""<<n.op<<"\",\""<<n.mode<<"\","<<n.operand<<','<<n.size<<','<<n.cycles<<','<<n.penalty<<']';}std::cout<<"],\"data\":[";comma=false;for(const auto& [address,value]:program.data){if(comma)std::cout<<',';comma=true;std::cout<<'['<<address<<','<<value<<']';}std::cout<<"]}\n";return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
