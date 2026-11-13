/** Native level map vs the remake's area tiles. The NES keeps the playfield's metatiles in a 32-column block buffer ($0500-$069F: two
 * 16-column pages of 13 rows, row 0 = screen y 32, so remake row = native row + 2) and writes one column ahead of the camera as the level
 * scrolls; the column pointer is page $0725 / column $0726 (absolute column = page*16+column, the next column to be written). Each column is
 * read from RAM on the frame its pointer passes it, so later coin pickups or bumped blocks do not show. The block buffer stores a metatile
 * only from the collision bound of its palette quarter up ($10, $51, $88, $C0: BlockBuffLowBounds); lower ids (hills, bushes, clouds, castle
 * bricks, lava, water) are stored as 0, so for them only "nothing collidable here" is checked. Remake tile ids are the native metatile ids.
 *   npx tsx tools/harness/native-level-map.ts --traces DIR [--levels 8-4,4-3] [--write evidence/native-level-map.json] [--quiet]
 * DIR/<level>/ram.bin (2048 bytes per frame) come from ghostrun-lab scripts/recording/native_ram_trace.py. A run is split into visits
 * (area data pointer $E7/$E8 changes, or the column pointer jumps back: pipes within an area, castle loops); each visit is matched to the
 * remake area and column offset of that level with the most equal cells. --write stores every reconstructed column (gzip+base64) with its
 * matched area/offset, checked by tests/native-level-map.test.ts. Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseArgs} from 'node:util';
import {observedLevels} from '../../src/levels.js';
import {solid} from '../../src/simulation.js';
import type {Area,Level,TilePiece} from '../../src/types.js';

export const ROWS=13,ROW0=2;
const BOUNDS=[0x10,0x51,0x88,0xc0];
/** What the native block buffer holds for a metatile id. */
export const bufferValue=(id:number)=>id>=BOUNDS[id>>6]?id:0;
export type Visit={area:string,offset:number,from:number,cols:number[][]};
export type MapEvidence={schema:'native-level-map-v1',method:string,levels:Record<string,{frames:number,visits:(Omit<Visit,'cols'>&{count:number,data:string})[]}>};
export type Mismatch={level:string,area:string,col:number,row:number,native:number,remake:number,free?:string};

/** Columns seen along one native run, split into visits, each with its first-seen columns (absolute native column -> 13 rows). */
export function reconstruct(ram:Uint8Array,level:string){
 const frames=ram.length/2048,visits:{ptr:number,frame:number,cols:Map<number,number[]>}[]=[];
 let visit:(typeof visits)[number]|undefined,prevPtr=-1,prevP=-1,n=0;
 const column=(o:number,c:number)=>Array.from({length:ROWS},(_,k)=>ram[o+0x500+((c>>4)&1)*0xd0+k*16+(c&15)]);
 for(let f=0;f<frames;f++,n++){
  const o=f*2048;if(ram[o+0x770]!==1||`${ram[o+0x75f]+1}-${ram[o+0x75c]+1}`!==level)break;
  const ptr=ram[o+0xe8]*256+ram[o+0xe7],P=ram[o+0x725]*16+ram[o+0x726];
  if(!visit||ptr!==prevPtr||P<prevP||P>prevP+2){ // an area load, castle loop or respawn page jump: its columns are drawn (two per frame) after the jump
   visit={ptr,frame:f,cols:new Map()};visits.push(visit);
   if(f===0)for(let c=Math.max(0,P-24);c<P;c++)visit.cols.set(c,column(o,c)); // a level entrance starts with its first columns drawn
  }else for(let c=prevP;c<P;c++)if(!visit.cols.has(c))visit.cols.set(c,column(o,c));
  prevPtr=ptr;prevP=P;
 }
 return {frames:n,visits:visits.filter(v=>v.cols.size)};
}

/** Native jumpsprings are metatiles $67/$68 in the block buffer; the remake keeps them as spring objects (area.springs, wall and landing rules
 * in the simulation), so those two cells match the spring instead of a grid tile. */
export const springCells=(area:Area)=>new Set((area.springs??[]).flatMap(s=>[`${s.x/16},${Math.floor((s.y-24)/16)}`,`${s.x/16},${Math.floor((s.y-24)/16)+1}`]));
export const isSpringCell=(springs:Set<string>,key:string,native:number)=>(native===103||native===104)&&springs.has(key);

