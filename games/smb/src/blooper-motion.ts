/** Native Blooper (object id 7) state machine, predicted from the previous row's slot bytes on 8928 of 8929 Blooper rows of the 32 v2 traces
 * (2-2, 7-2, 8-4; the miss is a row where Mario's y wraps above the screen). tests/blooper-motion.test.ts replays every row.
 * Slot bytes: moving direction $46+s (1 right, 2 left), move counter $A0+s, move force $0434+s (= speed $58+s), interval timer $0796+s. A new Blooper
 * has them 2, 0, 0, 0 (25 of 25 spawns). Each frame, in this order:
 *  1. Turn: when random byte s+1 ($07A8+s) AND mask is 0 (mask 3 in secondary hard mode, else 63) the direction is reset: an odd slot takes Mario's
 *     moving direction, an even slot faces Mario (left while its x >= Mario's x, the 16-bit compare's carry is kept for step 2c).
 *  2. Counter bit 1 clear (stroke): on frames with FrameCounter & 7 == 0, counter bit 0 clear: force += 1, and at force 2 the counter goes to 1;
 *     counter bit 0 set: force -= 1, and at force 0 the counter goes to 2 with the interval timer at 2.
 *     Counter bit 1 set (rest): while the timer runs it sinks 1 px on even frames; once the timer is 0 it keeps sinking while
 *     y + 16 + carry < Mario's y (low bytes), else the counter goes back to 0.
 *  3. y -= force unless the result is above 32 (then y stays); x moves force pixels in its direction. */
export interface NativeBlooper{counter:number;force:number;timer:number;dir:1|2}
export interface BlooperFrame{slot:number;frameCounter:number;randomByte:number;mask:number;playerX:number;playerY:number;playerDir:1|2}
export const newNativeBlooper=():NativeBlooper=>({counter:0,force:0,timer:0,dir:2});
/** One frame; x is the 16-bit pixel x, y the native y byte. Returns the new position. */
export function stepNativeBlooper(b:NativeBlooper,x:number,y:number,f:BlooperFrame){
 let carry=0;
 if(!(f.randomByte&f.mask)){
  if(f.slot&1){b.dir=f.playerDir;carry=1;}
  else{const right=x>=f.playerX;b.dir=right?2:1;carry=right?1:0;}
 }
 if(b.counter&2){
  if(b.timer===0&&((y+16+carry)&255)>=f.playerY)b.counter=0;
  else if(!(f.frameCounter&1))y=(y+1)&255;
 }else if(!(f.frameCounter&7)){
  if(b.counter&1){b.force--;if(!b.force){b.counter++;b.timer=2;}}
  else{b.force++;if(b.force===2)b.counter++;}
 }
 const up=(y-b.force)&255;if(up>=32)y=up;
 x+=b.dir===1?b.force:-b.force;
 return {x,y};
}
