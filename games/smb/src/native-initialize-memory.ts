/** Source InitializeMemory ($90CC..$90E6), one resumable CPU instruction.
 * The caller owns JSR/interrupt entry. RTS reads the protected native stack.
 * No frame duration, replay sample or fitted routine total is used. */
export type NativeMemoryInitCpu={ram:Uint8Array;pc:number;a:number;x:number;y:number;p:number;sp:number;cycles:number};
export function stepNativeInitializeMemory(s:NativeMemoryInitCpu){
 const pc=s.pc;let cycles=0,write:readonly[number,number]|undefined,done=false;
 const nz=(n:number)=>{s.p=(s.p&~0x82)|(n===0?2:0)|(n&128);};
 const cmp=(n:number,value:number)=>{nz((n-value)&255);s.p=(s.p&~1)|Number(n>=value);};
 const store=(address:number,value:number)=>{s.ram[address&2047]=value;write=[address&2047,value];};
 const next=(bytes:number,cost:number)=>{s.pc=(pc+bytes)&65535;cycles=cost;};
 const branch=(take:boolean,target:number)=>{s.pc=take?target:pc+2;cycles=take?3+Number(((pc+2)&0xff00)!==(target&0xff00)):2;};
 switch(pc){
  case 0x90cc:s.x=7;nz(s.x);next(2,2);break;
  case 0x90ce:s.a=0;nz(s.a);next(2,2);break;
  case 0x90d0:store(6,s.a);next(2,3);break;
  case 0x90d2:store(7,s.x);next(2,3);break;
  case 0x90d4:cmp(s.x,1);next(2,2);break;
  case 0x90d6:branch(!(s.p&2),0x90dc);break;
  case 0x90d8:cmp(s.y,0x60);next(2,2);break;
  case 0x90da:branch(Boolean(s.p&1),0x90de);break;
  case 0x90dc:store(((s.ram[7]<<8)|s.ram[6])+s.y,s.a);next(2,6);break;
  case 0x90de:s.y=(s.y-1)&255;nz(s.y);next(1,2);break;
  case 0x90df:cmp(s.y,255);next(2,2);break;
  case 0x90e1:branch(!(s.p&2),0x90d4);break;
  case 0x90e3:s.x=(s.x-1)&255;nz(s.x);next(1,2);break;
  case 0x90e4:branch(!(s.p&128),0x90d2);break;
  case 0x90e6:{s.sp=(s.sp+1)&255;const low=s.ram[0x100+s.sp];s.sp=(s.sp+1)&255;s.pc=((s.ram[0x100+s.sp]<<8)+low+1)&65535;cycles=6;done=true;break;}
  default:throw Error(`Outside InitializeMemory: ${pc.toString(16)}`);
 }
 s.cycles+=cycles;return {pc,cycles,write,done};
}
