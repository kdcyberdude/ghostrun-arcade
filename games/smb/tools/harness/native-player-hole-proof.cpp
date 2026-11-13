// Controlled source procedure calls: PlayerHole's CMP/BMI/STX slice and
// complete UpdScrollVar. ROM instructions remain unchanged; this is not a
// natural frame capture or a gameplay state injection into the remake.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){
 if(argc!=4)return 2;std::ifstream rf(argv[1],std::ios::binary),in(argv[2],std::ios::binary);if(!rf||!in)return 3;
 const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(rf)),{});rle::HostMachine m(rom);auto& b=m.b;int hole=-1,parser=-1;
 for(std::size_t i=0;i+18<=b.cart.prg_rom_size;i++){const auto* p=b.cart.prg_rom+i;
  if(p[0]==0xa5&&p[1]==0xb5&&p[2]==0xc9&&p[3]==2&&p[4]==0x30&&p[6]==0xa2&&p[7]==1&&p[8]==0x8e&&p[9]==0x23&&p[10]==7){if(hole>=0)return 4;hole=0x8000+int(i);}
  if(p[0]==0xad&&p[1]==0x73&&p[2]==7&&p[3]==0xc9&&p[4]==6&&p[5]==0xf0&&p[7]==0xad&&p[8]==0x1f&&p[9]==7&&p[10]==0xd0&&p[12]==0xad&&p[13]==0x3d&&p[14]==7&&p[15]==0xc9&&p[16]==0x20&&p[17]==0x30){if(parser>=0)return 5;parser=0x8000+int(i);}
 }
 if(hole<0||parser<0)return 6;std::ofstream out(argv[3],std::ios::binary);unsigned char kind;
 while(in.read(reinterpret_cast<char*>(&kind),1)){
  in.read(reinterpret_cast<char*>(b.cpu.ram),2048);if(!in||kind>1)return 7;
  using namespace nesle::cuda;b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto cpu=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);hot.nmi_pending=0;cpu.pc=kind?parser:hole;
  const int sp=cpu.sp;b.cpu.ram[0x100+sp]=0x7f;b.cpu.ram[0x100+((sp-1)&255)]=0xff;cpu.sp=(sp-2)&255;bool done=false;
  for(int n=0;n<200000;n++){
   if((cpu.pc==0x8000&&cpu.sp==sp)||(!kind&&cpu.pc==hole+11)){done=true;break;}
   auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,cpu,hot,0);if(step.cpu.illegal)return 8;
  }
  if(!done)return 9;out.write(reinterpret_cast<char*>(b.cpu.ram),2048);
 }
 return out?0:10;
}
