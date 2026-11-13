/** Static Jumpspring declarations decoded from native area data. */
export function applyNativeSprings(levels,records){
 for(const level of levels)for(const area of level.areas)for(const spring of area.springs??[]){delete spring.nativeColumn;delete spring.nativeOffset;}
 for(const record of records){
  const area=levels.find(l=>l.id===record.level)?.areas.find(a=>a.id===record.area),spring=area?.springs?.find(s=>s.x===record.column&&s.y===record.y);
  if(!spring)throw Error(`Missing source Spring ${record.level}/${record.area} at ${record.column},${record.y}`);
  spring.nativeColumn=record.column;spring.nativeOffset=record.offset;
 }
}
