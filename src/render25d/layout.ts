// Static per-area layout derived once from the area's tile list (area.tiles): scenery clusters become whole 3D objects, the castle and the flagpole become single structures.
import type {Area} from '../types.js';
import {kindIn,type Kind} from './semantics.js';
export interface Cluster{kind:'hill'|'bush'|'cloud'|'tree';col0:number;row0:number;col1:number;row1:number;ids:number[]}
export interface Layout{clusters:Cluster[];castle?:{col0:number;row0:number;col1:number;row1:number};pole?:{col:number;rowTop:number;rowBottom:number}}
export function analyseArea(area:Area):Layout{
 const grid=new Map<string,number>();for(const [c,r,id] of area.tiles)grid.set(`${c},${r}`,id);
 const clusters:Cluster[]=[],seen=new Set<string>();
 const kindOf=(id:number)=>kindIn(id,area.theme);
 const family=(id:number|undefined):Kind|undefined=>id===undefined?undefined:kindOf(id);
 for(const [c,r,id] of area.tiles){
  const kind=kindOf(id);if(kind!=='hill'&&kind!=='bush'&&kind!=='cloud'&&kind!=='tree')continue;
  const key=`${c},${r}`;if(seen.has(key))continue;
  const stack=[[c,r]],cluster:Cluster={kind,col0:c,row0:r,col1:c,row1:r,ids:[]};seen.add(key);
  while(stack.length){const [cc,rr]=stack.pop()!;const tid=grid.get(`${cc},${rr}`)!;cluster.ids.push(tid);
   cluster.col0=Math.min(cluster.col0,cc);cluster.col1=Math.max(cluster.col1,cc);cluster.row0=Math.min(cluster.row0,rr);cluster.row1=Math.max(cluster.row1,rr);
   for(let dc=-1;dc<=1;dc++)for(let dr=-1;dr<=1;dr++){const k=`${cc+dc},${rr+dr}`;if(seen.has(k))continue;if(family(grid.get(k))!==kind)continue;seen.add(k);stack.push([cc+dc,rr+dr]);}}
  clusters.push(cluster);
 }
 const layout:Layout={clusters};
 let castle:Layout['castle'];
 for(const [c,r,id] of area.tiles)if(kindOf(id)==='castle'){castle=castle?{col0:Math.min(castle.col0,c),row0:Math.min(castle.row0,r),col1:Math.max(castle.col1,c),row1:Math.max(castle.row1,r)}:{col0:c,row0:r,col1:c,row1:r};}
 layout.castle=castle;
 let pole:Layout['pole'];
 const ballCols=new Set(area.tiles.filter(t=>t[2]===36).map(t=>t[0]));
 for(const [c,r,id] of area.tiles){const k=kindOf(id);if((k==='flagBall'||k==='flagPole')&&ballCols.has(c)){pole=pole?{col:c,rowTop:Math.min(pole.rowTop,r),rowBottom:Math.max(pole.rowBottom,r)}:{col:c,rowTop:r,rowBottom:r};}}
 layout.pole=pole;
 return layout;
}
