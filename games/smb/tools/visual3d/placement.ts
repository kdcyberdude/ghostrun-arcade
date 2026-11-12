// 3D-vs-2D placement check: every audited frame is drawn by BOTH renderers from the same simulation state; each terrain cell and each sim object
// (player, enemies, items, lifts, firebar balls, springs, goal flag) is located in both pictures and every mismatch is listed
// (tile missing / extra in 3D, object missing / extra in 3D, object offset beyond placement-match.TOLERANCE px).
// Frames (every --every frames): the recorded route (data/observed-winning-inputs.json, as far as it still plays), or --native: each level replayed from
// its native trace (pads.bin per level, entrance.json receipts as for tools/harness/native-divergence.ts), or --staged scenes (every area of all 32 levels
// at camera steps of --step px; enemies not yet spawned there). Render-only: the simulation is stepped exactly as the game does.
// Usage: npx tsx tools/visual3d/placement.ts [--every=15] [--frames=N] [--staged [--step=96]] [--native=TRACES --entrances=DIR [--levels=1-1,4-4]] [--out=file.json]
// (V25_PORT picks the dev port)
import {openGame,routeRuns} from './lib.js';
import {observedLevels} from '../../src/levels.js';
import {writeFile,readFile} from 'node:fs/promises';
import path from 'node:path';
import {decodeEntrance} from '../harness/native-entrance.mjs';
import type {FrameReport,Issue} from './placement-match.js';
const arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const every=Number(arg('every','15')),limit=Number(arg('frames','1e9')),staged=process.argv.includes('--staged'),step=Number(arg('step','96')),native=arg('native',''),only=arg('levels','').split(',').filter(Boolean);
if(!Number.isInteger(every)||every<=0||!Number.isFinite(step)||step<=0||!(limit>0))throw Error('Expected positive --every, --step and --frames');
const g=await openGame({view:'3d',query:'quality=low&scale=1'});const p=g.page;
await p.evaluate(async()=>{const m=await import('/tools/visual3d/placement-page.ts');await m.setup();});
type Row={frame:number|string;level:string;area:string;phase:string;camera:number;issues:Issue[]};const rows:Row[]=[];
const audit=()=>p.evaluate(()=>{const w=window as any,s=w.marioDebug.simulation;s.events.length=0;w.render3d.render(s);const r:FrameReport=w.placement.audit();
 return {level:s.level.id as string,area:s.area.id as string,phase:s.phase as string,camera:Math.floor(s.camera),r};});
if(native){
 const keys=['a','b','select','start','up','down','left','right'];
 for(const l of observedLevels()){if(only.length&&!only.includes(l.id))continue;
  const dir=path.join(native,l.id);let pads:Buffer,entrance:unknown;
  try{pads=await readFile(path.join(dir,'pads.bin'));entrance=decodeEntrance(new Uint8Array(await readFile(path.join(dir,'initial.ram'))),JSON.parse(await readFile(path.join(arg('entrances',''),l.id,'entrance.json'),'utf8')));}catch(e){await g.close();throw e;}
  await p.evaluate(async e=>{const w=window as any,s=w.marioDebug.simulation,m=await import('/tools/harness/native-entrance.mjs');w.mario.reset({playing:true});m.initializeEntrance(s,e);s.step([],0);s.inputs=[];},entrance);
  for(let f=0;f<Math.min(pads.length,limit);f+=every){
   const chunk=[...pads.subarray(f,Math.min(f+every,limit))].map(b=>keys.filter((_,i)=>b&(1<<i)));
   await p.evaluate(c=>{const s=(window as any).marioDebug.simulation;for(const b of c)s.step(b,1,[]);},chunk);
   const a=await audit();rows.push({frame:f+chunk.length,level:a.level,area:a.area,phase:a.phase,camera:a.camera,issues:a.r.issues});
  }
 }
}else if(!staged){
 await p.evaluate(()=>(window as any).mario.reset({playing:true}));
 let frame=0,next=every;
 for(const run of routeRuns(limit)){
  let left=run.frames;
  while(left>0){const n=Math.min(left,next-frame);await p.evaluate(([b,n])=>{(window as any).marioDebug.simulation.step(b,n,[]);},[run.buttons,n] as const);frame+=n;left-=n;
   if(frame>=next){next+=every;const a=await audit();rows.push({frame,level:a.level,area:a.area,phase:a.phase,camera:a.camera,issues:a.r.issues});}}
 }
}else{
 const levels=observedLevels(),cameras=(width:number)=>{const max=Math.max(0,width-256),out:number[]=[];for(let c=0;c<max;c+=step)out.push(c);out.push(max);return out;};
 for(const [li,l] of levels.entries())for(const a of l.areas.filter(()=>!only.length||only.includes(l.id)))for(const cam of cameras(a.width)){
  await p.evaluate(([li,area,cam])=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.levelIndex=li;s.loadArea(area);s.phase='play';s.camera=cam;s.player.x=cam+72;w.mario.pause();},[li,a.id,cam] as const);
  const r=await audit();rows.push({frame:`staged@${cam}`,level:r.level,area:r.area,phase:r.phase,camera:r.camera,issues:r.r.issues});
 }
}
// Group identical issues per area (same type + what), keeping the first frame and the count.
const groups=new Map<string,{level:string;area:string;type:string;what:string;count:number;first:Row;at:string;dx?:number;dy?:number}>();
for(const r of rows)for(const i of r.issues){const what=i.what.replace(/#\d+(\.\d+)?/,'').replace(/@\d+$/,'');const k=`${r.level}/${r.area}|${i.type}|${what}`;const gr=groups.get(k);
 if(gr)gr.count++;else groups.set(k,{level:r.level,area:r.area,type:i.type,what,count:1,first:{...r,issues:[]},at:i.at,dx:i.dx,dy:i.dy});}
const list=[...groups.values()].sort((a,b)=>a.level.localeCompare(b.level)||b.count-a.count);
for(const x of list)console.log(`${x.level}/${x.area} ${x.type} ${x.what} x${x.count} first frame ${x.first.frame} cam ${x.first.camera} phase ${x.first.phase} at ${x.at}${x.dx!==undefined?` d=${x.dx},${x.dy}`:''}`);
console.log(`frames audited ${rows.length}, frames with issues ${rows.filter(r=>r.issues.length).length}, issue groups ${list.length}, page errors ${g.errors.length}`,g.errors.slice(0,5));
const out=arg('out','');if(out)await writeFile(out,JSON.stringify({framesAudited:rows.length,levelsAudited:[...new Set(rows.map(r=>r.level))],pageErrors:g.errors,rows:rows.filter(r=>r.issues.length),groups:list},null,1));
await g.close();
process.exitCode=list.length||g.errors.length?1:0;
