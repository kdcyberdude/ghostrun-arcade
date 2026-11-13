// Read-only native ID51 OffscreenBoundsCheck calls; same instruction settlement as HostMachine::frame.
#pragma once
#include "rlenv_build.hpp"
#include <fstream>
#include <optional>
using namespace nesle::cuda;
class NativeCannonObserver {
 struct Call {int slot,sp,ret,x,sub,camera,flag,state,master;std::uint64_t cycles;std::size_t frame;};
 BatchBuffers& b;std::ofstream out;int bounds;std::optional<Call> active;
public:
 std::size_t frame=0,calls=0,initialized=0;
 NativeCannonObserver(BatchBuffers& buffers,const std::vector<std::uint8_t>& prg,const char* file):b(buffers),out(file){
  if(!out)throw std::runtime_error("Observer output unavailable");bounds=-1;
  const std::vector<std::uint8_t> signature={0xb5,0x16,0xc9,0x14,0xf0};
  for(std::size_t i=0;i+signature.size()<=prg.size();i++)if(std::equal(signature.begin(),signature.end(),prg.begin()+i)){if(bounds>=0)throw std::runtime_error("Nonunique bounds signature");bounds=int(i)+0x8000;}
  if(bounds<0)throw std::runtime_error("Missing bounds signature");
 }
 template<class Cpu> void observe(const Cpu& cpu){
  const auto* r=b.cpu.ram;
  if(active&&cpu.pc==active->ret&&cpu.sp==((active->sp+2)&255)){
   const auto& a=*active;const int flag=r[15+a.slot];
   out<<"{\"frame\":"<<a.frame<<",\"endFrame\":"<<frame<<",\"pc\":"<<bounds<<",\"slot\":"<<a.slot<<",\"x\":"<<a.x<<",\"sub\":"<<a.sub<<",\"camera\":"<<a.camera<<",\"master\":"<<a.master<<",\"state\":"<<a.state<<",\"beforeFlag\":"<<a.flag<<",\"afterFlag\":"<<flag<<",\"afterX\":"<<r[0x6e + a.slot]*256+r[0x87 + a.slot]<<",\"cycles\":"<<cpu.cycles-a.cycles<<"}\n";
   calls++;initialized+=a.flag&&!flag;active.reset();
  }
  if(cpu.pc==bounds&&r[0x16 + cpu.x]==51){if(active)throw std::runtime_error("Nested bounds");const int s=cpu.x,sp=cpu.sp,ret=(r[0x100 + ((sp+1)&255)]+256*r[0x100 + ((sp+2)&255)]+1)&65535;active=Call{s,sp,ret,r[0x6e + s]*256+r[0x87 + s],r[0x401 + s],r[0x71a]*256+r[0x71c],r[15+s],r[0x1e + s],r[0x747],cpu.cycles,frame};}
 }
 void step(std::uint8_t pad,std::uint64_t target){
  b.action_masks[0]=pad;auto state=load_cpu_state(b,0);auto hot=load_ppu_hot_state(b,0);std::uint32_t pending=0,toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);bool done=false;
  for(std::uint64_t instructions=0;instructions<rlm::kBudget&&!done;instructions++){
   if(pending>=toEvent){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);if(hot.frame*rlm::kFrameDots+hot.frame_dot>=target)break;}
   observe(state);const auto step=step_batch_console_instruction_lazy<kBankModeNrom>(b,0,state,hot,pending);if(step.cpu.illegal)throw std::runtime_error("Illegal instruction");pending+=step.ppu_cycles;
   if(step.cpu.opcode==0x4c&&state.pc==step.cpu.pc){batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);pending=0;if(hot.frame*rlm::kFrameDots+hot.frame_dot>=target)break;(void)fast_forward_batch_console_idle_loop_hot<kBankModeNrom>(b,0,state,hot);toEvent=batch_ppu_cycles_until_next_event_hot<kBankModeNrom>(b,0,hot);done=hot.frame*rlm::kFrameDots+hot.frame_dot>=target;}
  }
  if(pending)batch_ppu_step_env_hot<kBankModeNrom>(b,0,pending,hot);store_cpu_state(b,0,state);store_ppu_hot_state(b,0,hot);frame++;
 }
};
