/** Native RAM0x71f: each32px scroll crossing builds two16px columns in8 rows.
 * Plants in the first column are made on task7, the second on task3.
 * Their centers are block+352+8 and block+352+16+8; the load already built its pair. */
export class PiranhaColumns {
 private block:number;
 remaining=0;
 through:number;
 constructor(camera:number){this.block=Math.floor(camera/32);this.through=this.block*32+376;}
 step(camera:number){
  if(this.remaining>0){
   this.remaining--;
   if(this.remaining===3)this.through=this.block*32+376;
  }else if(Math.floor(camera/32)>this.block){
   this.block=Math.floor(camera/32);this.remaining=7;this.through=this.block*32+360;
  }
 }
}
