// Isolated original-ROM CPU procedures. No PPU/NMI advances or ROM writes.
// Build: c++ -std=c++20 -O2 -shared -fPIC -I NESLE/cpp/include THIS -o LIB
#include <array>
#include <algorithm>
#include <cstdint>
#include <cstring>
#include "nesle/cpu.hpp"
struct DigitBus {
 std::array<std::uint8_t,65536> mem{};std::uint16_t pc=0;unsigned count=0;unsigned* trace;
 std::uint8_t read(std::uint16_t a){return mem[a<0x2000?a&0x7ff:a];}
 void write(std::uint16_t a,std::uint8_t v){if(a>=0x8000)return;auto address=a<0x2000?a&0x7ff:a;mem[address]=v;if(address==0x137&&count<256){trace[count++]=(unsigned(pc)<<8)|v;}}
};
extern "C" int native_digit_procedure(const unsigned char* prg,const unsigned char* initial,unsigned pc,unsigned x,unsigned y,unsigned char* after,unsigned* trace,unsigned* result){
 DigitBus b;b.trace=trace;std::memcpy(b.mem.data(),initial,2048);std::memcpy(b.mem.data()+0x8000,prg,32768);
 nesle::cpu::CpuState s;s.pc=pc;s.x=x;s.y=y;s.sp=0xfd;b.mem[0x1fe]=0xfe;b.mem[0x1ff]=0x7f;unsigned minimum=s.sp;
 for(unsigned n=0;n<20000;n++){
  if(s.pc==0x7fff&&s.sp==0xff){std::memcpy(after,b.mem.data(),2048);result[0]=n;result[1]=b.count;result[2]=minimum;result[3]=s.x;result[4]=s.y;return 0;}
  b.pc=s.pc;auto step=nesle::cpu::step(s,b);minimum=std::min(minimum,unsigned(s.sp));if(step.illegal)return 1;
 }
 return 2;
}
