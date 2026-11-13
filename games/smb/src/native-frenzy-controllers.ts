import layouts from '../data/native-frenzy-controllers.json';
export type NativeFrenzyController={id:number;offset:number;column:number;y:number;hardOnly:boolean;x?:number;slot?:number;lost?:boolean};
/** Flagged enemy-data controllers retain their native slot. ID23 can become
 * a frenzy Bullet; ID52 runs WarpZoneObject until its ScrollLock/Y test passes. */
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

/** WarpZoneObject clears ScrollLock and erases itself when the source Y bytes AND to0. */
export const nativeWarpZoneRelease=(locked:boolean,y:number,page:number)=>locked&&(y&page)===0;
