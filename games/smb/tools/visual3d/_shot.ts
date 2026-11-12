// scratch: staged side-by-side shots. args: out level:area:cam ...  (env Q=high|low)
import {openGame,savePng} from './lib.js';
import {observedLevels} from '../../src/levels.js';
const [out,...specs]=process.argv.slice(2);const levels=observedLevels();
for(const view of ['3d','orig']){
 const g=await openGame({view,query:'quality='+(process.env.Q??'high')});
 for(const sp of specs){const [lv,area,cam,steps='0',px='72']=sp.split(':');const li=levels.findIndex(l=>l.id===lv);
  const img=await g.page.evaluate(async([li,area,cam,steps,px])=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.levelIndex=li;s.loadArea(area);s.phase='play';s.camera=cam;s.player.x=cam+px;w.mario.pause();
   for(let i=0;i<steps;i++){s.step([],1,[]);}s.camera=cam;await new Promise(r=>setTimeout(r,300));return w.mario.observe().image;},[li,area,Number(cam),Number(steps),Number(px)] as const);
  await savePng(img,`${out}/${view}/${lv}_${area}_${cam}.png`);}
 await g.close();
}
