// Campaign survey (INSPECTION ONLY: scenes are staged by setting level/area/camera directly, never used for the replay check).
// For every level and area: one frame from the original and the 2.5D renderer at the same staged state, coverage per area, and contact sheets.
// Usage: npx tsx tools/visual25d/survey.ts [--levels=1-1,1-2] [--at=0.35] [--out=visual25d/evidence/survey]
import {openGame,savePng} from './lib.js';
import {observedLevels} from '../../src/levels.js';
import {writeFile} from 'node:fs/promises';

const arg=(k:string,d:string)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d;
const out=arg('out','visual25d/evidence/survey'),at=Number(arg('at','0.35')),only=arg('levels','').split(',').filter(Boolean);
const levels=observedLevels().map((l,i)=>({i,id:l.id,areas:l.areas.map(a=>({id:a.id,width:a.width,theme:a.theme}))})).filter(l=>!only.length||only.includes(l.id));
const shots:{level:string;area:string;theme:string;orig:string;v25:string}[]=[];const coverage:Record<string,unknown>={};
for(const view of ['orig','25d']){
 const g=await openGame({view});
 for(const l of levels)for(const a of l.areas){
  const cam=Math.max(0,Math.min(a.width-256,Math.round(a.width*at/16)*16));
  const r=await g.page.evaluate(([li,area,cam])=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});
   s.levelIndex=li;s.loadArea(area);s.phase='play';s.camera=cam;s.player.x=cam+72;w.mario.pause();
   const img=w.mario.observe().image;return {img,cov:w.render25d?.coverage()};},[l.i,a.id,cam] as const);
  const file=`${out}/${view}/${l.id}_${a.id}.png`;await savePng(r.img,file);
  if(view==='25d'){coverage[`${l.id}/${a.id}`]=r.cov;shots.push({level:l.id,area:a.id,theme:a.theme,orig:`${out}/orig/${l.id}_${a.id}.png`,v25:file});}
 }
 console.log(view,'errors:',g.errors);await g.close();
}
await writeFile(`${out}/coverage.json`,JSON.stringify(coverage,null,1)+'\n');
await writeFile(`${out}/shots.json`,JSON.stringify(shots,null,1)+'\n');
// Contact sheets: build them from shots.json with any image tool.
