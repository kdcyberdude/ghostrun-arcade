import source from '../data/native-source-program.json';
import graphics from '../data/native-source-ppu-graphics.json';
const futureControllerRead=Symbol('future controller read');
import {NativeSourcePpu} from './native-source-ppu.js';
export type NativeSourceInstruction=[number,string,string,number,number,number,number];
export interface NativeSourceProgram {reset:number;nmi:number;instructions:NativeSourceInstruction[];data:[number,number][]}
export interface NativeSourceCpu {pc:number;a:number;x:number;y:number;p:number;sp:number;cycles:number}
export interface NativeSourceAccess {address:number;value:number}
export interface NativeSourceInstructionEvent {pc:number;nextPc:number;cycles:number;nmiServiced:boolean;reads:NativeSourceAccess[];writes:NativeSourceAccess[];cpuBefore:NativeSourceCpu}
/** Instruction-level source executor. RAM starts FF and is never refreshed from
 * recorded frames. Unknown instructions/bus feedback fail explicitly. */
export class NativeSourceMachine {
 readonly ram=new Uint8Array(2048).fill(255);
 readonly cpu:NativeSourceCpu;
 readonly ppu:NativeSourcePpu;
 onInstruction?: (event:NativeSourceInstructionEvent,machine:NativeSourceMachine)=>void;
 /** Opt-in sparse observation during step(); NMI entry is always observed.
  * stepInstruction() still returns every instruction and all its accesses. */
 observerPcs?:ReadonlySet<number>;
 private instructions:Map<number,NativeSourceInstruction>;private tables:Map<number,number>;
 private target=241*341+1;private pad=0;private strobe=0;private shift=0;private shiftCount=0;private dma=0;
 private reads:NativeSourceAccess[]=[];private writes:NativeSourceAccess[]=[];private record=true;private rejectControllerReads=false;
 constructor(readonly program:NativeSourceProgram=source as unknown as NativeSourceProgram,opacityMasks?:ArrayLike<number>,patternRead?:(address:number)=>number){
  this.instructions=new Map(program.instructions.map(r=>[r[0],r]));this.tables=new Map(program.data);
  this.cpu={pc:program.reset,a:0,x:0,y:0,p:0x24,sp:0xfd,cycles:7};this.ppu=new NativeSourcePpu(opacityMasks??graphics.opacity,patternRead??(address=>{const value=graphics.title[address-graphics.titleAddress];if(value===undefined)throw Error(`Outside source title CHR readback ${address.toString(16)}`);return value;}));
 }
 /** Isolated view projection; neither CPU nor PPU ownership advances here. */
 predictNextDisplay(){
  const copy:NativeSourceMachine=Object.assign(Object.create(Object.getPrototypeOf(this)),this,{ram:this.ram.slice(),cpu:{...this.cpu},ppu:this.ppu.fork(),reads:[],writes:[],onInstruction:undefined,observerPcs:undefined,rejectControllerReads:true});
  try{copy.advanceToSample();return copy.ppu.displayFrontier;}catch(error){if(error===futureControllerRead)return undefined;throw error;}
 }
 get cycles(){return this.cpu.cycles;}get pc(){return this.cpu.pc;}get ppuDot(){return this.ppu.absoluteDot;}
 snapshot(){return {...this.cpu,...this.ppu.snapshot()};}
 private nz(n:number){this.cpu.p=(this.cpu.p&~0x82)|(n===0?2:0)|(n&128);}
 private flag(bit:number,value:boolean){this.cpu.p=(this.cpu.p&~bit)|(value?bit:0);}
 private push(n:number){this.write(0x100+this.cpu.sp,n&255);this.cpu.sp=(this.cpu.sp-1)&255;}
 private pull(){this.cpu.sp=(this.cpu.sp+1)&255;return this.read(0x100+this.cpu.sp);}
 private read(address:number):number{
  address&=65535;if(this.rejectControllerReads&&(address===0x4016||address===0x4017))throw futureControllerRead;let value:number;
  if(address<0x2000)value=this.ram[address&2047];
  else if(address<0x4000)value=this.ppu.read(address&7);
  else if(address===0x4016){if(this.strobe)value=64|(this.pad&1);else {value=64|(this.shiftCount<8?this.shift&1:1);if(this.shiftCount<8){this.shift>>=1;this.shiftCount++;}}}
  else if(address===0x4017)value=64;
  else {const table=this.tables.get(address);if(table===undefined)throw Error(`Unsupported source read ${address.toString(16)} at ${this.pc.toString(16)}`);value=table;}
  if(this.record)this.reads.push({address,value});return value;
 }
 private write(address:number,value:number){
  value&=255;address&=65535;if(this.record)this.writes.push({address,value});
  if(address<0x2000){this.ram[address&2047]=value;return;}
  if(address<0x4000){this.ppu.write(address&7,value);return;}
  if(address===0x4014){for(let i=0;i<256;i++)this.ppu.oam[(this.ppu.oamAddress+i)&255]=this.ram[((value<<8)+i)&2047];this.dma+=513;return;}
  if(address===0x4016){const next=value&1;if(next||this.strobe){this.shift=this.pad;this.shiftCount=0;}this.strobe=next;return;}
  // SMB does not enable DMC. Audio synthesis has no CPU feedback on this path.
  if(address>=0x4000&&address<=0x4017){if(address===0x4015&&(value&16))throw Error('DMC CPU timing is unsupported');return;}
  throw Error(`Unsupported source write ${address.toString(16)}`);
 }
 stepInstruction():NativeSourceInstructionEvent{return this.executeInstruction(true)!;}
 private executeInstruction(record:boolean):NativeSourceInstructionEvent|undefined{
  this.record=record;if(record){this.reads=[];this.writes=[];}const s=this.cpu,start=s.cycles;let nmiServiced=false;
  if(this.ppu.nmi){this.ppu.nmi=false;nmiServiced=true;this.push(s.pc>>8);this.push(s.pc);this.push((s.p&~16)|32);s.p|=4;s.pc=this.program.nmi;s.cycles+=7;}
  this.ppu.instructionStart=3*(s.cycles-start)+this.ppu.dot;
  const cpuBefore=record?{...s}:undefined;
  const node=this.instructions.get(s.pc);if(!node)throw Error(`Outside source program ${s.pc.toString(16)}`);const [pc,op,mode,operand,size,cost,penalty]=node;s.pc=(pc+size)&65535;let address=operand,base=operand,cycles=cost;
  if(mode==='zpx')address=(operand+s.x)&255;else if(mode==='zpy')address=(operand+s.y)&255;
  else if(mode==='absx')address=(operand+s.x)&65535;else if(mode==='absy')address=(operand+s.y)&65535;
  else if(mode==='indx'){const p=(operand+s.x)&255;address=this.read(p)|(this.read((p+1)&255)<<8);}
  else if(mode==='indy'){base=this.read(operand)|(this.read((operand+1)&255)<<8);address=(base+s.y)&65535;}
  if(penalty&&(base&0xff00)!==(address&0xff00))cycles++;
  this.ppu.instructionCycles=cycles;
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
   case 'RTI':{s.p=(this.pull()&~16)|32;const low=this.pull();s.pc=(this.pull()<<8)|low;break;}
   case 'JMP':s.pc=mode==='ind'?this.read(operand)|(this.read((operand&0xff00)|((operand+1)&255))<<8):operand;break;
   case 'BPL':case 'BMI':case 'BVC':case 'BVS':case 'BCC':case 'BCS':case 'BNE':case 'BEQ':{const bit=op==='BPL'||op==='BMI'?128:op==='BVC'||op==='BVS'?64:op==='BCC'||op==='BCS'?1:2,take=Boolean(s.p&bit)===['BMI','BVS','BCS','BEQ'].includes(op);if(take){cycles+=1+Number((s.pc&0xff00)!==(operand&0xff00));s.pc=operand;}break;}
   case 'NOP':break;default:throw Error(`Unsupported source operation ${op}`);
  }
  s.cycles+=cycles+this.dma;this.dma=0;this.ppu.advance((s.cycles-start)*3);
  if(!record)return;
  const event={pc,nextPc:s.pc,cycles:s.cycles-start,nmiServiced,reads:this.reads,writes:this.writes,cpuBefore:cpuBefore!};
  if(nmiServiced||!this.observerPcs||this.observerPcs.has(pc))this.onInstruction?.(event,this);return event;
 }
 step(pad:number):void{this.pad=pad&255;this.advanceToSample();}
 private advanceToSample():void{
  while(this.ppuDot<this.target){
   const observed=Boolean(this.onInstruction&&(this.ppu.nmi||!this.observerPcs||this.observerPcs.has(this.pc)));
   const node=this.instructions.get(this.pc);
   // A source absolute self-JMP has no RAM/register effects. Batch only until
   // the first PPU event (or sample), then reconsider NMI and observation.
   if(!observed&&!this.ppu.nmi&&node?.[1]==='JMP'&&node[2]==='abs'&&node[3]===this.pc){
    const dots=Math.min(this.target-this.ppuDot,this.ppu.dotsUntilEvent()),repeats=Math.ceil(dots/(node[5]*3)),cycles=repeats*node[5];this.cpu.cycles+=cycles;this.ppu.advance(cycles*3);
   }else this.executeInstruction(observed);
  }
  this.target+=341*262;
 }
}
