// Native pseudo-random register (RAM 0x7A7-0x7AD, established by correlation, docs/NATIVE_ROLES.md): 56 bits shifted right by one every frame, the new top bit is
// bit 1 of byte 0 xor bit 1 of byte 1. 53,956 of 54,000 model-play rows are exactly one such step; the other 44 are level loads, where it holds for one row.
export class NativeRandom {
 bytes=[0x1d,0xcd,0xf6,0x6d,0x81,0x5a,0x58]; // the value at the first control row of the recorded route
 frame=0; // RAM 0x09: counts every frame, native strokes and other 8-frame events start when its low 3 bits are 0
 tick(){
  this.frame=(this.frame+1)&255;
  let carry=((this.bytes[0]>>1)^(this.bytes[1]>>1))&1;
  for(let i=0;i<7;i++){const next=this.bytes[i]&1;this.bytes[i]=(this.bytes[i]>>1)|(carry<<7);carry=next;}
 }
}
/** FrameCounter after an in-level area load: InitializeMemory clears $09 on the load row and the area set-up takes 24 rows before the first play
 * row (engine 7), where the remake's enterArea runs (native traces: 1-2 325->349, 2-2 328->352, 4-2 327->351, 7-2 328->352, down pipes 1-2 1781,
 * 4-2 2726, 8-4 6455/8859: 10 of 10 loads read 24 there). */
export const AREA_LOAD_FRAME_COUNTER=24;
