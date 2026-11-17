// Pure 3D-vs-2D placement comparison (no browser): tested by tests/visual3d-placement.test.ts, fed by placement-page.ts.
// Tiles: per cell, the terrain category the 2D renderer drew vs the categories the 3D world covered. Objects: each sim object's 2D sprite rect vs the
// projected rect of the 3D object of the same family, matched greedily by distance; compared by horizontal centre and bottom (feet), since 3D models are
// not sprite-sized.
import {kindIn} from '../../src/render3d/semantics.js';
export interface Obj{id:string;sourceId?:string;kind:string;x:number;y:number;w:number;h:number;state?:string;
 /** 2D only: the NES sprite hardware hid it this frame (8 per line / OAM cycling); the 3D view may show it or not. */
 oamHidden?:boolean}
export interface Cell{col:number;row:number;id:number}
export interface Issue{type:'tile-missing-3d'|'tile-extra-3d'|'tile-overlap-3d'|'look-3d'|'object-missing-3d'|'object-extra-3d'|'object-offset'|'object-state';what:string;at:string;dx?:number;dy?:number}
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
 const map:Record<string,string>={toad:'retainer',princess:'retainer',spinyEgg:'spiny',koopa_shell:'koopa',redKoopa:'koopa',paratroopa:'koopa',beetle_shell:'beetle',fire_flower:'flower',flower:'flower',one_up:'1up',bowser_flame:'flame',hammer_bro:'hammerBro',player1:'player',player2:'player',lift:'lift',cloud:'cloud'};
 return map[k]??map[kind]??k;
}
/** Objects whose centre is on screen (both renderers draw edge objects partly; perspective widens 3D boxes near the edges). */
const onScreen=(o:Obj)=>{const cx=o.x+o.w/2,cy=o.y+o.h/2;return cx>=12&&cx<244&&cy>=32&&cy<240;};
/** Colour family of an sRGB colour (0-255): grey for unsaturated colours, else a hue bucket. Palette identity is compared by family, since lit 3D
 * materials never reproduce the NES colour exactly. */
export function colourFamily([r,g,b]:readonly number[]):string{
 const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max-min<0.2*Math.max(max,1)||max<24)return 'grey';
 const h=(max===r?((g-b)/(max-min)+6)%6:max===g?(b-r)/(max-min)+2:(r-g)/(max-min)+4)*60;
 return h<45?'orange':h<70?'yellow':h<170?'green':h<260?'blue':h<330?'purple':'orange';
}
/** One palette-identity sample: what (e.g. 'pipe', 'used') drawn at a cell in a colour (sRGB 0-255), or the sky's night/day. */
export interface Look{what:string;at:string;rgb?:readonly number[];night?:boolean}
/** Looks present in both pictures are compared: the sky's night/day and each sampled cell's colour family. */
export function compareLooks(a:Look[],b:Look[]):Issue[]{
 const issues:Issue[]=[],have=new Map(b.map(l=>[l.what+'@'+l.at,l]));
 for(const l of a){const m=have.get(l.what+'@'+l.at);if(!m)continue;
  if(l.night!==undefined&&m.night!==undefined&&l.night!==m.night)issues.push({type:'look-3d',what:l.what,at:`${l.night?'night':'day'}->${m.night?'night':'day'}`});
  if(l.rgb&&m.rgb&&colourFamily(l.rgb)!==colourFamily(m.rgb))issues.push({type:'look-3d',what:l.what,at:`${l.at} ${colourFamily(l.rgb)}->${colourFamily(m.rgb)}`});}
 return issues;
}
/** The part of a rect inside the 256x240 picture: both renderers cut objects at the screen edges (a Goomba falling out of the bottom). */
export function shown(o:{x:number;y:number;w:number;h:number}){const x0=Math.max(0,o.x),y0=Math.max(0,o.y),x1=Math.min(256,o.x+o.w),y1=Math.min(240,o.y+o.h);return x1>x0&&y1>y0?{x:x0,y:y0,w:x1-x0,h:y1-y0}:o;}
export function compareFrame(f:{theme:string;camera:number;tiles2d:Cell[];tiles3d:{name:string;x:number;y:number}[];objects2d:Obj[];objects3d:Obj[];pieceModel?:(c:string)=>string;looks2d?:Look[];looks3d?:Look[]}):FrameReport{
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
 const a=f.objects2d,b=f.objects3d,pairs:{i:number;j:number;d:number;dx:number;dy:number;identity:boolean}[]=[];
 a.forEach((p,i)=>b.forEach((q,j)=>{if(family(p.kind)!==family(q.kind)||p.sourceId&&q.sourceId&&p.sourceId!==q.sourceId)return;const identity=Boolean(p.sourceId&&p.sourceId===q.sourceId),P=shown(p),Q=shown(q),dx=(Q.x+Q.w/2)-(P.x+P.w/2),dy=(Q.y+Q.h)-(P.y+P.h),d=Math.hypot(dx,dy);if(identity||d<=MATCH)pairs.push({i,j,d,dx,dy,identity});}));
 pairs.sort((x,y)=>Number(y.identity)-Number(x.identity)||x.d-y.d);const ua=new Set<number>(),ub=new Set<number>();
 for(const p of pairs){if(ua.has(p.i)||ub.has(p.j))continue;ua.add(p.i);ub.add(p.j);
  if(a[p.i].oamHidden)continue;
  if(onScreen(a[p.i])&&a[p.i].state&&b[p.j].state&&a[p.i].state!==b[p.j].state)issues.push({type:'object-state',what:a[p.i].id,at:`${a[p.i].state}->${b[p.j].state}`});
  if(onScreen(a[p.i])&&(Math.abs(p.dx)>TOLERANCE||Math.abs(p.dy)>TOLERANCE))issues.push({type:'object-offset',what:`${a[p.i].id}(${a[p.i].kind})`,at:`${Math.round(a[p.i].x)},${Math.round(a[p.i].y)}`,dx:Math.round(p.dx),dy:Math.round(p.dy)});}
 a.forEach((p,i)=>{if(onScreen(p)&&!ua.has(i)&&!p.oamHidden)issues.push({type:'object-missing-3d',what:`${p.id}(${p.kind})`,at:`${Math.round(p.x)},${Math.round(p.y)}`});});
 b.forEach((q,j)=>{if(onScreen(q)&&!ub.has(j))issues.push({type:'object-extra-3d',what:q.id,at:`${Math.round(q.x)},${Math.round(q.y)}`});});
 issues.push(...compareLooks(f.looks2d??[],f.looks3d??[]));
 return {issues,counts:{tiles2d:f.tiles2d.length,tiles3d:f.tiles3d.length,objects2d:a.length,objects3d:b.length}};
}
