import {NativeVramBuffer1} from './native-vram-buffer.js';
import {NativeParserClock} from './native-parser-clock.js';
/** GameEngine's UpdScrollVar chooses VRAM buffer2 for area graphics/attributes
 * or RemoveCoin_Axe; palette writes queued in buffer1 wait for the next NMI
 * which selects buffer1. The renderer represents that next picture. */
export class NativePalette extends NativeParserClock {
 constructor(readonly buffer1=new NativeVramBuffer1()){super();}
 draw=0;get pendingBuffer1(){return this.buffer1.offset>0;}
 reset(scroll=0,task=0,draw=0){Object.assign(this,{scroll,task,draw});this.buffer1.clear();this.buffer1.select(false);}
 step(delta:number,rotations:number,removeCoinAxe=false,_writesBuffer1=false){
  const task=this.advance(delta,removeCoinAxe),buffer2=removeCoinAxe||task!==undefined&&[0,1,2,5,6].includes(task);
  if(!buffer2)this.draw=rotations;this.buffer1.select(buffer2);
  return buffer2;
 }
}
