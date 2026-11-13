import {nativeEnemyStream} from './native-enemy-stream.mjs';
/** Preserve every raw-source Blooper, including hard-only candidates. Runtime
 * ProcessEnemyData decides when to skip or load each source offset. */
export function applyNativeWaterStreams(levels,data){
 for(const source of data.streams)for(const binding of source.areas){
  const area=levels.find(l=>l.id===binding.level)?.areas.find(a=>a.id===binding.area);
  if(!area)throw Error(`Missing native water stream area ${binding.level}/${binding.area}`);
  area.enemies=area.enemies.filter(e=>e.kind!=='blooper'&&!(e.kind==='cheep'&&e.swim));
  for(const o of nativeEnemyStream(source.bytes,true).filter(o=>o.id===7))area.enemies.push({kind:'blooper',x:o.x,y:o.y+24,direction:-1,palette:'0f-0f-30-10',stroke:{first:0,firstDir:-1},nativeWaterOffset:o.offset,nativeSlot:'wait',evidence:`Native E_WaterArea2 CPU $${source.pointer.toString(16)} stream offset ${o.offset}; raw hard-mode/order cursor.`});
 }
}
