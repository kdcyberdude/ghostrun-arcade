// Presentation must preserve every simulation snapshot and audio cue. By default replay the standard route prefix.
// Native replay: --traces=DIR --entrances=DIR [--levels=1-1,1-2] replays every retained v2 decision for all 32 levels.
// --frames=N limits each replay (default: 2600 for route mode, unlimited for native mode).
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import {routeFrames} from './route.js';
import {openGame} from './lib.js';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {decodeEntrance,initializeEntrance} from '../harness/native-entrance.mjs';
import type {Button} from '../../src/types.js';
const arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const traces=arg('traces',''),entrances=arg('entrances','');
if(traces&&!entrances)throw Error('--entrances is required with --traces');
const N=Number(arg('frames',traces?'Infinity':'2600')),backend=arg('backend',process.platform==='darwin'?'metal':'gpu');
const SNAPSHOT=`(s)=>JSON.stringify({frame:s.frame,phase:s.phase,level:s.level.id,area:s.area.id,player:{...s.player},camera:s.camera,lives:s.lives,score:s.score,time:s.time,coins:s.coins,enemies:s.enemies.map(e=>({...e}))})`;
const FNV=`(t)=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}`;
const snap=eval(SNAPSHOT) as (s:Simulation)=>string,fnv=eval(FNV) as (t:string)=>string;
type Replay={level:string;route:Button[][];entrance?:unknown};
type Run={hashes:string[];events:string[];finalSnapshot?:string};
const replays:Replay[]=[];
if(traces){
 const only=arg('levels','').split(',').filter(Boolean),keys:Button[]=['a','b','select','start','up','down','left','right'];
 for(const level of observedLevels()){
  if(only.length&&!only.includes(level.id))continue;
  const dir=path.join(traces,level.id),pads=await readFile(path.join(dir,'pads.bin'));
  const entrance=decodeEntrance(new Uint8Array(await readFile(path.join(dir,'initial.ram'))),JSON.parse(await readFile(path.join(entrances,level.id,'entrance.json'),'utf8')));
  replays.push({level:level.id,entrance,route:[...pads.subarray(0,N)].map(p=>keys.filter((_,i)=>p&(1<<i)))});
 }
}else replays.push({level:'standard route',route:routeFrames().slice(0,N)});
function headless(replay:Replay):Run{
 const sim:any=new Simulation(observedLevels()),out:Run={hashes:[],events:[]};const emit=sim.emit;
 sim.emit=function(id:string){out.events.push(`${sim.frame}:${id}`);return emit.call(this,id);};
 sim.reset(true);sim.events.length=0;
 if(replay.entrance){initializeEntrance(sim,replay.entrance);sim.step([],0);sim.inputs=[];}
 for(const b of replay.route){sim.step(b,1,[]);sim.events.length=0;out.hashes.push(fnv(snap(sim)));}
 out.finalSnapshot=snap(sim);return out;
}
async function browser(view:string){
 const g=await openGame({view,backend,query:arg('query','quality=low&scale=1')});const runs=[];
 for(const [index,replay] of replays.entries()){
  if(index){await g.page.reload();await g.page.waitForFunction(()=>(window as any).mario?.ready,undefined,{timeout:90000});}
  const r=await g.page.evaluate(async([replay,SNAP,HASH,expected])=>{
   const w=window as any,sim=w.marioDebug.simulation,snap=eval(SNAP),fnv=eval(HASH),events:string[]=[],hashes:string[]=[];
   let firstMismatch:{frame:number;snapshot:string}|undefined;
   // The bridge draws every frame; its unused PNG return value need not be encoded for hash/audio equivalence.
   const toDataURL=HTMLCanvasElement.prototype.toDataURL;HTMLCanvasElement.prototype.toDataURL=()=>'';
   const emit=sim.emit;sim.emit=function(id:string){events.push(`${sim.frame}:${id}`);return emit.call(this,id);};
   try{
    w.mario.reset({playing:true});
    if(replay.entrance){const {initializeEntrance}=await import('/tools/harness/native-entrance.mjs');initializeEntrance(sim,replay.entrance);sim.step([],0);sim.inputs=[];}
    const t0=performance.now();for(const b of replay.route){w.mario.step(b,1);const state=snap(sim),hash=fnv(state);if(firstMismatch===undefined&&hash!==expected[hashes.length])firstMismatch={frame:hashes.length,snapshot:state};hashes.push(hash);}
    return {hashes,events,firstMismatch,ms:(performance.now()-t0)/replay.route.length,coverage:w.render3d?.coverage()};
   }finally{sim.emit=emit;HTMLCanvasElement.prototype.toDataURL=toDataURL;}
  },[replay,SNAPSHOT,FNV,bases[index].hashes] as const);
  runs.push({...r,level:replay.level});console.log(`${view} ${replay.level}: ${r.hashes.length} frames`);
 }
 const out={runs,renderer:g.renderer,errors:g.errors};await g.close();return out;
}
const bases=replays.map(headless),orig=await browser('orig'),v25=await browser('3d');
const firstDiff=(a:string[],b:string[])=>{for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])return i;return -1;};
const levels=replays.map((replay,i)=>({level:replay.level,frames:bases[i].hashes.length,checks:{
 origStatesVsHeadless:firstDiff(bases[i].hashes,orig.runs[i].hashes),v25StatesVsHeadless:firstDiff(bases[i].hashes,v25.runs[i].hashes),
 states3dVsOrig:firstDiff(orig.runs[i].hashes,v25.runs[i].hashes),events3dVsOrig:firstDiff(orig.runs[i].events,v25.runs[i].events),
 origEventsVsHeadless:firstDiff(bases[i].events,orig.runs[i].events),v25EventsVsHeadless:firstDiff(bases[i].events,v25.runs[i].events)},
 ...(orig.runs[i].firstMismatch?{firstStateMismatch:{frame:orig.runs[i].firstMismatch!.frame,
 headless:JSON.parse(headless({...replay,route:replay.route.slice(0,orig.runs[i].firstMismatch!.frame+1)}).finalSnapshot!),
 original:JSON.parse(orig.runs[i].firstMismatch!.snapshot)}}:{}),
 events:bases[i].events.length,finalHash:bases[i].hashes.at(-1),msPerFrameInclRender:{orig:+orig.runs[i].ms.toFixed(2),v25:+v25.runs[i].ms.toFixed(2)},coverage:v25.runs[i].coverage}));
const report={date:new Date().toISOString(),route:traces?'native entrance decisions':'data/observed-winning-inputs.json from standard reset; requested prefix only',renderer:v25.renderer,levels,errors:{orig:orig.errors,v25:v25.errors}};
const pass=levels.length>0&&levels.every(l=>Object.values(l.checks).every(v=>v===-1))&&!orig.errors.length&&!v25.errors.length;
await mkdir('visual3d/evidence',{recursive:true});await writeFile('visual3d/evidence/replay-equivalence.json',JSON.stringify({...report,verdict:pass?'PASS':'FAIL'},null,1)+'\n');
console.log(JSON.stringify(report,null,1));console.log(pass?'REPLAY EQUIVALENCE PASS':'REPLAY EQUIVALENCE FAIL');process.exit(pass?0:1);
