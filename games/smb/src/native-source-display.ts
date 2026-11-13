import type {SourcePpuHeader,SourcePpuEvent} from './native-source-sprite-zero.js';
export interface NativeSourceDisplayFrame {frame:number;header:SourcePpuHeader;palette:Uint8Array;events:SourcePpuEvent[];nametable:Uint8Array;oam:Uint8Array}
/** Decode existing patterns-index.png RGBA into source tile/row/column indices. */
export function nativeSourcePatternsFromRgba(rgba:ArrayLike<number>,width=128){
 if(width!==128||rgba.length!==128*256*4)throw Error('Expected indexed 512-pattern RGBA sheet');
 const patterns=new Uint8Array(512*64);for(let tile=0;tile<512;tile++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  const offset=(((tile>>4)*8+y)*width+(tile&15)*8+x)*4,value=rgba[offset];if(value>3)throw Error('Expected source 2-bit pattern indices');patterns[tile*64+y*8+x]=value;
 }return patterns;
}
type Sprite={lo:number;hi:number;attr:number;x:number};
/** Resolve the physical frame latched at source vblank. All input state belongs
 * to the source PPU, independently of whether/when the view rendered before. */
export function nativeSourceDisplay(frame:NativeSourceDisplayFrame,patterns:Uint8Array){
 if(patterns.length!==512*64)throw Error('Expected 512 source 2-bit patterns');
 const chr=new Uint8Array(8192);for(let tile=0;tile<512;tile++)for(let y=0;y<8;y++){let lo=0,hi=0;for(let x=0;x<8;x++){const n=patterns[tile*64+y*8+x];lo|=(n&1)<<(7-x);hi|=(n>>1)<<(7-x);}chr[tile*16+y]=lo;chr[tile*16+y+8]=hi;}
 const s={...frame.header,pal:frame.palette.slice(),shift0:0,shift1:0,atlatch:0,fetched:[] as Sprite[],drawn:[] as Sprite[],blurp:false,spork:false,spal:new Uint8Array(16),sphitx:256,sphitdata:0,hit:false};
 let cursor=0;const events=frame.events,pixels=new Uint8Array(256*240),emphasis=new Uint8Array(240);
 const rendering=()=>Boolean(s.mask&24);
 const vertical=()=>{let v=s.v;if((v&0x7000)===0x7000){v^=0x7000;if((v&0x3e0)===0x3a0)v^=0xba0;else if((v&0x3e0)===0x3e0)v^=0x3e0;else v+=32;}else v+=4096;s.v=v&0x7fff;};
 const apply=(e:SourcePpuEvent,drawing:boolean)=>{const n=e.value;if(e.kind===1){s.ctrl=n;s.t=(s.t&0xf3ff)|((n&3)<<10);}else if(e.kind===2)s.mask=n;else if(e.kind===3){if(!e.aux){s.t=(s.t&0xffe0)|(n>>3);s.x=n&7;}else s.t=(s.t&0x8c1f)|((n&0xf8)<<2)|((n&7)<<12);}else if(e.kind===4){if(!e.aux)s.t=(s.t&255)|((n&63)<<8);else {s.t=(s.t&0xff00)|n;s.v=s.t;}}else {if(e.kind===7)s.pal[e.aux&31]=n;if(e.kind===6&&drawing&&rendering())vertical();else s.v=(s.v+((s.ctrl&4)?32:1))&0x7fff;}};
 while(cursor<events.length&&events[cursor].start< -16)apply(events[cursor++],false);if(rendering())s.v=s.t;
 for(let y=0;y<240;y++){
  const line=new Uint8Array(256).fill(255),start=y*341-16;let firsttile=0,outpos=0,tofix=true;
  const check=(p:number)=>{if(s.sphitx===256)return;for(let x=s.sphitx;x<s.sphitx+8&&x<p-16&&x<255;x++)if((s.sphitdata&(128>>(x-s.sphitx)))&&!(line[x]&64)){s.hit=true;s.sphitx=256;return;}};
  const update=(p:number)=>{let last=p>>3;if(s.sphitx!==256&&s.sphitx<p-16&&!(s.sphitx<(last-2)*8))last++;last=Math.min(last,34);if(last<=firsttile)return;const first=firsttile,backdrop=(s.pal[0]&63)|64;
   for(let tile=first;tile<last;tile++){
    if(!rendering()){if(outpos<256)line.fill(backdrop,outpos,Math.min(256,outpos+8));outpos+=8;continue;}
    if(tile>=2){if(outpos<256){const lo=(s.shift0>>>(8-s.x))&255,hi=(s.shift1>>>(8-s.x))&255;for(let k=0;k<8;k++){const c=((lo>>(7-k))&1)|(((hi>>(7-k))&1)<<1),at=k+s.x<8?s.atlatch&3:(s.atlatch>>2)&3;line[outpos+k]=c===0?backdrop:s.pal[at*4+c]&63;}}outpos+=8;}
    const v=s.v,base=v&0xc00,id=frame.nametable[(base|(v&1023))&2047],zz=v&31,attribute=frame.nametable[(base|0x3c0|(zz>>2)|((v&0x380)>>4))&2047],cc=(attribute>>((zz&2)+((v&64)>>4)))&3,address=(id<<4)+((s.ctrl&16)<<8)+((v>>12)&7);
    s.atlatch=(s.atlatch>>2)|(cc<<2);s.shift0=(s.shift0<<8)|chr[address];s.shift1=(s.shift1<<8)|chr[address+8];s.v=(v&31)===31?v^0x41f:v+1;
   }
   if(first<=2&&2<last&&!(s.mask&2))line.fill(backdrop,0,8);if(!(s.mask&8))line.fill(backdrop,Math.max(0,(first-2)*8),Math.min(256,(last-2)*8));firsttile=last;
   if(p>=268&&tofix){if(rendering())vertical();tofix=false;}check(p);
  };
  while(cursor<events.length&&events[cursor].start<start+272){const e=events[cursor++];if(e.kind!==5&&e.kind!==7)update(e.end-start);apply(e,true);}
  update(272);if(tofix&&rendering())vertical();check(272);
  if((s.mask&16)&&s.spork){s.spork=false;for(let x=(s.mask&4)?0:8;x<256;x++)for(const sprite of s.drawn){const k=x-sprite.x;if(k<0||k>=8)continue;const bit=(sprite.attr&64)?k:7-k,c=((sprite.lo>>bit)&1)|(((sprite.hi>>bit)&1)<<1);if(!c)continue;if(!(sprite.attr&32)||(line[x]&64))line[x]=s.spal[(sprite.attr&3)*4+c];break;}}
  const keep=(s.mask&1)&&rendering()?48:63;for(let x=0;x<256;x++)pixels[y*256+x]=line[x]&keep;emphasis[y]=s.mask>>5;
  // End-of-line source sprite fetch; transparent sprites still reserve slots.
  s.sphitx=256;if(rendering()){
   const ctrl=s.ctrl,height=(ctrl&32)?16:8;s.fetched=[];s.blurp=false;
   for(let slot=0;slot<64;slot++){const offset=slot*4,delta=y-frame.oam[offset];if(delta<0||delta>=height)continue;if(s.fetched.length>=8)break;if(slot===0)s.blurp=true;const tile=frame.oam[offset+1],attr=frame.oam[offset+2];let address=height===16?((tile&1)<<12)+((tile&254)<<4):(tile<<4)+((ctrl&8)?4096:0);address+=(attr&128)?7-delta+((ctrl&32)>>1)-(delta&8):delta+(delta&8);address&=8191;s.fetched.push({lo:chr[address],hi:chr[address+8],attr,x:frame.oam[offset+3]});}
  }
  while(cursor<events.length&&events[cursor].start<start+278)apply(events[cursor++],true);if(rendering())s.v=(s.v&0xfbe0)|(s.t&0x41f);while(cursor<events.length&&events[cursor].start<start+341)apply(events[cursor++],true);
  if(s.mask&16){s.spork=false;if(s.fetched.length){s.drawn=s.fetched;s.spal=s.pal.slice(16,32);const sprite=s.drawn[0],bits=sprite.lo|sprite.hi;if(s.blurp&&!s.hit&&bits){let data=bits;if(sprite.attr&64){data=0;for(let k=0;k<8;k++)data|=((bits>>k)&1)<<(7-k);}s.sphitx=sprite.x;s.sphitdata=data;}s.spork=true;}}
 }
 return {pixels,emphasis};
}
export function nativeSourceDisplayPixels(frame:NativeSourceDisplayFrame,patterns:Uint8Array){return nativeSourceDisplay(frame,patterns).pixels;}
