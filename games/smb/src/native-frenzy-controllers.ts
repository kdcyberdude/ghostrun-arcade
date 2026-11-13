import layouts from '../data/native-frenzy-controllers.json';
export type NativeFrenzyController={id:number;offset:number;column:number;y:number;yHigh?:number;hardOnly:boolean;x?:number;slot?:number;lost?:boolean};
/** Flagged enemy-data controllers retain their native slot. ID23 can become
 * a frenzy Bullet; ID52 runs WarpZoneObject until its ScrollLock/Y test passes. */
export function nativeFrenzyControllers(level:string,area:string):NativeFrenzyController[]{
 return (layouts.find(l=>l.level===level&&l.area===area)?.records??[]).map(r=>({...r}));
}
export const retainNativeFrenzyController=(timer:number,hasBullet:boolean)=>timer!==0||hasBullet;
/** Entrance reconstruction consumes EnemyDataOffset ($0739) once. An already
 * consumed record is either still a flagged NoRunCode slot, or was converted. */
export function seedNativeFrenzyControllers(records:NativeFrenzyController[],offset:number,slots:ReadonlyArray<{flag:number;id:number;x:number}>){
 for(const record of records){record.slot=undefined;record.lost=undefined;if(record.offset<offset){
  const slot=slots.findIndex(s=>s.flag&&s.id===record.id&&Math.floor(s.x)===record.column);
  if(slot>=0){record.slot=slot;record.x=slots[slot].x;}else record.lost=true;
 }}
}

/** WarpZoneObject clears ScrollLock and erases itself when the source Y bytes AND to0. */
export const nativeWarpZoneRelease=(locked:boolean,y:number,page:number)=>locked&&(y&page)===0;

/** A scene beginning partway through an entrance page has already passed the
 * page's initial ScreenRight. Persistent WarpZone records crossed in that
 * interval remain live; ordinary runtime loading still rejects past columns.
 * A captured native entrance replaces this reconstruction with actual slots. */
export function seedNativePageControllers(records:NativeFrenzyController[],camera:number,origin:number){
 const firstRight=Math.floor((camera+origin)/256)*256+255-origin;
 let slot=0;
 for(const c of records)if(c.id===52&&c.column>=firstRight&&c.column<Math.floor(camera)+255&&slot<5){c.slot=slot++;c.x=c.column;}
}
