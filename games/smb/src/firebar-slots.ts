import {firebarFlameCenters} from './firebar-motion.js';
import {longFirebarFlameCenters} from './long-firebar-motion.js';
import {nativeFirebarUnits,stepNativeFirebar,type NativeFirebarBytes,type NativeFirebarProfile} from './native-firebar.js';

interface Bar {x:number;y:number;length:number;speed:number}
interface Slot {bar:Bar;bytes:NativeFirebarBytes;previous:NativeFirebarBytes}

/** Native slots: angle RAM 0xa0+s survives reuse; fraction 0x58+s resets.
 * The angle byte is Enemy_Y_Speed: a bar born in a slot a Podoboo left retains that Podoboo's raw speed byte (`slotByte`); ProcFirebar masks it only after an unfrozen spin. The pictured units = (byte&31)*32 + 768
 * (native angle 0 is the remake's 768). A bar leaving its slot hands the byte back (`release`). 2-4 rows 257 and 296, 3-4 row 336. */
export class FirebarSlots {
 private slots:(Slot|undefined)[]=Array(5).fill(undefined);
 private angles:number[];
 private born=new Set<Bar>();
 constructor(private bars:Bar[],initialAngles=Array(5).fill(768),private profiles:NativeFirebarProfile[]=[]){this.angles=[...initialAngles];}
 managed=false;
 initializeNative(bar:Bar,slot:number,bytes:NativeFirebarBytes){this.slots[slot]={bar,bytes:{...bytes},previous:{...bytes}};this.born.add(bar);}
 nativeBytes(bar:Bar){const slot=this.slots.find(s=>s?.bar===bar);return slot?{...slot.bytes}:undefined;}
 /** Enemy slots are shared natively: a slot held by an enemy is not free for a bar, and a bar's slot is not free for an enemy. */
 busy:(slot:number)=>boolean=()=>false;
 slotByte?:(slot:number)=>number;
 release?:(slot:number,byte:number,low?:number)=>void;
 static unitsFromByte(byte:number){return ((byte&31)*32+768)%1024;}
 static byteFromUnits(units:number){return ((units+256)%1024)>>5;}
 /** Castle loop back (KillAllEnemies): every bar leaves its slot; bars at or right of `edge` load again as they come in range. */
 loopBack(edge:number){
  // The loop back runs before the enemies move on that row (4-4 rows 871/1805 -> 1806: angle byte kept, fraction unchanged).
  for(let s=0;s<5;s++){const slot=this.slots[s];if(!slot)continue;if(this.stepped.has(slot))slot.bytes={...slot.previous};this.free(s,slot);}
  for(const bar of this.bars)if(bar.x>=edge)this.born.delete(bar);
 }
 private free(s:number,slot:Slot){this.angles[s]=FirebarSlots.unitsFromByte(slot.bytes.high);this.slots[s]=undefined;this.release?.(s,slot.bytes.high,slot.bytes.low);}
 /** EraseEnemyObject clears occupancy without rewinding the last motor step. */
 eraseAll(){for(let s=0;s<5;s++){const slot=this.slots[s];if(slot)this.free(s,slot);}}
 held(){return new Set(this.slots.flatMap((slot,s)=>slot?[s]:[]));}
 slotOf(bar:Bar){const slot=this.slots.findIndex(s=>s?.bar===bar);return slot<0?undefined:slot;}
 beginFrame(camera?:number){this.stepped.clear();if(camera!==undefined)this.enter(camera);}
 turn(s:number,camera:number,run=true){
  const slot=this.slots[s];if(!slot)return;
  this.advance(slot,camera,run);
  if(this.managed&&(slot.bar.x-4<camera-72||slot.bar.x-4>=camera+328))this.free(s,slot);
  return slot.bar;
 }
 finishFrame(camera:number){this.enter(camera);}

 tracks(bar:Bar){return this.bars.includes(bar);}
 private enter(camera:number){
  if(this.managed)return;
  for(let s=0;s<5;s++){
   const slot=this.slots[s];
   if(slot&&slot.bar.x-4-camera< -72)this.free(s,slot);
  }
  for(const bar of this.bars)if(!this.born.has(bar)&&bar.x-4<camera+308){
   const s=this.slots.findIndex((slot,k)=>!slot&&!this.busy(k));if(s<0)continue;
   const units=this.slotByte?FirebarSlots.unitsFromByte(this.slotByte(s)):this.angles[s];
   const profile=this.profiles.find(p=>p.x===bar.x&&p.y===bar.y),high=this.slotByte?this.slotByte(s):FirebarSlots.byteFromUnits(units);
   this.initializeNative(bar,s,{id:profile?.id??(bar.length===12?31:27),high,low:0,speed:profile?.speed??40,direction:profile?.direction??(bar.speed<0?16:0)});
  }
 }
 private advance(slot:Slot,camera:number,run=true){
  this.stepped.add(slot);slot.previous={...slot.bytes};stepNativeFirebar(slot.bytes,slot.bar.x-4,slot.bar.y-4,camera,run);
 }
 private stepped=new Set<Slot>();

 step(camera:number){
  this.stepped.clear();
  this.enter(camera);
  for(const slot of this.slots)if(slot&&slot.bar.x-4-camera>0&&slot.bar.x-4-camera<256)this.advance(slot,camera);
 }
 /** Newly visible pivots advance on the camera-commit row. */
 cameraEntry(previousCamera:number,camera:number){
  for(const slot of this.slots)if(slot&&slot.bar.x-4-previousCamera>0&&slot.bar.x-4-previousCamera<256&&slot.bar.x-4-camera<=0)slot.bytes={...slot.previous};
  this.enter(camera);
  for(const slot of this.slots)if(slot&&slot.bar.x-4-previousCamera>=256&&slot.bar.x-4-camera<256&&slot.bar.x-4-camera>0)this.advance(slot,camera);
 }
 centers(bar:Bar){
  const slot=this.slots.find(slot=>slot?.bar===bar);
  return slot?(bar.length===12?longFirebarFlameCenters({active:true,units:nativeFirebarUnits(slot.bytes)},bar):firebarFlameCenters({active:true,units:nativeFirebarUnits(slot.bytes)},{x:bar.x,y:bar.y,length:6})):[];
 }
}
