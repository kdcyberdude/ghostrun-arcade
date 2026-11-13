/** Source placed-Lakitu roster overlay, shared by the compiler and runtime. */
export function applyNativeLakitus(levels,records){
 for(const level of levels)for(const area of level.areas){
  const native=records.filter(r=>r.level===level.id&&r.area===area.id);if(!native.length)continue;
  const previous=area.enemies.filter(e=>e.kind==='lakitu');
  const first=area.enemies.findIndex(e=>e.kind==='lakitu'),before=first<0?area.enemies:area.enemies.slice(0,first),after=first<0?[]:area.enemies.slice(first);
  area.enemies=[...before.filter(e=>e.kind!=='lakitu'),...native.map(r=>({...previous.find(e=>e.x===r.x),kind:'lakitu',x:r.x,y:r.y+24,direction:-1,palette:previous.find(e=>e.x===r.x)?.palette??previous[0]?.palette,nativeId:17,nativeColumn:r.x,nativeOffset:r.offset,stopFrenzyX:r.stopFrenzyX,evidence:`Native EnemyData $${r.pointer.toString(16)}+$${r.offset.toString(16)}, bytes ${r.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ')}; ProcessEnemyData/InitLakitu.`})),...after.filter(e=>e.kind!=='lakitu')];
 }
 return levels;
}