export function areaGrid(area:Area){
 const grid=new Map<string,number>(area.tiles.map(([c,r,id])=>[`${c},${r}`,id]));
 const free=new Map<string,string>();
 for(const [kind,list] of [['free',area.freeTiles],['decoration',area.decorations]] as const)for(const p of list??[]){
  const key=`${Math.round(p.x/16)},${Math.round(p.y/16)}`;free.set(key,`${free.has(key)?free.get(key)+' ':''}${kind}:${p.id}@${p.x},${p.y}`);}
 for(const r of area.solidRects??[])for(let x=r.x;x<r.x+r.width;x+=8)for(let y=r.y;y<r.y+r.height;y+=8){const key=`${Math.floor(x/16)},${Math.floor(y/16)}`;
  if(!free.get(key)?.includes(`rect:${r.id}`))free.set(key,`${free.has(key)?free.get(key)+' ':''}rect:${r.id}@${r.x},${r.y},${r.width}x${r.height}`);}
 return {grid,free};
}

export function compareVisit(level:string,area:Area,offset:number,from:number,cols:number[][]):Mismatch[]{
 const {grid,free}=areaGrid(area),springs=springCells(area),out:Mismatch[]=[];
 cols.forEach((col,i)=>{const c=from+i+offset;if(c<0||c*16>=area.width)return;
  col.forEach((native,r)=>{const remake=grid.get(`${c},${r+ROW0}`)??0;
   if(bufferValue(remake)!==native&&!isSpringCell(springs,`${c},${r+ROW0}`,native)){const f=free.get(`${c},${r+ROW0}`);out.push({level,area:area.id,col:c,row:r+ROW0,native,remake,...(f?{free:f}:{})});}});});
 return out;
}

/** Equal non-empty cells minus differing cells; columns outside the area are not counted. */
function score(area:Area,grid:Map<string,number>,offset:number,from:number,cols:number[][]){
 let s=0;
 cols.forEach((col,i)=>{const c=from+i+offset;if(c<0||c*16>=area.width)return;
  col.forEach((v,r)=>{const m=bufferValue(grid.get(`${c},${r+ROW0}`)??0);if(m!==v)s--;else if(v)s++;});});
 return s;
}

/** Match each visit to the remake area/offset with the best score (ties: offset 0, then the level's first area). */
export function matchVisits(level:Level,visits:{cols:Map<number,number[]>}[]):Visit[]{
 return visits.map(v=>{
  const keys=[...v.cols.keys()].sort((a,b)=>a-b),from=keys[0],cols=keys.map(k=>v.cols.get(k)!);
  if(keys.at(-1)!-from+1!==keys.length)throw Error(`${level.id}: visit columns not contiguous`);
  let best={area:level.areas[0].id,offset:0,s:-Infinity};
  for(const area of level.areas){const grid=areaGrid(area).grid;for(const p of [...area.freeTiles??[],...area.decorations??[]]){const k=`${Math.round(p.x/16)},${Math.round(p.y/16)}`;if(!grid.has(k))grid.set(k,p.id);}
   for(const offset of [0,...Array.from({length:Math.ceil(area.width/16)+from},(_,i)=>i-from).filter(o=>o!==0)]){
    const s=score(area,grid,offset,from,cols);if(s>best.s)best={area:area.id,offset,s};}}
  return {area:best.area,offset:best.offset,from,cols};
 });
}

const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64'),unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
export function evidenceVisits(e:MapEvidence['levels'][string]):Visit[]{
 return e.visits.map(v=>{const b=unpack(v.data);return {area:v.area,offset:v.offset,from:v.from,cols:Array.from({length:v.count},(_,i)=>Array.from(b.subarray(i*ROWS,(i+1)*ROWS)))};});
}
export function mismatches(levels:Level[],level:string,visits:Visit[]){
 const l=levels.find(x=>x.id===level)!,seen=new Set<string>(),out:Mismatch[]=[];
 for(const v of visits)for(const m of compareVisit(level,l.areas.find(a=>a.id===v.area)!,v.offset,v.from,v.cols)){
  const k=`${m.area},${m.col},${m.row}`;if(!seen.has(k)){seen.add(k);out.push(m);}}
 return out;
}

/** Seen native cells of every remake area of a level: "col,row" (remake coordinates) -> buffer value, first visit wins. */
export function seenCells(visits:Visit[]){
 const out=new Map<string,{cols:Set<number>,cells:Map<string,number>}>();
 for(const v of visits){if(!out.has(v.area))out.set(v.area,{cols:new Set(),cells:new Map()});const a=out.get(v.area)!;
  v.cols.forEach((col,i)=>{const c=v.from+i+v.offset;if(c<0)return;a.cols.add(c);col.forEach((n,r)=>{const k=`${c},${r+ROW0}`;if(!a.cells.has(k))a.cells.set(k,n);});});}
 return out;
}

