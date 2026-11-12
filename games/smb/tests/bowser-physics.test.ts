import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {createBowserMotor} from '../src/bowser-motion.js';

interface Anchor {bossFrontX:number;seedPhysicalY:number;seedVy:number;playerX:number;playerY:number;camera:number;age:number}
const measured=JSON.parse(readFileSync(new URL('../data/bowser-physics-regressions.json',import.meta.url),'utf8')) as {
 tolerances:{opaqueFeetPixels:number;flameHorizontalPixels:number};
 arcs:{id:string;level:string;initial:Anchor;takeoffBracket:[number,number];takeoffNativeFrame:number;samples:{nativeFrame:number;feetY:number;image:string}[]}[];
 flame:{level:string;initial:Anchor;samples:{nativeFrame:number;x:number;image:string}[]};
};
function bridge(levelId:string,initial:Anchor){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!);
 const sim=new Simulation([level]);sim.reset(true);
 const boss=sim.enemies.find(e=>e.kind==='bowser')!;assert.ok(boss);
 Object.assign(sim.player,{x:initial.playerX,y:initial.playerY,vx:0,vy:0,grounded:true});sim.camera=initial.camera;
 Object.assign(boss,{x:initial.bossFrontX,y:initial.seedPhysicalY,vx:-0.5,vy:initial.seedVy,active:true,dead:0,age:initial.age});
 // The anchors were taken with the old age%130 hop and age%150 fire schedules (age 129 = hop on the first step, 149 = fire on the first step); the native
 // motor (src/bowser-motion.ts) keeps its own frame counter, so seed it to the same event steps. Hop and flame physics are the native-fitted ones.
 boss.bowser=createBowserMotor(boss.x,levelId);Object.assign(boss.bowser,{nextHop:130-initial.age,nextFlame:150-initial.age});
 const collision=sim as unknown as {collisionAt:(x:number,y:number)=>{y:number}|undefined};
 assert.equal(initial.seedPhysicalY,160);assert.equal(initial.seedVy,0);
 assert.equal(collision.collisionAt(boss.x+8,160)?.y,160,'actual compiled bridge supports the unshifted anchor');
 return {sim,boss};
}

// Event-phase anchors isolate motor/collision rules. These are not complete
// gameplay runs and do not establish the native jump/attack clock.
for(const arc of measured.arcs)test(`${arc.id}: production Bowser arc matches full native assembly within2px without Y offsets`,()=>{
 assert.ok(arc.takeoffNativeFrame>=arc.takeoffBracket[0]&&arc.takeoffNativeFrame<=arc.takeoffBracket[1]);
 const {sim,boss}=bridge(arc.level,arc.initial);let frame=arc.takeoffNativeFrame-1;
 for(const sample of arc.samples){
  sim.step([],sample.nativeFrame-frame);frame=sample.nativeFrame;
  assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);
  assert.ok(Math.abs(Math.floor(boss.y)-sample.feetY)<=measured.tolerances.opaqueFeetPixels,`${sample.image}: predicted${boss.y}, observed${sample.feetY}`);
 }
});

test('production Bowser flame motor matches observed native displacement within0.75px',()=>{
 const {sim}=bridge(measured.flame.level,measured.flame.initial);sim.step([],1);
 const flame=sim.items.find(i=>i.kind==='flame');assert.ok(flame,'normal attack update emits the flame');
 const first=measured.flame.samples[0],initialX=flame.x;let frame=first.nativeFrame;
 for(const sample of measured.flame.samples){
  sim.step([],sample.nativeFrame-frame);frame=sample.nativeFrame;
  const predicted=flame.x-initialX,observed=sample.x-first.x;
  assert.ok(Math.abs(predicted-observed)<=measured.tolerances.flameHorizontalPixels,`${sample.image}: displacement${predicted}, observed${observed}`);
 }
});
