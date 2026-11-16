/** Cycle-counting 6502 (official opcodes) for NROM PRG, written for the native NMI timing measurements (native-nmi-timing.ts).
 * replayNmi runs one NMI from a RAM row with the PPU reduced to the sprite-0 flag: set before cycle 2270 (pre-render clear) and from
 * the hit cycle on; OAM DMA costs 513 cycles plus one on an odd cycle. Event cycles are instruction starts, counted from the NMI. */
import fs from 'node:fs';
export function loadPrg(path){const b=fs.readFileSync(path);const n=b[4]*16384;return b.subarray(16,16+n);}
export class CPU{
 constructor(prg){this.prg=prg;this.ram=new Uint8Array(2048);this.cyc=0;this.a=0;this.x=0;this.y=0;this.s=0xfd;this.p=0x24;this.pc=0;this.onRead=null;this.onWrite=null;this.mask=prg.length-1;}
 rd(a){a&=0xffff;if(a<0x2000)return this.ram[a&0x7ff];if(a>=0x8000)return this.prg[a&this.mask];return this.onRead?this.onRead(a,this)&255:0;}
 wr(a,v){a&=0xffff;v&=255;if(a<0x2000){this.ram[a&0x7ff]=v;return;}if(this.onWrite)this.onWrite(a,v,this);}
 push(v){this.ram[0x100|this.s]=v&255;this.s=(this.s-1)&255;}
 pop(){this.s=(this.s+1)&255;return this.ram[0x100|this.s];}
 nz(v){this.p=(this.p&0x7d)|(v&0x80)|((v&255)===0?2:0);return v&255;}
 nmi(){this.push(this.pc>>8);this.push(this.pc);this.push((this.p|0x20)&0xef);this.p|=4;this.pc=this.rd(0xfffa)|(this.rd(0xfffb)<<8);this.cyc+=7;}
 step(){
  const op=this.rd(this.pc),pc=this.pc;let c=0,ad=0,v;
  const imm=()=>{ad=(pc+1)&0xffff;this.pc=pc+2;};
  const zp=()=>{ad=this.rd(pc+1);this.pc=pc+2;};
  const zpx=()=>{ad=(this.rd(pc+1)+this.x)&255;this.pc=pc+2;};
  const zpy=()=>{ad=(this.rd(pc+1)+this.y)&255;this.pc=pc+2;};
  const ab=()=>{ad=this.rd(pc+1)|(this.rd(pc+2)<<8);this.pc=pc+3;};
  const abx=(w)=>{const b=this.rd(pc+1)|(this.rd(pc+2)<<8);ad=(b+this.x)&0xffff;if(!w&&((b^ad)&0x100))c++;this.pc=pc+3;};
  const aby=(w)=>{const b=this.rd(pc+1)|(this.rd(pc+2)<<8);ad=(b+this.y)&0xffff;if(!w&&((b^ad)&0x100))c++;this.pc=pc+3;};
  const izx=()=>{const z=(this.rd(pc+1)+this.x)&255;ad=this.ram[z]|(this.ram[(z+1)&255]<<8);this.pc=pc+2;};
  const izy=(w)=>{const z=this.rd(pc+1);const b=this.ram[z]|(this.ram[(z+1)&255]<<8);ad=(b+this.y)&0xffff;if(!w&&((b^ad)&0x100))c++;this.pc=pc+2;};
  const br=(cond)=>{const o=this.rd(pc+1);this.pc=pc+2;if(cond){const t=(this.pc+(o<128?o:o-256))&0xffff;c+=(t^this.pc)&0x100?2:1;this.pc=t;}};
  const adc=(m)=>{const r=this.a+m+(this.p&1);this.p=(this.p&0xbe)|(r>255?1:0)|((~(this.a^m)&(this.a^r)&0x80)?0x40:0);this.a=this.nz(r);};
  const cmp=(r,m)=>{const t=r-m;this.p=(this.p&0xfe)|(t>=0?1:0);this.nz(t);};
  const F=this;
  // addressing mode by group
  const M={};
  const L=(mode)=>{switch(mode){case'imm':imm();break;case'zp':zp();break;case'zpx':zpx();break;case'zpy':zpy();break;case'ab':ab();break;case'abx':abx(false);break;case'aby':aby(false);break;case'izx':izx();break;case'izy':izy(false);break;case'abxw':abx(true);break;case'abyw':aby(true);break;case'izyw':izy(true);break;}};
  const d=OPS[op];if(!d)throw new Error('bad op '+op.toString(16)+' at '+pc.toString(16));
  const [name,mode,cy]=d;c+=cy;L(mode);
  switch(name){
   case'LDA':this.a=this.nz(this.rd(ad));break;case'LDX':this.x=this.nz(this.rd(ad));break;case'LDY':this.y=this.nz(this.rd(ad));break;
   case'STA':this.wr(ad,this.a);break;case'STX':this.wr(ad,this.x);break;case'STY':this.wr(ad,this.y);break;
   case'ADC':adc(this.rd(ad));break;case'SBC':adc(this.rd(ad)^255);break;
   case'AND':this.a=this.nz(this.a&this.rd(ad));break;case'ORA':this.a=this.nz(this.a|this.rd(ad));break;case'EOR':this.a=this.nz(this.a^this.rd(ad));break;
   case'CMP':cmp(this.a,this.rd(ad));break;case'CPX':cmp(this.x,this.rd(ad));break;case'CPY':cmp(this.y,this.rd(ad));break;
   case'BIT':v=this.rd(ad);this.p=(this.p&0x3d)|(v&0xc0)|((v&this.a)===0?2:0);break;
   case'INC':v=(this.rd(ad)+1)&255;this.wr(ad,this.nz(v));break;case'DEC':v=(this.rd(ad)-1)&255;this.wr(ad,this.nz(v));break;
   case'ASL':if(mode==='acc'){this.p=(this.p&0xfe)|(this.a>>7);this.a=this.nz(this.a<<1);this.pc=pc+1;}else{v=this.rd(ad);this.p=(this.p&0xfe)|(v>>7);this.wr(ad,this.nz(v<<1));}break;
   case'LSR':if(mode==='acc'){this.p=(this.p&0xfe)|(this.a&1);this.a=this.nz(this.a>>1);this.pc=pc+1;}else{v=this.rd(ad);this.p=(this.p&0xfe)|(v&1);this.wr(ad,this.nz(v>>1));}break;
   case'ROL':if(mode==='acc'){const cc=this.p&1;this.p=(this.p&0xfe)|(this.a>>7);this.a=this.nz((this.a<<1)|cc);this.pc=pc+1;}else{v=this.rd(ad);const cc=this.p&1;this.p=(this.p&0xfe)|(v>>7);this.wr(ad,this.nz((v<<1)|cc));}break;
   case'ROR':if(mode==='acc'){const cc=this.p&1;this.p=(this.p&0xfe)|(this.a&1);this.a=this.nz((this.a>>1)|(cc<<7));this.pc=pc+1;}else{v=this.rd(ad);const cc=this.p&1;this.p=(this.p&0xfe)|(v&1);this.wr(ad,this.nz((v>>1)|(cc<<7)));}break;
   case'INX':this.x=this.nz(this.x+1);this.pc=pc+1;break;case'INY':this.y=this.nz(this.y+1);this.pc=pc+1;break;
   case'DEX':this.x=this.nz(this.x-1);this.pc=pc+1;break;case'DEY':this.y=this.nz(this.y-1);this.pc=pc+1;break;
   case'TAX':this.x=this.nz(this.a);this.pc=pc+1;break;case'TAY':this.y=this.nz(this.a);this.pc=pc+1;break;
   case'TXA':this.a=this.nz(this.x);this.pc=pc+1;break;case'TYA':this.a=this.nz(this.y);this.pc=pc+1;break;
   case'TSX':this.x=this.nz(this.s);this.pc=pc+1;break;case'TXS':this.s=this.x;this.pc=pc+1;break;
   case'PHA':this.push(this.a);this.pc=pc+1;break;case'PHP':this.push(this.p|0x30);this.pc=pc+1;break;
   case'PLA':this.a=this.nz(this.pop());this.pc=pc+1;break;case'PLP':this.p=(this.pop()&0xef)|0x20;this.pc=pc+1;break;
   case'CLC':this.p&=~1;this.pc=pc+1;break;case'SEC':this.p|=1;this.pc=pc+1;break;case'CLI':this.p&=~4;this.pc=pc+1;break;case'SEI':this.p|=4;this.pc=pc+1;break;
   case'CLD':this.p&=~8;this.pc=pc+1;break;case'SED':this.p|=8;this.pc=pc+1;break;case'CLV':this.p&=~0x40;this.pc=pc+1;break;case'NOP':this.pc=pc+1;break;
   case'BPL':br(!(this.p&0x80));break;case'BMI':br(this.p&0x80);break;case'BVC':br(!(this.p&0x40));break;case'BVS':br(this.p&0x40);break;
   case'BCC':br(!(this.p&1));break;case'BCS':br(this.p&1);break;case'BNE':br(!(this.p&2));break;case'BEQ':br(this.p&2);break;
   case'JMP':if(mode==='ind'){const b=this.rd(pc+1)|(this.rd(pc+2)<<8);this.pc=this.rd(b)|(this.rd((b&0xff00)|((b+1)&255))<<8);}else this.pc=this.rd(pc+1)|(this.rd(pc+2)<<8);break;
   case'JSR':{const t=this.rd(pc+1)|(this.rd(pc+2)<<8);const r=pc+2;this.push(r>>8);this.push(r);this.pc=t;break;}
   case'RTS':this.pc=((this.pop()|(this.pop()<<8))+1)&0xffff;break;
   case'RTI':this.p=(this.pop()&0xef)|0x20;this.pc=this.pop()|(this.pop()<<8);break;
   case'BRK':throw new Error('BRK at '+pc.toString(16));
  }
  this.pc&=0xffff;this.cyc+=c;return op;
 }
}
const OPS=[];
const def=(name,list)=>{for(const [op,mode,cy] of list)OPS[op]=[name,mode,cy];};
const alu=(name,base)=>def(name,[[base+9,'imm',2],[base+5,'zp',3],[base+0x15,'zpx',4],[base+0xd,'ab',4],[base+0x1d,'abx',4],[base+0x19,'aby',4],[base+1,'izx',6],[base+0x11,'izy',5]]);
alu('ORA',0x00);alu('AND',0x20);alu('EOR',0x40);alu('ADC',0x60);alu('LDA',0xa0);alu('CMP',0xc0);alu('SBC',0xe0);
def('STA',[[0x85,'zp',3],[0x95,'zpx',4],[0x8d,'ab',4],[0x9d,'abxw',5],[0x99,'abyw',5],[0x81,'izx',6],[0x91,'izyw',6]]);
def('LDX',[[0xa2,'imm',2],[0xa6,'zp',3],[0xb6,'zpy',4],[0xae,'ab',4],[0xbe,'aby',4]]);
def('LDY',[[0xa0,'imm',2],[0xa4,'zp',3],[0xb4,'zpx',4],[0xac,'ab',4],[0xbc,'abx',4]]);
def('STX',[[0x86,'zp',3],[0x96,'zpy',4],[0x8e,'ab',4]]);def('STY',[[0x84,'zp',3],[0x94,'zpx',4],[0x8c,'ab',4]]);
def('CPX',[[0xe0,'imm',2],[0xe4,'zp',3],[0xec,'ab',4]]);def('CPY',[[0xc0,'imm',2],[0xc4,'zp',3],[0xcc,'ab',4]]);
def('BIT',[[0x24,'zp',3],[0x2c,'ab',4]]);
const rmw=(name,base)=>def(name,[[base+0xa,'acc',2],[base+6,'zp',5],[base+0x16,'zpx',6],[base+0xe,'ab',6],[base+0x1e,'abxw',7]]);
rmw('ASL',0x00);rmw('ROL',0x20);rmw('LSR',0x40);rmw('ROR',0x60);
def('INC',[[0xe6,'zp',5],[0xf6,'zpx',6],[0xee,'ab',6],[0xfe,'abxw',7]]);def('DEC',[[0xc6,'zp',5],[0xd6,'zpx',6],[0xce,'ab',6],[0xde,'abxw',7]]);
for(const [n,o] of [['INX',0xe8],['INY',0xc8],['DEX',0xca],['DEY',0x88],['TAX',0xaa],['TAY',0xa8],['TXA',0x8a],['TYA',0x98],['TSX',0xba],['TXS',0x9a],['CLC',0x18],['SEC',0x38],['CLI',0x58],['SEI',0x78],['CLD',0xd8],['SED',0xf8],['CLV',0xb8],['NOP',0xea]])def(n,[[o,'impl',2]]);
def('PHA',[[0x48,'impl',3]]);def('PHP',[[0x08,'impl',3]]);def('PLA',[[0x68,'impl',4]]);def('PLP',[[0x28,'impl',4]]);
for(const [n,o] of [['BPL',0x10],['BMI',0x30],['BVC',0x50],['BVS',0x70],['BCC',0x90],['BCS',0xb0],['BNE',0xd0],['BEQ',0xf0]])def(n,[[o,'rel',2]]);
def('JMP',[[0x4c,'abs',3],[0x6c,'ind',5]]);def('JSR',[[0x20,'abs',6]]);def('RTS',[[0x60,'impl',6]]);def('RTI',[[0x40,'impl',6]]);def('BRK',[[0x00,'impl',7]]);