/** Rewrite an area from the native cells: every seen cell takes the native metatile; free pieces/rectangles that stood in for collidable
 * metatiles of seen columns are dropped, the rest snapped to the 16-px metatile grid; 8x8 pattern overrides over native metatiles are dropped. */
export function applyNative(area:Area,seen:{cols:Set<number>,cells:Map<string,number>}){
 const width=Math.ceil(area.width/16),inArea=(c:number)=>c>=0&&c<width;
 const tiles=new Map(area.tiles.map(([c,r,id])=>[`${c},${r}`,id])),springs=springCells(area);
 for(const [k,n] of seen.cells){const [c]=k.split(',').map(Number);if(!inArea(c)||isSpringCell(springs,k,n))continue;const m=tiles.get(k)??0;
  if(bufferValue(m)===n)continue;
  if(n)tiles.set(k,n);
  else if(m===37)tiles.set(k,64); // lift/pulley ropes: native $40 (same pattern as the flagpole $25, below the collision bound)
  else tiles.delete(k);
 }
 const kept=area.tiles.filter(([c,r])=>tiles.has(`${c},${r}`)).map(([c,r])=>[c,r,tiles.get(`${c},${r}`)!] as [number,number,number]),old=new Set(area.tiles.map(([c,r])=>`${c},${r}`));
 area.tiles=[...kept,...[...tiles].filter(([k])=>!old.has(k)).map(([k,id])=>[...k.split(',').map(Number),id] as [number,number,number]).sort((a,b)=>a[0]-b[0]||a[1]-b[1])];
 const covered=(p:{x:number,y:number,id:number})=>{const c=Math.round(p.x/16),r=Math.round(p.y/16);return seen.cols.has(c)&&bufferValue(p.id)!==0&&r>=ROW0&&!springs.has(`${c},${r}`);};
 const snap=<T extends {x:number,y:number,id:number}>(list:T[]|undefined)=>{if(!list)return list;const out=new Map<string,T>();
  for(const p of list){if(covered(p))continue;const q={...p,x:Math.round(p.x/16)*16,y:Math.round(p.y/16)*16};const k=`${q.x},${q.y},${q.id},${'palette'in q?q.palette:''}`;out.delete(k);out.set(k,q);}
  return [...out.values()];};
 area.freeTiles=snap(area.freeTiles);area.decorations=snap(area.decorations);area.hiddenFreeTiles=snap(area.hiddenFreeTiles);
 if(area.hiddenFreeTiles&&!area.hiddenFreeTiles.length)delete area.hiddenFreeTiles;
 // A free piece below the collision bound, alone in its cell and drawn in the area palette, is an ordinary background metatile: it moves to the grid.
 // Clouds (128-133) stay pieces: the simulation shifts them on pipe returns (returnCloudOffsetX).
 const cellOf=(p:{x:number,y:number})=>`${p.x/16},${p.y/16}`,count=new Map<string,number>(),occupied=new Set(area.tiles.map(([c,r])=>`${c},${r}`));
 for(const p of [...area.freeTiles??[],...area.decorations??[]])count.set(cellOf(p),(count.get(cellOf(p))??0)+1);
 const toGrid=(p:TilePiece&{aboveFreeTiles?:boolean})=>bufferValue(p.id)===0&&!(p.id>=128&&p.id<=133)&&!p.interactive&&!p.aboveFreeTiles&&p.palette===area.palette&&count.get(cellOf(p))===1
  &&!occupied.has(cellOf(p))&&!area.hiddenFreeTiles?.some(h=>h.x===p.x&&h.y===p.y&&h.id===p.id);
 for(const list of [area.freeTiles,area.decorations])for(const p of list??[])if(toGrid(p))area.tiles.push([p.x/16,p.y/16,p.id]);
 area.freeTiles=area.freeTiles?.filter(p=>!toGrid(p));area.decorations=area.decorations?.filter(p=>!toGrid(p));
 // A rectangle goes when the grid now holds all it covered: every column seen and no cell a native metatile the simulation does not treat
 // as solid (4-2's side-pipe mouth $1C/$1F keeps its wall rectangle).
 area.solidRects=area.solidRects?.filter(r=>{for(let x=r.x;x<r.x+r.width;x+=8)for(let y=r.y;y<r.y+r.height;y+=8){const c=Math.floor(x/16),n=seen.cells.get(`${c},${Math.floor(y/16)}`)??0;
  if(!seen.cols.has(c)||n&&!solid(n))return true;}return false;});
 area.patternOverrides=area.patternOverrides?.filter(([x,y])=>!(seen.cells.get(`${Math.floor(x/2)},${Math.floor(y/2)}`)));
}

