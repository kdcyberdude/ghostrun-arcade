import source from '../data/native-cold-program.json';
import {stepNativeInitializeMemory,type NativeMemoryInitCpu} from './native-initialize-memory.js';
type Instruction=[number,string,string,number,number,number,number];
const instructions=new Map((source.instructions as Instruction[]).map(r=>[r[0],r]));
const tables=new Map(source.data as [number,number][]);
/** Bounded source CPU/PPU cold startup. Constructor owns coldFF RAM. This runs
 * source instructions through the first InitializeGame/NMI return, then finishes
 * the current PPU sample. Normal title execution belongs to the caller. */
export class NativeColdStartup {
 readonly ram=new Uint8Array(2048).fill(255);done=false;
 private cpu:NativeMemoryInitCpu={ram:this.ram,pc:source.reset,a:0,x:0,y:0,p:0x24,sp:0xfd,cycles:7};
 private target=241*341+1;private frame=0;private dot=0;private ctrl=0;private mask=0;private status=0;private openBus=0;private nmi=false;private pad=0;private strobe=0;private shift=0;private shiftCount=0;private dma=0;private nmiStart:number|undefined;private returned=false;
 nmiCycles:number|undefined;
 get cycles(){return this.cpu.cycles;}get pc(){return this.cpu.pc;}get sp(){return this.cpu.sp;}get ppuDot(){return this.frame*341*262+this.dot;}get nmiEligible(){return this.nmi;}
 snapshot(){const {ram,cycles,...registers}=this.cpu;return {...registers,cycles,ppuFrame:this.frame,ppuDot:this.dot,ctrl:this.ctrl,mask:this.mask,status:this.status,nmi:Number(this.nmi),openBus:this.openBus};}
 private nz(n:number){this.cpu.p=(this.cpu.p&~0x82)|(n===0?2:0)|(n&128);}
 private flag(bit:number,value:boolean){this.cpu.p=(this.cpu.p&~bit)|(value?bit:0);}
 private push(n:number){this.ram[0x100+this.cpu.sp]=n&255;this.cpu.sp=(this.cpu.sp-1)&255;}
 private pull(){this.cpu.sp=(this.cpu.sp+1)&255;return this.ram[0x100+this.cpu.sp];}
 private read(address:number):number{
  address&=65535;if(address<0x2000)return this.ram[address&2047];
  if(address<0x4000){if((address&7)!==2)throw Error(`Unsupported cold PPU read ${address.toString(16)}`);const value=(this.status&0xe0)|(this.openBus&31);this.status&=127;this.nmi=false;this.openBus=value;return value;}
  if(address===0x4016){if(this.strobe)return 64|(this.pad&1);const bit=this.shiftCount<8?this.shift&1:1;if(this.shiftCount<8){this.shift>>=1;this.shiftCount++;}return 64|bit;}
  if(address===0x4017)return 64;
  const value=tables.get(address);if(value===undefined)throw Error(`Unsupported cold source read ${address.toString(16)} at ${this.pc.toString(16)}`);return value;
 }
 private write(address:number,value:number){
  value&=255;address&=65535;if(address<0x2000){this.ram[address&2047]=value;return;}
  if(address<0x4000){const r=address&7;if(r===0){if((value&128)&&!(this.ctrl&128)&&(this.status&128))this.nmi=true;this.ctrl=value;}else if(r===1)this.mask=value;this.openBus=value;return;}
  if(address===0x4014){this.dma+=513;return;}
  if(address===0x4016){const next=value&1;if(next||this.strobe){this.shift=this.pad;this.shiftCount=0;}this.strobe=next;return;}
  if(address>=0x4000&&address<=0x4017)return;
  throw Error(`Unsupported cold write ${address.toString(16)}`);
 }
 private advancePpu(dots:number){
  while(dots>0){const end=341*262-Number(Boolean(this.frame&1)),events=[241*341+1-12,241*341+1,261*341+1-12,261*341+1,end],next=events.find(n=>n>this.dot)!,amount=Math.min(dots,next-this.dot);this.dot+=amount;dots-=amount;if(this.dot!==next)continue;
   if(next===241*341+1-12)this.status|=128;
   else if(next===241*341+1){if(this.ctrl&128)this.nmi=true;}
   else if(next===261*341+1-12||next===261*341+1)this.status&=31;
   else if(next===end){this.frame++;this.dot=0;}
  }
 }
 private instruction(){
  const s=this.cpu,start=s.cycles;
  // Native console service includes NMI7 and the first instruction atomically.
  if(this.nmi){this.nmi=false;this.nmiStart=s.cycles;this.push(s.pc>>8);this.push(s.pc);this.push((s.p&~16)|32);s.p|=4;s.pc=source.nmi;s.cycles+=7;}
  if(s.pc>=0x90cc&&s.pc<=0x90e6){stepNativeInitializeMemory(s);this.advancePpu((s.cycles-start)*3);return;}
  const node=instructions.get(s.pc);if(!node)throw Error(`Outside cold source program ${s.pc.toString(16)}`);const [pc,op,mode,operand,size,cost,penalty]=node;s.pc=(pc+size)&65535;let address=operand,base=operand,cycles=cost;
  if(mode==='zpx')address=(operand+s.x)&255;else if(mode==='zpy')address=(operand+s.y)&255;
  else if(mode==='absx')address=(operand+s.x)&65535;else if(mode==='absy')address=(operand+s.y)&65535;
  else if(mode==='indx'){const p=(operand+s.x)&255;address=this.read(p)|(this.read((p+1)&255)<<8);}
  else if(mode==='indy'){base=this.read(operand)|(this.read((operand+1)&255)<<8);address=(base+s.y)&65535;}
  if(penalty&&(base&0xff00)!==(address&0xff00))cycles++;
  const value=()=>mode==='imm'?operand:mode==='acc'?s.a:this.read(address),store=(n:number)=>{if(mode==='acc')s.a=n&255;else this.write(address,n);};
  const compare=(n:number)=>{const v=value();this.flag(1,n>=v);this.nz((n-v)&255);};
  switch(op){
   case 'LDA':s.a=value();this.nz(s.a);break;case 'LDX':s.x=value();this.nz(s.x);break;case 'LDY':s.y=value();this.nz(s.y);break;
   case 'STA':store(s.a);break;case 'STX':store(s.x);break;case 'STY':store(s.y);break;
   case 'TAX':s.x=s.a;this.nz(s.x);break;case 'TAY':s.y=s.a;this.nz(s.y);break;case 'TXA':s.a=s.x;this.nz(s.a);break;case 'TYA':s.a=s.y;this.nz(s.a);break;case 'TSX':s.x=s.sp;this.nz(s.x);break;case 'TXS':s.sp=s.x;break;
   case 'PHA':this.push(s.a);break;case 'PHP':this.push(s.p|48);break;case 'PLA':s.a=this.pull();this.nz(s.a);break;case 'PLP':s.p=(this.pull()&~16)|32;break;
   case 'AND':s.a&=value();this.nz(s.a);break;case 'ORA':s.a|=value();this.nz(s.a);break;case 'EOR':s.a^=value();this.nz(s.a);break;
   case 'ADC':case 'SBC':{const v=value()^(op==='SBC'?255:0),a=s.a,sum=a+v+(s.p&1);this.flag(1,sum>255);this.flag(64,Boolean((~(a^v)&(a^sum))&128));s.a=sum&255;this.nz(s.a);break;}
   case 'CMP':compare(s.a);break;case 'CPX':compare(s.x);break;case 'CPY':compare(s.y);break;
   case 'BIT':{const v=value();this.flag(2,(s.a&v)===0);s.p=(s.p&~0xc0)|(v&0xc0);break;}
   case 'INX':s.x=(s.x+1)&255;this.nz(s.x);break;case 'INY':s.y=(s.y+1)&255;this.nz(s.y);break;case 'DEX':s.x=(s.x-1)&255;this.nz(s.x);break;case 'DEY':s.y=(s.y-1)&255;this.nz(s.y);break;
   case 'INC':case 'DEC':{const v=(value()+(op==='INC'?1:-1))&255;store(v);this.nz(v);break;}
   case 'ASL':case 'LSR':case 'ROL':case 'ROR':{const v=value(),carry=s.p&1,left=op==='ASL'||op==='ROL';this.flag(1,Boolean(left?v&128:v&1));const n=(left?v*2+(op==='ROL'?carry:0):(v>>1)+(op==='ROR'?carry*128:0))&255;store(n);this.nz(n);break;}
   case 'CLC':this.flag(1,false);break;case 'SEC':this.flag(1,true);break;case 'SEI':this.flag(4,true);break;case 'CLI':this.flag(4,false);break;case 'CLD':this.flag(8,false);break;case 'SED':this.flag(8,true);break;case 'CLV':this.flag(64,false);break;
   case 'JSR':this.push((s.pc-1)>>8);this.push(s.pc-1);s.pc=operand;break;
   case 'RTS':{const low=this.pull();s.pc=((this.pull()<<8)+low+1)&65535;break;}
   case 'RTI':{s.p=(this.pull()&~16)|32;const low=this.pull();s.pc=(this.pull()<<8)|low;this.returned=true;break;}
   case 'JMP':s.pc=mode==='ind'?this.read(operand)|(this.read((operand&0xff00)|((operand+1)&255))<<8):operand;break;
   case 'BPL':case 'BMI':case 'BVC':case 'BVS':case 'BCC':case 'BCS':case 'BNE':case 'BEQ':{const bit=op==='BPL'||op==='BMI'?128:op==='BVC'||op==='BVS'?64:op==='BCC'||op==='BCS'?1:2,take=Boolean(s.p&bit)===['BMI','BVS','BCS','BEQ'].includes(op);if(take){cycles+=1+Number((s.pc&0xff00)!==(operand&0xff00));s.pc=operand;}break;}
   case 'NOP':break;default:throw Error(`Unsupported cold operation ${op}`);
  }
  s.cycles+=cycles+this.dma;this.dma=0;if(op==='RTI'&&this.nmiStart!==undefined)this.nmiCycles=s.cycles-this.nmiStart;this.advancePpu((s.cycles-start)*3);
 }
 step(pad:number):void{if(this.done)return;this.pad=pad&255;while(this.ppuDot<this.target)this.instruction();this.target+=341*262;if(this.returned)this.done=true;}
}
