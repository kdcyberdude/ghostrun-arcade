// Controlled unmodified PRG0 procedure calls, not full-frame replay proof.
#include "rlenv_build.hpp"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char**argv){
 if(argc!=2)return 2;std::ifstream file(argv[1],std::ios::binary);const std::vector<std::uint8_t> rom((std::istreambuf_iterator<char>(file)),{});rle::HostMachine m(rom);auto&b=m.b;
 auto find=[&](std::initializer_list<unsigned char> sig){int found=-1;for(std::size_t i=0;i+sig.size()<=b.cart.prg_rom_size;i++)if(std::equal(sig.begin(),sig.end(),b.cart.prg_rom+i)){if(found>=0)throw 3;found=int(i)+0x8000;}if(found<0)throw 4;return found;};
 const int impede=find({0xa9,0x00,0xa4,0x57,0xa6,0x00,0xca,0xd0}),jump=find({0xa9,0x20,0x8d,0x82,0x07,0xa0,0x00,0x8c,0x16,0x04,0x8c,0x33,0x04});
 auto call=[&](int entry,int stop){using namespace nesle::cuda;b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto c=load_cpu_state(b,0);auto h=load_ppu_hot_state(b,0);h.nmi_pending=0;c.pc=entry;c.sp=0xfd;b.cpu.ram[0x1fd]=0x7f;b.cpu.ram[0x1fc]=0xff;c.sp=0xfb;for(int i=0;i<1000;i++){if(c.pc==stop)return;const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,c,h,0);if(step.cpu.illegal)throw 5;}throw 6;};
 std::cout<<"{\"impedePC\":"<<impede<<",\"initJSPC\":"<<jump<<",\"impede\":[";bool comma=false;
 for(int side:{1,2})for(int speed=0;speed<256;speed++)for(int force:{0,128,255})for(int x:{0,255,256,65535}){
  std::fill_n(b.cpu.ram,2048,0);auto*r=b.cpu.ram;r[0]=side;r[0x57]=speed;r[0x705]=force;r[0x86]=x&255;r[0x6d]=x>>8;r[0x490]=255;call(impede,0x8000);
  if(comma)std::cout<<',';comma=true;std::cout<<'['<<side<<','<<speed<<','<<force<<','<<x<<','<<int(r[0x57])<<','<<int(r[0x705])<<','<<(256*int(r[0x6d])+r[0x86])<<','<<int(r[0x490])<<','<<int(r[0x785])<<']';
 }
 std::cout<<"],\"initJS\":[";comma=false;
 for(int fraction=0;fraction<256;fraction++)for(int force:{0,255}){
  std::fill_n(b.cpu.ram,2048,0);auto*r=b.cpu.ram;r[0x416]=fraction;r[0x433]=force;call(jump,jump+13);
  if(comma)std::cout<<',';comma=true;std::cout<<'['<<fraction<<','<<force<<','<<int(r[0x416])<<','<<int(r[0x433])<<','<<int(r[0x782])<<']';
 }
 std::cout<<"]}\n";
}
