// Replay check: the presentation layer must not change the simulation or its audio cues.
// Runs the recorded route frame by frame (1) headless with NO renderer, (2) in Chromium with the original renderer, (3) with the 2.5D renderer,
// hashing the full simulation snapshot after every frame and logging every emitted audio event. All three streams must be identical.
// Usage: npx tsx tools/visual25d/equivalence.ts [--frames=2600] [--backend=gpu]
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import {routeFrames} from './route.js';
import {openGame} from './lib.js';
import {writeFile,mkdir} from 'node:fs/promises';
const arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const N=Number(arg('frames','2600')),backend=arg('backend',process.platform==='darwin'?'metal':'gpu');
const route=routeFrames().slice(0,N);
// Must match main.ts marioDebug.snapshot() field order exactly (minus audioErrors).
const SNAPSHOT=`(s)=>JSON.stringify({frame:s.frame,phase:s.phase,level:s.level.id,area:s.area.id,player:{...s.player},camera:s.camera,lives:s.lives,score:s.score,time:s.time,coins:s.coins,enemies:s.enemies.map(e=>({...e}))})`;
const FNV=`(t)=>{let h=2166136261;for(let i=0;i<t.length;i++){h^=t.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}`;
const snap=eval(SNAPSHOT) as (s:Simulation)=>string,fnv=eval(FNV) as (t:string)=>string;
type Run={hashes:string[];events:string[]};
function headless():Run{
 const sim=new Simulation(observedLevels());sim.reset(true);const out:Run={hashes:[],events:[]};
 for(const e of sim.events.splice(0))out.events.push(`0:${e}`);
 for(const b of route){sim.step(b,1,[]);for(const e of sim.events.splice(0))out.events.push(`${sim.frame}:${e}`);out.hashes.push(fnv(snap(sim)));}
 return out;
}
async function browser(view:string):Promise<Run&{renderer:string;errors:string[];msPerFrame:number;coverage?:unknown}>{
 const g=await openGame({view,backend,query:arg('query','quality=low&scale=1')});
 const r=await g.page.evaluate(([route,SNAP,HASH])=>{
  const w=window as any,sim=w.marioDebug.simulation,snap=eval(SNAP),fnv=eval(HASH),events:string[]=[],hashes:string[]=[];
  const emit=sim.emit.bind(sim);sim.emit=(id:string)=>{events.push(`${sim.frame}:${id}`);return emit(id);};
  w.mario.reset({playing:true});
  // reset() itself may emit before the first step: the headless run records those as frame 0 as well.
  const t0=performance.now();for(const b of route as string[][]){w.mario.step(b,1);hashes.push(fnv(snap(sim)));}
  return {hashes,events,ms:(performance.now()-t0)/(route as unknown[]).length,coverage:w.render25d?.coverage()};
 },[route,SNAPSHOT,FNV] as const);
 const out={hashes:r.hashes,events:r.events,renderer:g.renderer,errors:g.errors,msPerFrame:r.ms,coverage:r.coverage};await g.close();return out;
}
const base=headless(),orig=await browser('orig'),v25=await browser('25d');
const firstDiff=(a:string[],b:string[])=>{for(let i=0;i<Math.max(a.length,b.length);i++)if(a[i]!==b[i])return i;return -1;};
const report={date:new Date().toISOString(),frames:N,route:'data/observed-winning-inputs.json from standard reset; requested prefix only',
 renderer:v25.renderer,checks:{
  origStatesVsHeadless:firstDiff(base.hashes,orig.hashes),v25StatesVsHeadless:firstDiff(base.hashes,v25.hashes),
  origEventsVsHeadless:firstDiff(base.events,orig.events),v25EventsVsHeadless:firstDiff(base.events,v25.events)},
 counts:{states:base.hashes.length,events:base.events.length},finalHash:base.hashes[base.hashes.length-1],
 msPerFrameInclRender:{orig:+orig.msPerFrame.toFixed(2),v25:+v25.msPerFrame.toFixed(2)},errors:{orig:orig.errors,v25:v25.errors},coverage:v25.coverage};
const pass=Object.values(report.checks).every(v=>v===-1)&&!orig.errors.length&&!v25.errors.length;
await mkdir('visual25d/evidence',{recursive:true});await writeFile('visual25d/evidence/replay-equivalence.json',JSON.stringify({...report,verdict:pass?'PASS':'FAIL'},null,1)+'\n');
console.log(JSON.stringify({...report,coverage:undefined},null,1));console.log(pass?'REPLAY EQUIVALENCE PASS':'REPLAY EQUIVALENCE FAIL');process.exit(pass?0:1);
