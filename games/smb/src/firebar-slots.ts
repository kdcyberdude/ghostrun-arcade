import {firebarFlameCenters} from './firebar-motion.js';
import {longFirebarFlameCenters} from './long-firebar-motion.js';

interface Bar {x:number;y:number;length:number;speed:number}
interface Slot {bar:Bar;units:number;previousUnits:number}

/** Native slots: angle RAM 0xa0+s survives reuse; fraction 0x58+s resets.
 * The angle byte is Enemy_Y_Speed: a bar born in a slot a Podoboo left starts at that Podoboo's speed byte (`slotByte`), masked to 5 bits; units = byte*32 + 768
 * (native angle 0 is the remake's 768). A bar leaving its slot hands the byte back (`release`). 2-4 rows 257 and 296, 3-4 row 336. */
export class FirebarSlots {
 private slots:(Slot|undefined)[]=Array(5).fill(undefined);
 private angles:number[];
 private born=new Set<Bar>();
 constructor(private bars:Bar[],initialAngles=Array(5).fill(768)){this.angles=[...initialAngles];}
 /** Enemy slots are shared natively: a slot held by an enemy is not free for a bar, and a bar's slot is not free for an enemy. */
 busy:(slot:number)=>boolean=()=>false;
 slotByte?:(slot:number)=>number;
 release?:(slot:number,byte:number)=>void;
 static unitsFromByte(byte:number){return ((byte&31)*32+768)%1024;}
 static byteFromUnits(units:number){return ((units+256)%1024)>>5;}
 /** Castle loop back (KillAllEnemies): every bar leaves its slot; bars at or right of `edge` load again as they come in range. */
 loopBack(edge:number){
  // The loop back runs before the enemies move on that row (4-4 rows 871/1805 -> 1806: angle byte kept, fraction unchanged).
  for(let s=0;s<5;s++){const slot=this.slots[s];if(!slot)continue;if(this.stepped.has(slot))slot.units=slot.previousUnits;this.free(s,slot);}
  for(const bar of this.bars)if(bar.x>=edge)this.born.delete(bar);
 }
 private free(s:number,slot:Slot){this.angles[s]=Math.floor(slot.units/32)*32;this.slots[s]=undefined;this.release?.(s,FirebarSlots.byteFromUnits(this.angles[s]));}
 held(){return new Set(this.slots.flatMap((slot,s)=>slot?[s]:[]));}
 tracks(bar:Bar){return this.bars.includes(bar);}
 private enter(camera:number){
  for(let s=0;s<5;s++){
   const slot=this.slots[s];
   if(slot&&slot.bar.x-4-camera< -73)this.free(s,slot);
  }
  for(const bar of this.bars)if(!this.born.has(bar)&&bar.x-4<camera+308){
   const s=this.slots.findIndex((slot,k)=>!slot&&!this.busy(k));if(s<0)continue;
   const units=this.slotByte?FirebarSlots.unitsFromByte(this.slotByte(s)):this.angles[s];
   this.slots[s]={bar,units,previousUnits:units};this.born.add(bar);
  }
 }
 private advance(slot:Slot){
  this.stepped.add(slot);slot.previousUnits=slot.units;slot.units=(slot.units+Math.sign(slot.bar.speed)*5+1024)%1024;
  // The observed5-4 long arm omits horizontal raw angles8/24.
  if(slot.bar.length===12&&Math.floor(slot.units/32)%16===0)slot.units=(slot.units+32)%1024;
 }
 private stepped=new Set<Slot>();

 step(camera:number){
  this.stepped.clear();
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
