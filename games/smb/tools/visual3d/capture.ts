// Capture paired 2D/3D staged views for visual inspection. This is not replay or native-fidelity evidence.
// Usage: npx tsx tools/visual3d/capture.ts OUT LEVEL:AREA:CAMERA [LEVEL:AREA:CAMERA ...]
// V25_PORT selects a private dev port; Q=low selects the faster lighting preset (default high).
import {openGame,savePng} from './lib.js';
import {observedLevels} from '../../src/levels.js';
const [out,...specs]=process.argv.slice(2),levels=observedLevels();
if(!out||!specs.length)throw Error('Expected output directory and LEVEL:AREA:CAMERA specifications');
for(const view of ['orig','3d']){
 const g=await openGame({view,query:`quality=${process.env.Q??'high'}&scale=2`});
 try{
  for(const spec of specs){
   const [level,area,camera]=spec.split(':'),li=levels.findIndex(l=>l.id===level),cam=Number(camera);
   if(li<0||!levels[li].areas.some(a=>a.id===area)||!Number.isFinite(cam))throw Error(`Invalid staged view: ${spec}`);
   const data=await g.page.evaluate(([li,area,cam])=>{
    const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.levelIndex=li;s.loadArea(area);s.phase='play';s.camera=cam;s.player.x=cam+72;w.mario.pause();w.mario.step([],0);
    return w.mario.observe().image;
   },[li,area,cam] as const);
   await savePng(data,`${out}/${view}/${level}_${area}_${cam}.png`);
  }
  if(g.errors.length)throw Error(g.errors.join('\n'));
 }finally{await g.close();}
}
