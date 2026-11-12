/** GameEngine's UpdScrollVar chooses VRAM buffer2 for area graphics/attributes
 * or RemoveCoin_Axe; palette writes queued in buffer1 wait for the next NMI
 * which selects buffer1. The renderer represents that next picture. */
export class NativePalette {
 task=0;scroll=0;draw=0;
 reset(scroll=0,task=0,draw=0){Object.assign(this,{scroll,task,draw});}
 step(delta:number,rotations:number,removeCoinAxe=false){
  this.scroll+=delta;
  let buffer2=removeCoinAxe;
  if(!buffer2){
   if(!this.task&&this.scroll>=32){this.scroll-=32;this.task=8;}
   if(this.task){this.task--;buffer2=[0,1,2,5,6].includes(this.task);}
  }
  if(!buffer2)this.draw=rotations;
  return buffer2;
 }
}
