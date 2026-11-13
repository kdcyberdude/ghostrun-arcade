/** ROM RowOfCoins projection. Static native area origins are applied once; recorded pickups do not define geometry. */
import data from '../data/native-water-coins.json';
import {nativeAreaBindings} from './native-area-catalog.js';
import type {Level,Tile} from './types.js';
export function applyNativeWaterCoins(levels:Level[]):Level[]{
 return levels.map(level=>{const {bindings}=nativeAreaBindings(level);return {...level,areas:level.areas.map(area=>{
  if(area.theme!=='water')return area;
  const binding=bindings.find(b=>b.area===area.id),stream=binding?data.streams[String(binding.data) as keyof typeof data.streams]:undefined;
  if(!binding||!stream)return area;
  const coins:Tile[]=stream.coins.flatMap(c=>Array.from({length:c.length},(_,i)=>[c.column+i+binding.offset/16,c.row,c.id] as Tile));
  const occupied=new Set(coins.map(t=>`${t[0]},${t[1]}`));
  return {...area,tiles:[...area.tiles.filter(t=>t[2]!==194&&t[2]!==195&&!occupied.has(`${t[0]},${t[1]}`)),...coins]};
 })};});
}
