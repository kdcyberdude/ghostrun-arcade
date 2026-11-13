// Controlled unmodified PlayerEnemyCollision calls; not natural full-frame proof.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char**argv){
 if(argc!=2)return 2;std::ifstream file(argv[1],std::ios::binary);const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(file)),{});rle::HostMachine m(rom);auto&b=m.b;
 const std::initializer_list<unsigned char> sig={0xa5,0x09,0x4a,0xb0,0xf4,0x20,0x41,0xdc};int entry=-1;
 for(std::size_t i=0;i+sig.size()<=b.cart.prg_rom_size;i++)if(std::equal(sig.begin(),sig.end(),b.cart.prg_rom+i)){if(entry>=0)return 3;entry=int(i)+0x8000;}if(entry<0)return 4;
 auto call=[&](){using namespace nesle::cuda;b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto c=load_cpu_state(b,0);auto h=load_ppu_hot_state(b,0);h.nmi_pending=0;c.pc=entry;c.x=0;c.sp=0xfb;b.cpu.ram[0x1fd]=0x7f;b.cpu.ram[0x1fc]=0xff;for(int i=0;i<20000;i++){if(c.pc==0x8000&&c.sp==0xfd)return;auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,c,h,0);if(step.cpu.illegal)throw 5;}throw 6;};
 std::cout<<"{\"pc\":"<<entry<<",\"rows\":[";bool comma=false;
 for(int id:{0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,20,21,51})for(int direction:{1,2})for(int speed:{0,8,248,16,240,127,128})for(int relCase=0;relCase<5;relCase++)for(int area:{0,1})for(int injury:{0,8})for(int playerSpeed:{0,255,1})for(int stomp:{0,1}){
  if(id!=18&&(playerSpeed==1||stomp))continue;
  std::fill_n(b.cpu.ram,2048,0);auto*r=b.cpu.ram;const int p[]={100,104,100,254,2},e[]={104,100,100,2,254};
  r[8]=0;r[9]=100;r[14]=8;r[15]=1;r[0x16]=id;r[0x1e]=0;r[0x46]=direction;r[0x58]=speed;r[0xb5]=1;r[0xce]=80;r[0x9f]=playerSpeed;r[0xcf]=80;r[0xb6]=1;r[0x74e]=area;r[0x79e]=injury;r[0x791]=stomp;r[0x3ad]=p[relCase];r[0x3ae]=e[relCase];
  for(int k=0;k<4;k++){const int box[]={100,100,110,112};r[0x4ac+k]=box[k];r[0x4b0+k]=box[k];}call();
  if(comma)std::cout<<',';comma=true;std::cout<<'['<<id<<','<<direction<<','<<speed<<','<<p[relCase]<<','<<e[relCase]<<','<<area<<','<<injury<<','<<playerSpeed<<','<<int(r[0x46])<<','<<int(r[0x58])<<','<<int(r[14])<<','<<int(r[0x747])<<','<<stomp<<']';
 }
 std::cout<<"]}\n";
}
