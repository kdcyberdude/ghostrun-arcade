// Render-only regression: native flagpole and misc-coin score billboards use their native screen positions.
// npx tsx tools/visual3d/hud-check.ts (V25_PORT selects a private server port)
import {openGame} from './lib.js';
const g=await openGame({view:'3d',query:'quality=low&scale=1'});
try{const r=await g.page.evaluate(()=>{const w=window as any,s=w.marioDebug.simulation;w.mario.reset({playing:true});s.phase='flag';s.flagTop=100;s.flagBonus=2000;s.camera=s.area.exit.x-200;s.player.x=s.area.exit.x-15;s.player.y=160;s.items=[{kind:'coin',x:s.camera+90,y:80,vx:0,vy:0,life:100,age:0,nativeCoin:{slot:8,state:2,speed:0,force:0,fraction:0}}];w.render3d.render(s);return {hud:w.render3d.hud.last,errors:w.marioDebug.snapshot().audioErrors};});if(!r.hud.includes('P|2000|204|125')||!r.hud.includes('P|200|90|81')||g.errors.length)throw Error(JSON.stringify({r,errors:g.errors}));console.log('NATIVE HUD BILLBOARDS PASS',r.hud);}finally{await g.close();}
