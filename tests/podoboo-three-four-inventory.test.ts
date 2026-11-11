import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function fixture(omit=false,spawn:[number,number]=[40,112],camera=0){
 const levels=structuredClone(observedLevels());
 const area=levels.find(l=>l.id==='3-4')!.areas.find(a=>a.id==='main')!;
 if(omit)area.enemies=area.enemies.filter(e=>e.kind!=='podoboo'||e.x!==256);
 const sim=new Simulation(levels);sim.reset(true);
 sim.levelIndex=levels.findIndex(l=>l.id==='3-4');sim.loadArea('main',spawn,camera);
 return sim;
}

test('opening3-4Podoboo preserves safe player/HUD and the existing actors',()=>{
 const control=fixture(true),candidate=fixture();
 for(let frame=0;frame<120;frame++){
  control.step([],1);candidate.step([],1);
  for(const key of ['frame','phase','camera','player','score','coins','time','lives','events'] as const)
   assert.deepEqual(candidate[key],control[key],key);
  assert.deepEqual(candidate.enemies.filter(e=>e.kind!=='podoboo'||e.originX!==256),control.enemies);
 }
});

test('opening3-4Podoboo freezes while paused and causes an ordinary collision death',()=>{
 const control=fixture(true,[250,160],144),candidate=fixture(false,[250,160],144);
 const actor=candidate.enemies.find(e=>e.kind==='podoboo'&&e.originX===256)!;
 candidate.step(['start'],1);assert.equal(candidate.paused,true);
 const frozen={frame:candidate.frame,y:actor.y,age:actor.age};
 candidate.step([],44);assert.deepEqual({frame:candidate.frame,y:actor.y,age:actor.age},frozen);
 candidate.step(['start'],1);control.step([],1);
 for(let frame=0;frame<100&&candidate.phase==='play';frame++){
  candidate.step([],1);control.step([],1);
 }
 assert.equal(candidate.phase,'dying');assert.equal(candidate.player.dead,true);
 assert.equal(control.phase,'play');assert.equal(control.player.dead,false);
 const death={y:actor.y,age:actor.age};candidate.step([],20);
 assert.deepEqual({y:actor.y,age:actor.age},death);
});

test('live Podoboo artwork direction follows displacement and freezes during pause',()=>{
 const s=fixture();
 const actor=s.enemies.find(e=>e.kind==='podoboo'&&e.originX===256)!;
 s.step([],20);assert.equal(actor.podobooFalling,false); // native jump: rising for about 60 frames after the launch
 s.step([],80);assert.equal(actor.podobooFalling,true);
 const before=actor.y;s.step([],1);assert.equal(actor.podobooFalling,actor.y>before);
 s.step(['start'],1);
 const frozen=structuredClone(actor);s.step([],60);
 assert.deepEqual(actor,frozen);assert.equal(s.paused,true);
});
