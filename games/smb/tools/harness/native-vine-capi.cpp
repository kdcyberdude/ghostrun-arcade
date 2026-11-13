// Build with the lab's rlenv build flags/include paths and nesle rom.cpp.
// Controlled RAM/register probes; the emulated ROM and CPU instructions remain unchanged.
#include "rlenv_cpu.cpp"
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){auto& b=static_cast<Env*>(h)->e.games[0].b;std::memcpy(out,b.cpu.ram,2048);return 0;}
int ghostrun_probe_write(void* h,unsigned int addr,unsigned char value){if(addr>=2048)return 1;static_cast<Env*>(h)->e.games[0].b.cpu.ram[addr]=value;return 0;}
int ghostrun_frame(void* h,unsigned char pad){auto& e=static_cast<Env*>(h)->e;return (int)(rle::emu_frame<nesle::cuda::kBankModeRuntime>(e.games[0],e.common,0,0,pad,false),e.common.fault[0]);}
// Execute a real source routine with controlled registers and a synthetic JSR return.
// No NMI/PPU time advances during this isolated procedure proof.
int ghostrun_vine_procedure(void* h,unsigned char slot,unsigned char blockIndex,unsigned char procedure){
 using namespace nesle::cuda;auto& b=static_cast<Env*>(h)->e.games[0].b;
 const auto find=[&](std::initializer_list<unsigned char> bytes){int found=-1;for(std::size_t i=0;i+bytes.size()<=b.cart.prg_rom_size;i++)if(std::equal(bytes.begin(),bytes.end(),b.cart.prg_rom+i)){if(found>=0)return -1;found=int(i)+0x8000;}return found;};
 const int pc=procedure==0?find({0xa9,0x2f,0x95,0x16,0xa9,0x01,0x95,0x0f,0xb9,0x76,0x00}):procedure==1?find({0xa9,0x00,0x95,0x1e,0x20}):procedure==2?find({0xa9,0x00,0x95,0x0f,0x95,0x16,0x95,0x1e}):procedure==3?find({0xa9,0x01,0x85,0x23,0x85,0x14,0xa9,0x03}):procedure==4?find({0xb5,0xcf,0x85,0x02,0xad,0xae,0x03,0x85,0x05}):find({0xad,0xd1,0x03,0x29,0x08})-3;if(pc<0)return 1;
 b.cpu.nmi_pending[0]=0;auto cpu=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);hot.nmi_pending=0;b.ppu.nmi_pending[0]=0;cpu.pc=pc;cpu.x=slot;cpu.y=blockIndex;
 const int sp=cpu.sp;b.cpu.ram[0x100+sp]=0x7f;b.cpu.ram[0x100+((sp-1)&255)]=0xff;cpu.sp=(sp-2)&255;
 for(int i=0;i<20000;i++){if(cpu.pc==0x8000&&cpu.sp==sp)return 0;auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,cpu,hot,0);if(step.cpu.illegal)return 2;}
 return 3;
}
}
