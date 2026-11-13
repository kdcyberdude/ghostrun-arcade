// Execute the unmodified PRG0 HandleEToBGCollision procedure, including the
// Goomba's two SetStun calls. Controlled RAM/register inputs are procedure
// tests, NOT natural full-frame captures. NMI is disabled only for this call.
// Build with lab rl/csrc + NeSLE headers and NeSLE rom.cpp.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){
 if(argc!=4){std::cerr<<"usage: block-enemy-proof ROM INPUT OUTPUT\n";return 2;}
 std::ifstream romFile(argv[1],std::ios::binary),input(argv[2],std::ios::binary);if(!romFile||!input)return 3;
 const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(romFile)),{});rle::HostMachine machine(rom);auto& b=machine.b;
 const std::initializer_list<unsigned char> signature={0xa4,0x02,0xa9,0x00,0x91,0x06,0xb5,0x16,0xc9,0x15};int entry=-1;
 for(std::size_t i=9;i+signature.size()<=b.cart.prg_rom_size;i++)if(std::equal(signature.begin(),signature.end(),b.cart.prg_rom+i)){
  if(entry>=0||b.cart.prg_rom[i-9]!=0x20||b.cart.prg_rom[i-6]!=0xf0||b.cart.prg_rom[i-4]!=0xc9||b.cart.prg_rom[i-3]!=0x23||b.cart.prg_rom[i-2]!=0xd0)return 4;entry=int(i)+0x8000-9;
 }
 if(entry<0)return 5;std::ofstream output(argv[3],std::ios::binary);unsigned char slot;
 while(input.read(reinterpret_cast<char*>(&slot),1)){
  input.read(reinterpret_cast<char*>(b.cpu.ram),2048);if(!input||slot>=5)return 6;
  using namespace nesle::cuda;b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto cpu=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);hot.nmi_pending=0;cpu.pc=entry;cpu.x=slot;cpu.a=0x23;
  const int sp=cpu.sp;b.cpu.ram[0x100+sp]=0x7f;b.cpu.ram[0x100+((sp-1)&255)]=0xff;cpu.sp=(sp-2)&255;bool done=false;
  for(int i=0;i<20000;i++){
   if(cpu.pc==0x8000&&cpu.sp==sp){done=true;break;}
   auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,cpu,hot,0);if(step.cpu.illegal)return 7;
  }
  if(!done)return 8;output.write(reinterpret_cast<char*>(b.cpu.ram),2048);
 }
 return output?0:9;
}
