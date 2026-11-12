// Tile ids with their 3D kind/model in a level area and column range. Usage: npx tsx tools/visual3d/tiles.ts <level> <area> [col0] [col1]
import {observedLevels} from '../../src/levels.js';
import {kindOf,PIECES} from '../../src/render3d/semantics.js';
const [level,areaId,c0='0',c1='9999']=process.argv.slice(2);
const a:any=observedLevels().find(l=>l.id===level)!.areas.find((a:any)=>a.id===areaId)!;
const by=new Map<number,string[]>();for(const [c,r,id] of a.tiles)if(c>=+c0&&c<=+c1)(by.get(id)??by.set(id,[]).get(id)!).push(`${c}:${r}`);
for(const [id,cells] of [...by].sort((x,y)=>x[0]-y[0]))console.log(id,kindOf(id),PIECES[id]?.model??'',cells.length,cells.slice(0,12).join(' '));
