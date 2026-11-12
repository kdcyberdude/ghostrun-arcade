// Visual review captures for the 3D view (inspection only): lives screen, small-Mario run, death, the 1-1 -> 1-2 entry and 4-3.
// Usage: npx tsx tools/visual3d/review.ts <outdir> [res=2K]
import {openGame,routeRuns,savePng} from './lib.js';
import {writeFile} from 'node:fs/promises';
const out=process.argv[2],res=process.argv[3]??'2K';
const g=await openGame({view:'3d',query:`res=${res}`});const p=g.page;const meta:Record<string,unknown>={};
const shot=async(name:string)=>{const r=await p.evaluate(()=>{const w=window as any,s=w.marioDebug.snapshot();return {img:w.mario.observe().image,s:{phase:s.phase,level:s.level,area:s.area,x:s.player.x-s.camera,y:s.player.y,size:s.player.size,vx:s.player.vx,enemies:s.enemies.filter((e:any)=>e.active).map((e:any)=>({k:e.kind,x:e.x-s.camera,y:e.y}))}};});await savePng(r.img,`${out}/${name}.png`);meta[name]=r.s;};
const step=(b:string[],n:number)=>p.evaluate(([b,n])=>(window as any).mario.step(b,n),[b,n] as const);
// 1. Lives screen: a fresh game shows WORLD 1-1 x 3.
await p.evaluate(()=>(window as any).mario.reset({playing:false}));await step([],5);await step(['start'],1);
for(let i=0;i<300;i++){const s=await p.evaluate(()=>{const s=(window as any).marioDebug.simulation;return {ph:s.phase,f:s.phaseFrame};});if(s.ph==='intro'&&s.f>=60)break;await step([],1);}
await shot('lives');
// 2. Small Mario walking then running on 1-1 from the start.
await p.evaluate(()=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.levelIndex=0;s.loadArea(s.level.main);s.phase='play';});
await step(['right'],24);await shot('walk-a');await step(['right'],5);await shot('walk-b');
await step(['right','b'],40);for(const k of ['a','b','c','d'])await (async()=>{await step(['right','b'],3);await shot('run-'+k);})();
// 3. Death: keep walking into the first Goomba.
for(let i=0;i<400;i++){const d=await p.evaluate(()=>(window as any).marioDebug.simulation.player.dead);if(d)break;await step(['right'],1);}
for(let i=0;i<8;i++){await shot('death-'+i);await step([],8);}
// 4. 1-1 flag -> 1-2 side-pipe entry along the recorded route.
await p.evaluate(()=>(window as any).mario.reset({playing:true}));
const runs=routeRuns();let n=0,taken=0;
outer:for(const r of runs){for(let i=0;i<r.frames;i++){const s=await p.evaluate(b=>{const w=window as any;w.mario.step(b,1);const s=w.marioDebug.simulation;return {l:s.level.id,ph:s.phase,auto:!!s.area.autoWalk};},r.buttons);n++;
 if(s.l==='1-2'&&(s.ph==='play'||s.ph==='pipe')&&n%10===0&&taken<12){await shot('entry-'+String(taken).padStart(2,'0'));taken++;}
 if(s.l==='1-2'&&!s.auto&&taken>0&&s.ph==='play')break outer;}}
// 5. 4-3 at several camera positions.
for(const at of [0.05,0.2,0.35,0.5,0.65,0.8,0.95]){
 await p.evaluate(at=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.levelIndex=s.levels.findIndex((l:any)=>l.id==='4-3');s.loadArea(s.level.main);s.phase='play';
  const cam=Math.max(0,Math.min(s.area.width-256,Math.round(s.area.width*at/16)*16));s.camera=cam;s.player.x=cam+72;w.mario.pause();},at);
 await shot('w43-'+Math.round(at*100));}
await writeFile(`${out}/meta.json`,JSON.stringify(meta,null,1));console.log('errors',g.errors);await g.close();
