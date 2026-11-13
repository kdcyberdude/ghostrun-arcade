// Local ROM only; observe genuine and controlled source InitializeMemory calls.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
using namespace nesle::cuda;
void hexRam(const unsigned char* ram){const char* h="0123456789abcdef";std::cout<<'"';for(int i=0;i<2048;i++)std::cout<<h[ram[i]>>4]<<h[ram[i]&15];std::cout<<'"';}
template<class Cpu> void cpu(const Cpu& c){std::cout<<"{\"pc\":"<<c.pc<<",\"a\":"<<+c.a<<",\"x\":"<<+c.x<<",\"y\":"<<+c.y<<",\"p\":"<<+c.p<<",\"sp\":"<<+c.sp<<"}";}
int main(int argc,char** argv){try{
 if(argc!=2)return 2;std::ifstream f(argv[1],std::ios::binary);const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(f)),{});rle::HostMachine m(rom);if(m.mode!=0)throw std::runtime_error("NROM required");
 const auto step=[&](){const auto r=step_batch_console_instruction<kBankModeNrom>(m.b,0);if(r.cpu.illegal)throw std::runtime_error("Native CPU fault");};
 bool comma=false;const auto emit=[&](const char* kind,int pattern){const auto initial=load_cpu_state(m.b,0);if(comma)std::cout<<',';comma=true;std::cout<<"{\"kind\":\""<<kind<<"\",\"pattern\":"<<pattern<<",\"before\":";cpu(initial);std::cout<<",\"ramBefore\":";hexRam(m.b.cpu.ram);std::cout<<",\"trace\":[";bool more=false;
  for(unsigned count=0;;count++){if(count>30000)throw std::runtime_error("Initializer did not return");const auto before=load_cpu_state(m.b,0);const auto* r=m.b.cpu.ram;const int address=before.pc==0x90d0?6:before.pc==0x90d2?7:before.pc==0x90dc?(((r[7]<<8)|r[6])+before.y)&2047:-1;step();const auto after=load_cpu_state(m.b,0);if(more)std::cout<<',';more=true;std::cout<<'['<<before.pc<<','<<after.pc<<','<<after.cycles-before.cycles<<','<<+after.a<<','<<+after.x<<','<<+after.y<<','<<+after.p<<','<<+after.sp<<','<<address<<','<<(address<0?-1:int(m.b.cpu.ram[address]))<<']';if(before.pc==0x90e6)break;}
  const auto final=load_cpu_state(m.b,0);std::cout<<"],\"cycles\":"<<final.cycles-initial.cycles<<",\"after\":";cpu(final);std::cout<<",\"ramAfter\":";hexRam(m.b.cpu.ram);std::cout<<'}';
 };
 std::vector<std::vector<std::uint8_t>> cold;std::cout<<"{\"cases\":[";
 for(unsigned call=0;call<3;call++){unsigned count=0;while(m.b.cpu.pc[0]!=0x90cc){step();if(++count>1000000)throw std::runtime_error("No InitializeMemory entry");}if(call==0)cold=m.arrays;emit("genuine",int(call));}
 for(unsigned y:{0u,1u,0x4bu,0x6fu,0xd6u,0xfeu,0xffu})for(unsigned pattern=0;pattern<3;pattern++){
  for(std::size_t i=0;i<cold.size();i++)std::memcpy(m.arrays[i].data(),cold[i].data(),cold[i].size());auto* r=m.b.cpu.ram;for(int i=0;i<2048;i++)r[i]=pattern==0?255:pattern==1?0:(i*37+11)&255;auto state=load_cpu_state(m.b,0);state.y=y;state.p=0x65;store_cpu_state(m.b,0,state);emit("controlled",int(pattern));
 }
 std::cout<<"]}\n";return 0;
}catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}}
