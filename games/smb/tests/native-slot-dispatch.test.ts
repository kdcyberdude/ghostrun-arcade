import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {nativePlatformObject} from '../src/platform-motion.js';
test('mixed native slot order preserves an earlier platform turn while a flame holds the later one',()=>{
 // Synthetic source-order case: real native platform records/motors, with
 // TimerControl set between their turns. This is not a recorded native run.
 const level=structuredClone(observedLevels().find(l=>l.id==='1-3')!),sim:any=new Simulation([level]);sim.reset(true);
 const platforms=sim.area.platforms.filter((p:any)=>nativePlatformObject(p,sim.platformMotion.context)?.kind==='horizontal').slice(0,2);
 sim.area.platforms=platforms;sim.area.firebars=[];sim.area.generators=[];sim.enemies=[];sim.frenzyControllers=[];sim.platformSlots.clear();sim.camera=1400;sim.frame=100;sim.platformFrame=1;sim.random.frame=100;sim.platformMotion.prepare(1,100);
 for(const [index,platform]of platforms.entries()){
  const o=nativePlatformObject(platform,sim.platformMotion.context)!,slot=index*2;
  sim.platformMotion.initializeNative(platform,{id:40,x:o.x,y:o.y,a:0,b:8,c:0,d:0,e:0},0,99);sim.platformSlots.set(platform,slot);
 }
 Object.assign(sim.player,{x:1450,y:152,vx:0,vy:0,size:0,star:0,invincible:0,grounded:false});
 sim.items=[{kind:'flame',x:1451.25,y:144,vx:-1.25,vy:0,age:0,life:1000,nativeFlame:{slot:1,target:0,force:0,born:-1}}];
 sim.updateEnemies(sim.player.y);sim.platformMotion.advance(1,sim.camera,100);
 assert.equal(sim.phase,'dying');assert.equal(sim.currentNativeBankSlot,-1);
 const first=sim.platformMotion.collisionPosition(platforms[0],1),later=sim.platformMotion.collisionPosition(platforms[1],1);
 assert.equal(first.x,1375+112/256,'slot0 completed its native counter/movement before the hit');
 assert.equal(later.x,1504,'slot2 observes TimerControl and keeps its prior position');
 assert.equal(sim.platformMotion.verticalState(platforms[0],1).speed,0);assert.equal(sim.platformMotion.verticalState(platforms[1],1).speed,0);
});
