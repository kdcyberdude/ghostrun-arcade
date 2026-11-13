// Build with lab rlenv_cpu.cpp include paths, NeSLE rom.cpp and the lab's CPU flags.
#include "rlenv_cpu.cpp"
extern "C" {
int ghostrun_read_ram(void* h,unsigned char* out){std::memcpy(out,static_cast<Env*>(h)->e.games[0].b.cpu.ram,2048);return 0;}
int ghostrun_probe_write(void* h,unsigned int address,unsigned char value){if(address>=2048)return 1;static_cast<Env*>(h)->e.games[0].b.cpu.ram[address]=value;return 0;}
int ghostrun_player_enemy_collision(void* h,unsigned char slot){
 using namespace nesle::cuda;auto& b=static_cast<Env*>(h)->e.games[0].b;const std::initializer_list<unsigned char> signature={0xa5,0x09,0x4a,0xb0,0xf4,0x20,0x41,0xdc};int pc=-1;
 for(std::size_t i=0;i+signature.size()<=b.cart.prg_rom_size;i++)if(std::equal(signature.begin(),signature.end(),b.cart.prg_rom+i)){if(pc>=0)return 1;pc=int(i)+0x8000;}if(pc<0)return 2;
 b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto cpu=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);hot.nmi_pending=0;cpu.pc=pc;cpu.x=slot;
 const int sp=cpu.sp;b.cpu.ram[0x100+sp]=0x7f;b.cpu.ram[0x100+((sp-1)&255)]=0xff;cpu.sp=(sp-2)&255;
 for(int i=0;i<20000;i++){if(cpu.pc==0x8000&&cpu.sp==sp)return 0;auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,cpu,hot,0);if(step.cpu.illegal)return 3;}return 4;
}
int ghostrun_normal_enemy_box(void* h,unsigned char slot){
 using namespace nesle::cuda;auto& b=static_cast<Env*>(h)->e.games[0].b;const std::initializer_list<unsigned char> signature={0x20,0x53,0xd8,0xac,0x47,0x07};int pc=-1;
 for(std::size_t i=0;i+signature.size()<=b.cart.prg_rom_size;i++)if(std::equal(signature.begin(),signature.end(),b.cart.prg_rom+i)){if(pc>=0)return 1;pc=int(i)+0x8000-23;}if(pc<0)return 2;
 b.cpu.nmi_pending[0]=0;b.ppu.nmi_pending[0]=0;auto cpu=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);hot.nmi_pending=0;cpu.pc=pc;cpu.x=slot;const int sp=cpu.sp;
 // RunNormalEnemies through GetEnemyBoundBox, stopping before BG/contact/movement.
 for(int i=0;i<20000;i++){if(cpu.pc==pc+17&&cpu.sp==sp)return 0;auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,cpu,hot,0);if(step.cpu.illegal)return 3;}return 4;
}

}
