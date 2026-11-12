// Pure 3D-vs-2D placement comparison (no browser): tested by tests/visual3d-placement.test.ts, fed by placement-page.ts.
// Tiles: per cell, the terrain category the 2D renderer drew vs the categories the 3D world covered. Objects: each sim object's 2D sprite rect vs the
// projected rect of the 3D object of the same family, matched greedily by distance; compared by horizontal centre and bottom (feet), since 3D models are
// not sprite-sized.
import {kindIn} from '../../src/render3d/semantics.js';
export interface Obj{id:string;kind:string;x:number;y:number;w:number;h:number;state?:string}
export interface Cell{col:number;row:number;id:number}
export interface Issue{type:'tile-missing-3d'|'tile-extra-3d'|'tile-overlap-3d'|'object-missing-3d'|'object-extra-3d'|'object-offset'|'object-state';what:string;at:string;dx?:number;dy?:number}
export interface FrameReport{issues:Issue[];counts:{tiles2d:number;tiles3d:number;objects2d:number;objects3d:number}}
/** Offsets above this many NES pixels (centre x or feet y) are reported. */
export const TOLERANCE=6;
/** How far apart a 2D and a 3D object may be and still be the same object. */
const MATCH=28;
const IGNORE_TILE=new Set(['empty','void','hill','bush','cloud','tree','flagBall']);
/** 2D metatile id -> category drawn by the 3D world. */
export function category2d(id:number,theme:string):string|undefined{
 if(id===104)return 'brick';
 if(id===70&&theme==='underground')return undefined;
 const k=kindIn(id,theme);if(IGNORE_TILE.has(k))return undefined;
 if(k==='sidePipe')return 'pipe';if(k==='flagPole'||id===64||id===65)return 'rope';if(k==='piece')return 'piece:'+id;
 return k;
}
/** 3D pool model -> category, and the cells one instance covers (pipes are 2 wide, side pipes 2 tall). */
export function cells3d(name:string,x:number,y:number):{cat:string;cells:[number,number][]}{
 const n=name.replace(/_(ug|castle|water|snow)$/,'');
 const cat=/^block_ground/.test(n)?'ground':n==='block_wall'?'wall':n==='block_brick'?'brick':n==='block_question'?'question':n==='block_used'?'used':n==='block_hard'?'hard':
  /^castle_/.test(n)?'castle':/^pipe_/.test(n)?'pipe':n==='coin_tile'?'coin':n==='rope_v'||n==='rope_h'?'rope':'piece:'+n;
 if(cat==='pipe'){
  if(Number.isInteger(y)){const col=Math.floor(x),row=14-y;return {cat,cells:[[col,row],[col,row+1]]};}  // horizontal piece: rotated, centred between its two rows
  const row=Math.round(14.5-y),c=Math.round(x);return {cat,cells:[[c-1,row],[c,row]]};
 }
 return {cat,cells:[[Math.floor(x),Math.round(14.5-y)]]};
}
/** Piece ids share a category with the model they are drawn with. */
export function pieceModels(map:Record<number,{model:string}>){return (cat:string)=>cat.startsWith('piece:')&&/^\d+$/.test(cat.slice(6))?'piece:'+(map[Number(cat.slice(6))]?.model??cat.slice(6)):cat;}
/** 3D object kind -> family shared with the sim kind (pool names are model names; stand-ins are prefixed e/item). */
export function family(kind:string):string{
 const k=kind.replace(/^e(?=[a-z])/,'').replace(/^item/,'');
 const map:Record<string,string>={spinyEgg:'spiny',koopa_shell:'koopa',redKoopa:'koopa',paratroopa:'koopa',beetle_shell:'beetle',fire_flower:'flower',flower:'flower',one_up:'1up',bowser_flame:'flame',hammer_bro:'hammerBro',player1:'player',player2:'player',lift:'lift',cloud:'cloud'};
 return map[k]??map[kind]??k;
}
/** Objects whose centre is on screen (both renderers draw edge objects partly; perspective widens 3D boxes near the edges). */
const onScreen=(o:Obj)=>{const cx=o.x+o.w/2,cy=o.y+o.h/2;return cx>=12&&cx<244&&cy>=32&&cy<240;};
export function compareFrame(f:{theme:string;camera:number;tiles2d:Cell[];tiles3d:{name:string;x:number;y:number}[];objects2d:Obj[];objects3d:Obj[];pieceModel?:(c:string)=>string}):FrameReport{
 const issues:Issue[]=[],norm=f.pieceModel??((c:string)=>c);
 // Only fully visible columns are compared (both renderers cull differently at the edges).
 const c0=Math.ceil(f.camera/16),c1=Math.floor((f.camera+240)/16),inView=(c:number,r:number)=>c>=c0&&c<=c1&&r>=2&&r<=14;
 const want=new Map<string,Set<string>>(),have=new Map<string,Set<string>>();
 const put=(m:Map<string,Set<string>>,c:number,r:number,cat:string)=>{if(!inView(c,r))return;const k=`${c},${r}`;(m.get(k)??m.set(k,new Set()).get(k)!).add(cat);};
 // Tile 37 under a flag ball is the goal pole (a static structure in 3D), elsewhere the lift rope.
 const poles=new Set(f.tiles2d.filter(t=>t.id===36).map(t=>t.col));
 for(const t of f.tiles2d){const cat=t.id===37&&poles.has(t.col)?undefined:category2d(t.id,f.theme);if(inView(t.col,t.row))want.delete(`${t.col},${t.row}`);if(cat)put(want,t.col,t.row,norm(cat));}
 const instances=new Set<string>();
 for(const t of f.tiles3d){const {cat,cells}=cells3d(t.name,t.x,t.y),key=`${t.name}:${t.x},${t.y}`;
  if(instances.has(key)&&cells.some(([c,r])=>inView(c,r)))issues.push({type:'tile-overlap-3d',what:t.name,at:cells[0].join(',')});instances.add(key);
  for(const [c,r] of cells)put(have,c,r,cat);}
 for(const [k,cats] of want)for(const c of cats)if(!have.get(k)?.has(c))issues.push({type:'tile-missing-3d',what:c,at:k});
 for(const [k,cats] of have)for(const c of cats)if(!want.get(k)?.has(c)&&!(c==='piece:mush_stem'))issues.push({type:'tile-extra-3d',what:c,at:k});
 // Objects: greedy nearest pairs within the same family.
 const a=f.objects2d,b=f.objects3d,pairs:{i:number;j:number;d:number;dx:number;dy:number}[]=[];
 a.forEach((p,i)=>b.forEach((q,j)=>{if(family(p.kind)!==family(q.kind))return;const dx=(q.x+q.w/2)-(p.x+p.w/2),dy=(q.y+q.h)-(p.y+p.h),d=Math.hypot(dx,dy);if(d<=MATCH)pairs.push({i,j,d,dx,dy});}));
 pairs.sort((x,y)=>x.d-y.d);const ua=new Set<number>(),ub=new Set<number>();
 for(const p of pairs){if(ua.has(p.i)||ub.has(p.j))continue;ua.add(p.i);ub.add(p.j);
  if(onScreen(a[p.i])&&a[p.i].state&&b[p.j].state&&a[p.i].state!==b[p.j].state)issues.push({type:'object-state',what:a[p.i].id,at:`${a[p.i].state}->${b[p.j].state}`});
  if(onScreen(a[p.i])&&(Math.abs(p.dx)>TOLERANCE||Math.abs(p.dy)>TOLERANCE))issues.push({type:'object-offset',what:`${a[p.i].id}(${a[p.i].kind})`,at:`${Math.round(a[p.i].x)},${Math.round(a[p.i].y)}`,dx:Math.round(p.dx),dy:Math.round(p.dy)});}
 a.forEach((p,i)=>{if(onScreen(p)&&!ua.has(i))issues.push({type:'object-missing-3d',what:`${p.id}(${p.kind})`,at:`${Math.round(p.x)},${Math.round(p.y)}`});});
 b.forEach((q,j)=>{if(onScreen(q)&&!ub.has(j))issues.push({type:'object-extra-3d',what:q.id,at:`${Math.round(q.x)},${Math.round(q.y)}`});});
 return {issues,counts:{tiles2d:f.tiles2d.length,tiles3d:f.tiles3d.length,objects2d:a.length,objects3d:b.length}};
}
