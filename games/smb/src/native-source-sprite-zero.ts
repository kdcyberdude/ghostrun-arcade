export type SourcePpuHeader={v:number;t:number;x:number;ctrl:number;mask:number};
export type SourcePpuEvent={start:number;end:number;kind:number;value:number;aux:number};
/** Opacity-only projection of the source backend's NROM scanline replay.
 * Transparent CHR masks suffice: sprite-zero feedback never reads palette colors. */
export function sourceSpriteZeroHit(header:SourcePpuHeader,events:SourcePpuEvent[],nametable:Uint8Array,oam:Uint8Array,opacity?:ArrayLike<number>):{dot:number;hit:boolean}{
 const first=oam[0]+1;if(first>=240)return {dot:0,hit:false};
 if(!opacity){if((header.mask&24)||events.some(e=>e.kind===2&&(e.value&24)))throw Error('Source sprite-zero timing requires CHR opacity masks');return {dot:Math.min(first+15,239)*341+245,hit:false};}
 const s={...header,shift:0,sphitx:256,sphitdata:0},line=new Uint8Array(264);let cursor=0;
 const rendering=()=>Boolean(s.mask&24);
 const vertical=()=>{let v=s.v;if((v&0x7000)===0x7000){v^=0x7000;if((v&0x3e0)===0x3a0)v^=0xba0;else if((v&0x3e0)===0x3e0)v^=0x3e0;else v+=32;}else v+=4096;s.v=v&0x7fff;};
 const apply=(e:SourcePpuEvent,drawing:boolean)=>{const n=e.value;if(e.kind===1){s.ctrl=n;s.t=(s.t&0xf3ff)|((n&3)<<10);}else if(e.kind===2)s.mask=n;else if(e.kind===3){if(!e.aux){s.t=(s.t&0xffe0)|(n>>3);s.x=n&7;}else s.t=(s.t&0x8c1f)|((n&0xf8)<<2)|((n&7)<<12);}else if(e.kind===4){if(!e.aux)s.t=(s.t&255)|((n&63)<<8);else {s.t=(s.t&0xff00)|n;s.v=s.t;}}else if(e.kind===6&&drawing&&rendering())vertical();else if(e.kind>=5)s.v=(s.v+((s.ctrl&4)?32:1))&0x7fff;};
 while(cursor<events.length&&events[cursor].start< -16)apply(events[cursor++],false);
 if(rendering())s.v=s.t;
 const last=Math.min(first+15,239);
 for(let y=0;y<=last;y++){
  const start=y*341-16,previousHitX=s.sphitx;let tile=0,out=0,tofix=true,hitX=-1;line.fill(0);
  const check=(p:number)=>{if(s.sphitx===256)return;for(let x=s.sphitx;x<s.sphitx+8&&x<p-16&&x<255;x++)if((s.sphitdata&(128>>(x-s.sphitx)))&&line[x]){hitX=x;s.sphitx=256;return;}};
  const update=(p:number)=>{let stop=p>>3;if(s.sphitx!==256&&s.sphitx<p-16&&!(s.sphitx<(stop-2)*8))stop++;stop=Math.min(stop,34);if(stop<=tile)return;const initial=tile;
   for(;tile<stop;tile++){
    if(!rendering()){if(out<256)line.fill(0,out,Math.min(256,out+8));out+=8;continue;}
    if(tile>=2){for(let k=0;k<8&&out+k<256;k++)line[out+k]=((s.shift>>(8-s.x))>>(7-k))&1;out+=8;}
    const v=s.v,id=nametable[(v&0xfff)&2047],pattern=((s.ctrl&16)?256:0)+id,row=(v>>12)&7;
    s.shift=((s.shift<<8)|opacity[pattern*8+row])&65535;s.v=(v&31)===31?v^0x41f:v+1;
   }
   if(initial<=2&&stop>2&&!(s.mask&2))line.fill(0,0,8);
   if(!(s.mask&8))line.fill(0,Math.max(0,(initial-2)*8),Math.min(256,(stop-2)*8));
   if(p>=268&&tofix){if(rendering())vertical();tofix=false;}
   check(p);
  };
  while(cursor<events.length&&events[cursor].start<start+272){const event=events[cursor++];if(event.kind!==5&&event.kind!==7)update(event.end-start);apply(event,true);}
  update(272);if(tofix&&rendering())vertical();check(272);
  if(hitX>=0){let p=hitX+17;for(;;p++){let n=p>>3;if(previousHitX<p-16&&!(previousHitX<(n-2)*8))n++;if(hitX<(Math.min(n,34)-2)*8)break;}return {dot:y*341-16+p-12-11,hit:true};}
  const delta=y-oam[0],height=(s.ctrl&32)?16:8;let bits=0;
  if(rendering()&&delta>=0&&delta<height){let address=height===16?((oam[1]&1)<<12)+((oam[1]&254)<<4):(oam[1]<<4)+((s.ctrl&8)?4096:0);address+=(oam[2]&128)?7-delta+((s.ctrl&32)>>1)-(delta&8):delta+(delta&8);address&=8191;bits=opacity[(address>>4)*8+(address&7)];}
  s.sphitx=256;
  while(cursor<events.length&&events[cursor].start<start+278)apply(events[cursor++],true);
  if(rendering())s.v=(s.v&0xfbe0)|(s.t&0x41f);
  while(cursor<events.length&&events[cursor].start<start+341)apply(events[cursor++],true);
  if((s.mask&16)&&bits){if(oam[2]&64){let reversed=0;for(let k=0;k<8;k++)reversed|=((bits>>k)&1)<<(7-k);bits=reversed;}s.sphitx=oam[3];s.sphitdata=bits;}
 }
 return {dot:last*341+245,hit:false};
}
