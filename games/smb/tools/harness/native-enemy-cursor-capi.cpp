// Observer shim for authenticated full-emulator saved entrances. No RAM patching.
// Build with -shared -fPIC -fopenmp plus the same lab/NeSLE paths as the standalone observer.
#include "rlenv_cpu.cpp"
#include "native-enemy-cursor-observer.hpp"
#include <memory>
namespace {std::unique_ptr<NativeEnemyCursorObserver> cursorObserver;void* observedEnv=nullptr;}
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){std::memcpy(out,static_cast<Env*>(h)->e.games[0].b.cpu.ram,2048);return 0;}
int ghostrun_cursor_open(void* h,const char* file){try{auto& b=static_cast<Env*>(h)->e.games[0].b;std::vector<std::uint8_t> prg(b.cart.prg_rom,b.cart.prg_rom+b.cart.prg_rom_size);cursorObserver=std::make_unique<NativeEnemyCursorObserver>(b,prg,file);observedEnv=h;return 0;}catch(const std::exception& e){g_error=e.what();return -1;}}
int ghostrun_cursor_frame(void* h,unsigned char pad){try{if(h!=observedEnv||!cursorObserver)throw std::runtime_error("Observer not open");auto& e=static_cast<Env*>(h)->e;cursorObserver->step(pad,e.common.target[0]);e.common.target[0]+=rlm::kFrameDots;e.common.ep_frame[0]++;return 0;}catch(const std::exception& e){g_error=e.what();return -1;}}
int ghostrun_cursor_stats(void* h,unsigned long long* out){if(h!=observedEnv||!cursorObserver)return -1;out[0]=cursorObserver->frame;out[1]=cursorObserver->calls;out[2]=cursorObserver->initialized;return 0;}
int ghostrun_cursor_close(){cursorObserver.reset();observedEnv=nullptr;return 0;}
}