/** One NMI on a copy of ram (2048 bytes) with pad (recording bit order, bit 0 = A) on port 1, up to the first Sprite0Hit poll (or its RTI
 * when Sprite0HitDetectFlag is clear). Returns {cpu, events:[[kind,cycle,value]]}. */
export function replayNmi(prg,ram,pad,{hit=5790,clear=2270}={}){
 const cpu=new CPU(prg);cpu.ram.set(ram);cpu.s=0xfb;cpu.pc=0x8057;cpu.p=0x24;const ev=[];let strobe=0,bit=0,done=false;
 cpu.onRead=(a,cp)=>{const t=cp.cyc;if(a>=0x2000&&a<0x4000&&(a&7)===2){ev.push(['r2002',t,cp.pc]);if(cp.pc>=0x8150&&cp.pc<0x8160)done=true;return (t<clear?0xc0:0)|(t>=hit?0x40:0);}
  if(a===0x4016||a===0x4017){const v=a===0x4016?((pad>>bit)&1):0;if(!strobe&&a===0x4016)bit=Math.min(8,bit+1);return 0x40|v;}return 0;};
 cpu.onWrite=(a,v,cp)=>{const t=cp.cyc;if(a>=0x2000&&a<0x4000)ev.push(['w'+(0x2000+(a&7)).toString(16),t,v]);else if(a===0x4014)ev.push(['dma',t,v]);else if(a===0x4016){strobe=v&1;if(strobe)bit=0;}};
 cpu.cyc=0;cpu.nmi();let n=0;
 while(!done){const op=cpu.step();if(op===0x40){ev.push(['rti',cpu.cyc]);break;}
  const e=ev[ev.length-1];if(e&&e[0]==='dma'&&e[1]===cpu.cyc-4&&!e.done){e.done=1;cpu.cyc+=513+(cpu.cyc&1);}
  if(++n>2e6)throw new Error('replayNmi: runaway');}
 return {cpu,events:ev};
}
/** SoundEngine ($F2D0) alone on a copy of ram: returns {cpu, cycles} with cycles from the JSR to the return. */
export function replaySoundEngine(prg,ram){
 const cpu=new CPU(prg);cpu.ram.set(ram);cpu.onRead=()=>0;cpu.onWrite=()=>{};cpu.ram[0x1fd]=0xff;cpu.ram[0x1fc]=0xff;cpu.s=0xfb;cpu.pc=0xf2d0;cpu.p=0x24;cpu.cyc=0;
 let n=0;while(cpu.pc!==0){cpu.step();if(++n>1e5)throw new Error('replaySoundEngine: runaway');}
 return {cpu,cycles:cpu.cyc+6};
}
