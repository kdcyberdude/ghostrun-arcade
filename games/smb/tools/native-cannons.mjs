/** Static cannon table writes decoded from native area data. */
export function applyNativeCannons(levels,records){
 for(const record of records){
  const area=levels.find(l=>l.id===record.level)?.areas.find(a=>a.id===record.area);if(!area)throw Error(`Missing source Cannon area ${record.level}/${record.area}`);
  area.cannons??=[];let cannon=area.cannons.find(c=>c.x===record.column&&c.y===record.y);
  if(!cannon){cannon={x:record.column,y:record.y,native:true,evidence:`Native ROM ${record.label} BulletBillCannon record${record.offset}.`};area.cannons.push(cannon);}
  cannon.nativeColumn=record.column;cannon.nativeOffset=record.offset;
 }
 for(const level of levels)for(const area of level.areas)for(const cannon of area.cannons??[])if(cannon.native&&!records.some(r=>r.level===level.id&&r.area===area.id&&r.column===cannon.x&&r.y===cannon.y))throw Error(`Cannon missing source record ${level.id}/${area.id} at ${cannon.x},${cannon.y}`);
}
