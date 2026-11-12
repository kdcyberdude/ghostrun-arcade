/** Native UpdScrollVar / AreaParserTaskHandler state: task $071f, ScrollThirtyTwo $073d.
 * The enemy-loader guard reads `blocked` BEFORE the current frame's clock advance. Call advance at the
 * end of a native GameEngine pass, after ScrollHandler and VRAM writes. `actualScroll` is the scroll
 * added to $073d, not a camera-page teleport; `vramBusy` means address controller $0773 is already 6.
 * Buffer1 block writes do not block this clock. RemoveCoin_Axe writes buffer2 and does.
 * The return value is the AreaParserTasks jump-table index performed this frame (7/3 parse a column,
 * 6/5/2/1 render graphics, 4/0 increment the column; index0 also finishes the attribute table). */
export class NativeParserClock{
 constructor(public task=0,public scroll=0){}
 get blocked(){return (this.task&7)===7;}
 advance(actualScroll:number,vramBusy:boolean):number|undefined{
  this.scroll=(this.scroll+actualScroll)&255;
  if(vramBusy)return;
  if(this.task===0){
   // Native CMP #$20 / BMI checks the subtraction's sign bit, not an unsigned >= comparison.
   if((this.scroll-0x20)&0x80)return;
   this.scroll=(this.scroll-0x20)&255;this.task=8;
  }
  return --this.task;
 }
}
