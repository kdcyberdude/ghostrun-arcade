/** Native VerticalPipe creates a Piranha from the ROM object column/row, independent of an observed sighting. */
import data from '../data/native-piranhas.json';
import type {Level,EnemySpec} from './types';
export function applyNativePiranhas(levels:Level[]):Level[]{
 return levels.map(level=>({...level,areas:level.areas.map(area=>{
  const native=data.areas.find(a=>a.level===level.id&&a.area===area.id);if(!native)return area;
  const previous=area.enemies.filter(e=>e.kind==='piranha');
  const plants:EnemySpec[]=native.plants.map(p=>({...previous.find(e=>e.x===p.x),kind:'piranha',x:p.x,y:p.y+24,direction:-1,palette:previous.find(e=>e.x===p.x)?.palette??previous[0]?.palette??'0f-1a-30-27',evidence:`Native VerticalPipe ROM $${p.pointer.toString(16)}+$${p.offset.toString(16)}, bytes ${p.bytes.map(b=>b.toString(16).padStart(2,'0')).join(' ')}; InitPiranhaPlant down=row*16+32.`}));
  return {...area,enemies:[...area.enemies.filter(e=>e.kind!=='piranha'),...plants]};
 })}));
}
