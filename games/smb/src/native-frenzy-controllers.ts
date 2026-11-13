import layouts from '../data/native-frenzy-controllers.json';
export type NativeFrenzyController={id:number;offset:number;column:number;y:number;hardOnly:boolean;x?:number;slot?:number;lost?:boolean};
/** These flagged enemy-data records have NoRunCode, so they retain their slot
 * until area reset. If initialization can fire, the slot becomes a Bullet instead. */
export function nativeFrenzyControllers(level:string,area:string):NativeFrenzyController[]{
 return (layouts.find(l=>l.level===level&&l.area===area)?.records??[]).map(r=>({...r}));
}
export const retainNativeFrenzyController=(timer:number,hasBullet:boolean)=>timer!==0||hasBullet;
/** Entrance reconstruction consumes EnemyDataOffset ($0739) once. An already
 * consumed record is either still a flagged NoRunCode slot, or was converted. */
export function seedNativeFrenzyControllers(records:NativeFrenzyController[],offset:number,slots:ReadonlyArray<{flag:number;id:number;x:number}>){
 for(const record of records)if(record.offset<offset){
  const slot=slots.findIndex(s=>s.flag&&s.id===record.id&&Math.floor(s.x)===record.column);
  if(slot>=0){record.slot=slot;record.x=slots[slot].x;}else record.lost=true;
 }
}