/** Cells below the collision bound (stored as 0 natively) that native pictures show and the extracted maps lost (tools/harness/native-pixels.ts,
 * lag 1, scroll-aligned): [level, area, col, row, id] added, and 8x8 pattern overrides [level, area, x8, y8, pattern] removed. */
export const PICTURE_CELLS:[string,string,number,number,number][]=[
 // 8-4 lap 1: lava under the pit the block buffer has empty at columns 66-74 (native frame 540: lava surface row 13, lava row 14)
 ...[66,67,68,69,70,71,72,73,74].flatMap(c=>[['8-4','main',c,13,134],['8-4','main',c,14,135]] as [string,string,number,number,number][]),
 // tree stems with a missing cell: 4-3 columns 21 and 71 row 9 ($50), 5-3 columns 61, 71, 105 row 11 ($4C)
 ['4-3','main',21,9,80],['4-3','main',71,9,80],['5-3','main',61,11,76],['5-3','main',71,11,76],['5-3','main',105,11,76]];
export const PICTURE_OVERRIDE_REMOVALS:{level:string,area:string,y8:number,pattern:number,why:string}[]=[
 {level:'5-3',area:'main',y8:22,pattern:82,why:'stem pattern 82 from a 0f-07-17-0f sheet over stem cells: drew the lower half as sky (5-3 frame 420)'}];
export function applyPictureFixes(levels:Level[]){
 for(const [l,a,c,r,id] of PICTURE_CELLS){const area=levels.find(x=>x.id===l)!.areas.find(x=>x.id===a)!,t=area.tiles.find(([x,y])=>x===c&&y===r);if(t)t[2]=id;else area.tiles.push([c,r,id]);}
 for(const o of PICTURE_OVERRIDE_REMOVALS){const area=levels.find(x=>x.id===o.level)!.areas.find(x=>x.id===o.area)!;
  area.patternOverrides=area.patternOverrides?.filter(([,y,p])=>!(y===o.y8&&p===o.pattern));}
}

if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},evidence:{type:'string',default:'evidence/native-level-map.json'},levels:{type:'string'},write:{type:'string'},apply:{type:'boolean',default:false},quiet:{type:'boolean',default:false}}});
 const levels=observedLevels(),ids=a.levels?.split(',')??levels.map(l=>l.id);
 const stored:MapEvidence|undefined=a.traces?undefined:JSON.parse(fs.readFileSync(a.evidence!,'utf8'));
 const evidence:MapEvidence={schema:'native-level-map-v1',method:'block buffer $0500-$069F column read on the frame the column pointer ($0725*16+$0726) passes it; visits matched to remake area/offset by tools/harness/native-level-map.ts',levels:{}};
 let total=0;
 for(const id of ids){
  const level=levels.find(l=>l.id===id)!;let frames:number,matched:Visit[];
  if(stored){frames=stored.levels[id].frames;matched=evidenceVisits(stored.levels[id]);}
  else{const r=reconstruct(new Uint8Array(fs.readFileSync(path.join(a.traces!,id,'ram.bin'))),id);frames=r.frames;matched=matchVisits(level,r.visits);}
  if(a.apply){const seen=seenCells(matched);for(const area of level.areas)applyNative(area,seen.get(area.id)??{cols:new Set(),cells:new Map()});}
  const ms=mismatches(levels,id,matched);total+=ms.length;
  console.log(`${id} frames=${frames} visits=${matched.map(v=>`${v.area}${v.offset?`${v.offset>0?'+':''}${v.offset}`:''}[${v.from}..${v.from+v.cols.length-1}]`).join(' ')} mismatches=${ms.length}`);
  if(!a.quiet)for(const m of ms)console.log(`  ${m.area} col ${m.col} row ${m.row}: native ${m.native} remake ${m.remake}${m.free?` (${m.free})`:''}`);
  const packed=matched.map(v=>({area:v.area,offset:v.offset,from:v.from,count:v.cols.length,data:pack(Uint8Array.from(v.cols.flat()))}));
  evidence.levels[id]={frames,visits:packed.filter((v,i)=>packed.findIndex(w=>JSON.stringify(w)===JSON.stringify(v))===i)}; // repeated castle-loop visits once
 }
 if(a.apply)applyPictureFixes(levels);
 console.log(`total mismatches ${total}`);
 if(a.write)fs.writeFileSync(a.write,JSON.stringify(evidence)+'\n');
 if(a.apply)fs.writeFileSync('data/levels.json',JSON.stringify(levels,null,2)+'\n');
}
