// Build with the lab's rlenv build flags/include paths and nesle rom.cpp.
// Read/write probes only; the emulated ROM and CPU handlers remain unchanged.
#include "rlenv_cpu.cpp"
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){auto& b=static_cast<Env*>(h)->e.games[0].b;std::memcpy(out,b.cpu.ram,2048);return 0;}
int ghostrun_probe_write(void* h,unsigned int addr,unsigned char value){if(addr>=2048)return 1;static_cast<Env*>(h)->e.games[0].b.cpu.ram[addr]=value;return 0;}
int ghostrun_frame(void* h,unsigned char pad){auto& e=static_cast<Env*>(h)->e;return (int)(rle::emu_frame<nesle::cuda::kBankModeRuntime>(e.games[0],e.common,0,0,pad,false),e.common.fault[0]);}
}
