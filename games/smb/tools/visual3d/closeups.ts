// Close-ups of Mario along the recorded route at 2K: full frames plus the player position, for side-by-side asset review.
// Usage: npx tsx tools/visual3d/closeups.ts <outdir>
import {openGame,routeRuns,playTo,savePng} from './lib.js';
import {writeFile} from 'node:fs/promises';
const out=process.argv[2],frames=[60,120,200,260,330,420,520,640,760,880];
const g=await openGame({view:'3d',query:'res=2K'});const runs=routeRuns(),st={run:0,into:0,frame:0};
await g.page.evaluate(()=>(window as any).mario.reset({playing:true}));const meta:unknown[]=[];
for(const f of frames){await playTo(g.page,runs,st,f);
 const r=await g.page.evaluate(()=>{const w=window as any,s=w.marioDebug.snapshot();return {img:w.mario.observe().image,x:s.player.x-s.camera,y:s.player.y,enemies:s.enemies.map((e:any)=>({kind:e.kind??e.type,x:e.x-s.camera,y:e.y}))};});
 await savePng(r.img,`${out}/f${f}.png`);meta.push({frame:f,x:r.x,y:r.y,enemies:r.enemies});}
await writeFile(`${out}/meta.json`,JSON.stringify(meta,null,1));console.log('errors',g.errors);await g.close();
