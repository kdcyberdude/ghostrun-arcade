// Build using the native-timing-observer.cpp command, substituting this source file.
// Controlled test-only RAM setup for native engine branch fixtures; never loaded by the remake.
#include "native-timing-observer.cpp"
extern "C" int ghostrun_probe_write(void* h,unsigned address,unsigned char value){
 if(address>=2048)return 1;
 static_cast<Env*>(h)->e.games[0].b.cpu.ram[address]=value;return 0;
}
