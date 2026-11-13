import {NativeParserClock} from './native-parser-clock.js';
/** GameEngine's UpdScrollVar chooses VRAM buffer2 for area graphics/attributes
 * or RemoveCoin_Axe; palette writes queued in buffer1 wait for the next NMI
 * which selects buffer1. The renderer represents that next picture. */
export class NativePalette extends NativeParserClock {
 draw=0;pendingBuffer1=false;
 reset(scroll=0,task=0,draw=0){Object.assign(this,{scroll,task,draw,pendingBuffer1:false});}
 step(delta:number,rotations:number,removeCoinAxe=false,writesBuffer1=false){
  const task=this.advance(delta,removeCoinAxe),buffer2=removeCoinAxe||task!==undefined&&[0,1,2,5,6].includes(task);
  if(!buffer2){this.draw=rotations;this.pendingBuffer1=false;}else this.pendingBuffer1||=writesBuffer1;
  return buffer2;
 }
}
