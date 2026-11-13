// Actual GPU regression for native flag score, misc coin and screen-task presentation.
// npx tsx tools/visual3d/hud-check.ts (V25_PORT selects a private server port)
import {openGame} from './lib.js';
const g=await openGame({view:'3d',query:'quality=low&scale=1'});
try{
 const r=await g.page.evaluate(()=>{
  const w=window as any,s=w.marioDebug.simulation,r=w.render3d;w.mario.reset({playing:true});
  s.hud.seed({score:'123450',coins:'09',time:'   '});s.score=999999;s.coins=99;s.time=345;r.render(s);const queued=r.hud.last;
  s.phase='flag';s.flagTop=100;s.flagBonus=2000;s.camera=s.area.exit.x-200;s.player.x=s.area.exit.x-15;s.player.y=160;
  s.specialSlot5.flag=1;s.specialSlot5.id=48;s.specialSlot5.x=s.camera+184;s.specialSlot5.y=100;s.flagNumber.y=121;
  s.items=[{kind:'coin',x:s.camera+90,y:80,vx:0,vy:0,life:100,age:0,nativeCoin:{slot:8,state:2,speed:0,force:0,fraction:0}}];
  r.render(s);const flag={hud:r.hud.last,position:r.world.flag.position.toArray()};
  s.specialSlot5.x=s.camera-2;r.render(s);const hidden={flag:r.world.flag.visible,hud:r.hud.last};
  let avatars=0;r.avatar.render=()=>avatars++;
  const screens=[];
  for(const [screen,disable,backdrop]of [[1,1,15],[7,0,15],[8,0,15],[5,0,15],[10,1,34]]){
   s.phase='intro';s.levelLoad={task:1,engine:0,screen,disable};s.nativeBackdrop=backdrop;r.render(s);
   const pixels=new Uint8Array(4),gl=r.gl.getContext();gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   screens.push({screen,world:r.world.group.visible,hud:r.hud.last,avatars,pixel:[...pixels]});
  }
  s.levelLoad=undefined;return {queued,flag,hidden,screens};
 });
 const queue=r.queued.split('~').find((l:string)=>l.startsWith('H|'))?.split('|');if(queue?.[2]!=='123450'||queue?.[3]!=='09'||queue?.[5]!=='   ')throw Error('3D HUD ignored native queued digits: '+JSON.stringify(r));
 if(!r.flag.hud.includes('P|2000|204|122')||!r.flag.hud.includes('P|200|90|81')||r.flag.position[1]!==131/16||r.hidden.flag||r.hidden.hud.includes('P|2000'))throw Error(JSON.stringify(r));
 for(const s of r.screens){if(s.world||s.pixel.slice(0,3).join()!==(s.screen===10?'104,136,252':'0,0,0')||s.avatars!==(s.screen===1?0:1))throw Error(JSON.stringify(r));}
 if(!r.screens[1].hud.includes('I|')||!r.screens[2].hud.includes('I|')||!r.screens[3].hud.includes('U')||r.screens[0].hud||r.screens[4].hud||g.errors.length)throw Error(JSON.stringify({r,errors:g.errors}));
 console.log('NATIVE HUD / FLAG / SCREEN GPU PASS',JSON.stringify(r));
}finally{await g.close();}
