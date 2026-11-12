// Captures the flagpole grab on the recorded 1-1 route and a 1-4 fire-bar scene at 2K (asset review).
// Usage: npx tsx tools/visual25d/moments.ts <outdir>
import {openGame,routeRuns,savePng} from './lib.js';
const out=process.argv[2];
const g=await openGame({view:'25d',query:'res=2K'});const runs=routeRuns();
await g.page.evaluate(()=>(window as any).mario.reset({playing:true}));
let shots=0;
for(const r of runs){
 for(let i=0;i<r.frames;i++){
  const s=await g.page.evaluate(b=>{const w=window as any;w.mario.step(b,1);const s=w.marioDebug.snapshot();return {phase:s.phase,level:s.level,x:s.player.x};},r.buttons);
  if(s.level!=='1-1')break;
  if(/flag|pole|slide/i.test(s.phase)&&shots<4){const img=await g.page.evaluate(()=>(window as any).mario.observe().image);await savePng(img,`${out}/flag${shots++}.png`);for(let k=0;k<12;k++)await g.page.evaluate(()=>(window as any).mario.step([],1));}
 }
 if(shots>=4)break;
}
const fire=await g.page.evaluate(()=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});const i=s.levels.findIndex((l:any)=>l.id==='1-4');s.levelIndex=i;s.loadArea(s.level.main);s.phase='play';w.mario.step(['right'],170);return w.mario.observe().image;});
await savePng(fire,`${out}/firebar.png`);console.log('flag shots',shots,'errors',g.errors);await g.close();
