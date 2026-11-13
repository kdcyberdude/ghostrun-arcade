// Complete retained-entrance environment API plus read-only native PPU output.
#include "rlenv_cpu.cpp"
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){const auto& b=static_cast<Env*>(h)->e.games[0].b;std::memcpy(out,b.cpu.ram,2048);return 0;}
int ghostrun_frame(void* h,unsigned char pad){auto& e=static_cast<Env*>(h)->e;auto& g=e.games[0];rle::emu_frame<nesle::cuda::kBankModeRuntime>(g,e.common,0,0,pad,false);return e.common.fault[0];}
int ghostrun_read_pixels(void* h,unsigned char* pixels,unsigned char* emph){auto& b=static_cast<Env*>(h)->e.games[0].b;rlm::render_obs(b,0,pixels,emph);return 0;}
}
