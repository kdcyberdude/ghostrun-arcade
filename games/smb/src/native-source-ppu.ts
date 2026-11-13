import {sourceSpriteZeroHit,type SourcePpuHeader,type SourcePpuEvent} from './native-source-sprite-zero.js';
const FRAME=341*262,VBLANK=241*341+1,CAPTURE=261*341+1;
/** Owned NROM bus and instruction-stamped PPU clock. No captured frame state. */
export class NativeSourcePpu {
 readonly nametable=new Uint8Array(2048);readonly palette=new Uint8Array(32);readonly oam=new Uint8Array(256);
 frame=0;dot=0;ctrl=0;mask=0;status=0;openBus=0;nmi=false;v=0;t=0;x=0;w=0;oamAddress=0;readBuffer=0;
 instructionStart=0;instructionCycles=0;
 private header:SourcePpuHeader={v:0,t:0,x:0,ctrl:0,mask:0};private events:SourcePpuEvent[]=[];private kook=0;
 private scheduled=0;private evaluated=-1;private predictedHit=false;
 constructor(private opacity?:ArrayLike<number>,private patternRead?:(address:number)=>number){if(opacity&&opacity.length!==4096)throw Error('Expected 512 CHR tile opacity masks');}
 get absoluteDot(){return this.frame*FRAME+this.dot;}
 snapshot(){return {ppuFrame:this.frame,ppuDot:this.dot,ctrl:this.ctrl,mask:this.mask,status:this.status,nmi:Number(this.nmi),openBus:this.openBus,v:this.v,t:this.t,fineX:this.x,w:this.w};}
 private nt(address:number){return (address-0x2000)&2047;}
 private pal(address:number){const i=address&31;return (i&19)===16?i&15:i;}
 private memoryRead(address:number){address&=0x3fff;if(address<0x2000){if(!this.patternRead)throw Error('CHR color read is outside source-opacity timing coverage');return this.patternRead(address);}return address<0x3f00?this.nametable[this.nt(address)]:this.palette[this.pal(address)];}
 private increment(){this.v=(this.v+((this.ctrl&4)?32:1))&0x7fff;}
 read(reg:number){
  if(reg===2){const value=(this.status&0xe0)|(this.openBus&31);this.status&=127;this.nmi=false;this.w=0;this.openBus=value;return value;}
  if(reg===4)return this.oam[this.oamAddress];
  if(reg===7){const address=this.v&0x3fff;let value=this.readBuffer;if(address>=0x3f00){value=this.memoryRead(address);this.readBuffer=this.memoryRead(address-0x1000);}else this.readBuffer=this.memoryRead(address);this.increment();this.log(6,0,0);this.openBus=value;return value;}
  return 0;
 }
 private log(kind:number,value:number,aux=0){const dot=this.instructionStart;if(dot>=VBLANK&&dot<CAPTURE)return;const start=dot>=CAPTURE?dot-FRAME+11+this.kook:dot+11;this.events.push({start,end:start+this.instructionCycles*3,kind,value,aux});}
 write(reg:number,value:number){
  if(reg===0){if((value&128)&&!(this.ctrl&128)&&(this.status&128))this.nmi=true;this.ctrl=value;this.t=(this.t&0xf3ff)|((value&3)<<10);this.log(1,value);}
  else if(reg===1){this.mask=value;this.log(2,value);}
  else if(reg===3)this.oamAddress=value;
  else if(reg===4){this.oam[this.oamAddress]=value;this.oamAddress=(this.oamAddress+1)&255;}
  else if(reg===5){this.log(3,value,this.w);if(!this.w){this.x=value&7;this.t=(this.t&0xffe0)|(value>>3);}else this.t=(this.t&0x8c1f)|((value&0xf8)<<2)|((value&7)<<12);this.w^=1;}
  else if(reg===6){this.log(4,value,this.w);if(!this.w)this.t=(this.t&255)|((value&63)<<8);else {this.t=(this.t&0x7f00)|value;this.v=this.t;}this.w^=1;}
  else if(reg===7){const address=this.v&0x3fff;if(address<0x2000)throw Error('NROM CHR writes are unsupported');if(address<0x3f00){this.nametable[this.nt(address)]=value;this.log(5,0);}else {this.palette[this.pal(address)]=value;this.log(7,value,this.pal(address));}this.increment();}
  this.openBus=value;
 }
 /** Physical dots to the next source PPU event; an idle CPU may not cross it
  * before checking pending NMI. The omitted pre-render dot is handled by advance. */
 dotsUntilEvent(){let next=FRAME-Number(Boolean(this.frame&1));for(const event of [VBLANK-12,VBLANK,CAPTURE-12,CAPTURE,this.scheduled])if(event>this.dot&&event<next)next=event;return next-this.dot;}
 advance(dots:number){
  while(dots>0){const end=FRAME-Number(Boolean(this.frame&1));let next=end;
   for(const event of [VBLANK-12,VBLANK,CAPTURE-12,CAPTURE])if(event>this.dot&&event<next)next=event;
   if(this.scheduled>this.dot&&this.scheduled<next)next=this.scheduled;
   const amount=Math.min(dots,next-this.dot);this.dot+=amount;dots-=amount;if(this.dot!==next)continue;
   if(this.scheduled&&next===this.scheduled){
    if(this.evaluated!==this.events.length){const hit=sourceSpriteZeroHit(this.header,this.events,this.nametable,this.oam,this.opacity);this.scheduled=hit.dot;this.predictedHit=hit.hit;this.evaluated=this.events.length;}
    if(this.scheduled<=this.dot){if(this.predictedHit)this.status|=64;this.scheduled=0;}
   }
   if(next===VBLANK-12)this.status|=128;
   else if(next===VBLANK){if(this.ctrl&128)this.nmi=true;}
   else if(next===CAPTURE-12)this.status&=31;
   else if(next===CAPTURE){this.status&=31;this.header={v:this.v,t:this.t,x:this.x,ctrl:this.ctrl,mask:this.mask};this.events=[];this.kook=this.frame&1;this.scheduled=this.oam[0]<239?(this.oam[0]+1)*341-31:0;this.evaluated=-1;this.predictedHit=false;}
   else if(next===end){this.frame++;this.dot=0;}
  }
 }
}
