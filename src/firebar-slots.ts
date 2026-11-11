import {firebarFlameCenters} from './firebar-motion.js';
import {longFirebarFlameCenters} from './long-firebar-motion.js';

interface Bar {x:number;y:number;length:number;speed:number}
interface Slot {bar:Bar;units:number;previousUnits:number}

/** Native slots: angle RAM 0xa0+s survives reuse; fraction 0x58+s resets.
 * Callers restrict the bars to prefixes whose allocation order was measured. */
export class FirebarSlots {
 private slots:(Slot|undefined)[]=Array(5).fill(undefined);
 private angles:number[];
 private born=new Set<Bar>();
 constructor(private bars:Bar[],initialAngles=Array(5).fill(768)){this.angles=[...initialAngles];}
 tracks(bar:Bar){return this.bars.includes(bar);}
 private enter(camera:number){
  for(let s=0;s<5;s++){
   const slot=this.slots[s];
   if(slot&&slot.bar.x-4-camera< -73){this.angles[s]=Math.floor(slot.units/32)*32;this.slots[s]=undefined;}
  }
  for(const bar of this.bars)if(!this.born.has(bar)&&bar.x-4<camera+308){
   const s=this.slots.findIndex(slot=>!slot);if(s<0)continue;
   this.slots[s]={bar,units:this.angles[s],previousUnits:this.angles[s]};this.born.add(bar);
  }
 }
 private advance(slot:Slot){
  slot.previousUnits=slot.units;slot.units=(slot.units+Math.sign(slot.bar.speed)*5+1024)%1024;
  // The observed5-4 long arm omits horizontal raw angles8/24.
  if(slot.bar.length===12&&Math.floor(slot.units/32)%16===0)slot.units=(slot.units+32)%1024;
 }
 step(camera:number){
  this.enter(camera);
  for(const slot of this.slots)if(slot&&slot.bar.x-4-camera>0&&slot.bar.x-4-camera<256)this.advance(slot);
 }
 /** Newly visible pivots advance on the camera-commit row. */
 cameraEntry(previousCamera:number,camera:number){
  for(const slot of this.slots)if(slot&&slot.bar.x-4-previousCamera>0&&slot.bar.x-4-previousCamera<256&&slot.bar.x-4-camera<=0)slot.units=slot.previousUnits;
  this.enter(camera);
  for(const slot of this.slots)if(slot&&slot.bar.x-4-previousCamera>=256&&slot.bar.x-4-camera<256&&slot.bar.x-4-camera>0)this.advance(slot);
 }
 centers(bar:Bar){
  const slot=this.slots.find(slot=>slot?.bar===bar);
  return slot?(bar.length===12?longFirebarFlameCenters({active:true,units:slot.units},bar):firebarFlameCenters({active:true,units:slot.units},{x:bar.x,y:bar.y,length:6})):[];
 }
}
