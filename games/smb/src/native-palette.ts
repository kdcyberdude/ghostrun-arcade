import {NativeVramBuffer1} from './native-vram-buffer.js';
import {NativeParserClock} from './native-parser-clock.js';
/** GameEngine's UpdScrollVar chooses VRAM buffer2 for area graphics/attributes
 * or RemoveCoin_Axe; palette writes queued in buffer1 wait for the next NMI
 * which selects buffer1. The renderer represents that next picture. */
export class NativePalette extends NativeParserClock {
 constructor(readonly buffer1=new NativeVramBuffer1()){super();}
 draw=0;private lost=-1;get pendingBuffer1(){return this.buffer1.offset>0;}
 reset(scroll=0,task=0,draw=0){Object.assign(this,{scroll,task,draw});this.lost=-1;this.buffer1.clear();this.buffer1.select(false);}
 /** discarded: the NMI that loads Bowser's palette drops buffer1, so a rotation queued that frame never reaches the picture (17a2baf0 1-4 RAM 10408: $06D4 3 -> 4, coin stays $27 until 10416). */
 step(delta:number,rotations:number,removeCoinAxe=false,_writesBuffer1=false,discarded=false){
  const task=this.advance(delta,removeCoinAxe),buffer2=removeCoinAxe||task!==undefined&&[0,1,2,5,6].includes(task);
  if(discarded)this.lost=rotations;else if(!buffer2&&rotations!==this.lost)this.draw=rotations;this.buffer1.select(buffer2);
  return buffer2;
 }
}
