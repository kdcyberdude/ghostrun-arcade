// Read-only extension of ghostrun-lab's native_ram_trace.cpp observer. Build against that lab's rl/csrc and NeSLE include paths:
// c++ -O2 -std=c++20 -fopenmp -ffp-contract=off -shared -fPIC -I LAB/rl/csrc -I LAB/.cache/nesle-src/cpp/include \
//   tools/harness/native-timing-observer.cpp LAB/.cache/nesle-src/cpp/src/rom.cpp -o /tmp/native-timing-observer.so
// ghostrun_timing copies CPU pc/cycles, PPU frame/dot, CPU sp/a/x/y, CPU NMI pending, PPU NMI pending (10 uint64 values).
// The existing ghostrun_frame/read_ram hooks preserve the recorder's exact CPU, PPU, input and timing behavior.
#include "rlenv_cpu.cpp"
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){auto& b=static_cast<Env*>(h)->e.games[0].b;std::memcpy(out,b.cpu.ram,2048);return 0;}
int ghostrun_frame(void* h,unsigned char pad){auto& e=static_cast<Env*>(h)->e;return (int)(rle::emu_frame<nesle::cuda::kBankModeRuntime>(e.games[0],e.common,0,0,pad,false),e.common.fault[0]);}
int ghostrun_timing(void* h,unsigned long long* out){auto& b=static_cast<Env*>(h)->e.games[0].b;
out[0]=b.cpu.pc[0];out[1]=b.cpu.cycles[0];out[2]=b.ppu.frame[0];out[3]=b.ppu.frame_dot[0];out[4]=b.cpu.sp[0];out[5]=b.cpu.a[0];out[6]=b.cpu.x[0];out[7]=b.cpu.y[0];out[8]=b.cpu.nmi_pending[0];out[9]=b.ppu.nmi_pending[0];return 0;}
}
