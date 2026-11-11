import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {createBowserMotor} from '../src/bowser-motion.js';

// Source-registered positions of a later, likely distinct projectile. Its
// native launch instant/source remain unknown, so compare displacement only.
const reference=JSON.parse(readFileSync(new URL('../evidence/eight-four-early-flame-air-reversal-evaluation.json',import.meta.url),'utf8')) as {
 thresholdPixels:number;samples:{nativeFrame:number;x:number}[];
};

test('8-4 spawned flame matches the held-out native horizontal displacement',()=>{
 const level=structuredClone(observedLevels().find(item=>item.id==='8-4')!);level.main='area-5';
 const sim=new Simulation([level]);sim.reset(true);sim.camera=380;
 sim.tiles.set('25,10',84);
 Object.assign(sim.player,{x:400,y:160,vx:0,vy:0,grounded:true});
 const boss=sim.enemies.find(enemy=>enemy.kind==='bowser')!;
 Object.assign(boss,{active:true,dead:0});sim.enemies=[boss];
 // The old age%150 fire schedule is gone (native fire: first 255 frames after he appears); seed the native motor so the flame is due on the next step.
 boss.bowser=createBowserMotor(boss.x,'8-4');boss.bowser.nextFlame=1;
 sim.step([],1);const flame=sim.items.find(item=>item.kind==='flame');assert.ok(flame);
 const first=reference.samples[0],start=flame.x;let previous=first.nativeFrame;
 for(const sample of reference.samples){
  sim.step([],sample.nativeFrame-previous);previous=sample.nativeFrame;
  assert.equal(sim.phase,'play');
  const error=(flame.x-start)-(sample.x-first.x);
  assert.ok(Math.abs(error)<=reference.thresholdPixels,`frame ${sample.nativeFrame}: displacement error ${error}`);
 }
});
