import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level} from '../src/types.js';

for(const [name,spawn] of [['ground approach',[2982,208]],['falling spring contact',[3004,160]]] as const){
 test('2-1 spring palette is physics-inert during '+name,()=>{
  const after=structuredClone(observedLevels().find(l=>l.id==='2-1')!) as Level;
  const spring=after.areas.find(a=>a.id==='main')!.springs!.find(s=>s.x===3008&&s.y===200)!;
  assert.equal(spring.palette,'0f-16-30-27');
  const before=structuredClone(after);delete before.areas.find(a=>a.id==='main')!.springs!.find(s=>s.x===3008&&s.y===200)!.palette;
  const sims=[before,after].map(level=>{const s=new Simulation([level]);s.reset(true);s.loadArea('main',[...spawn],2880);return s;});
  const physical=(s:Simulation)=>({frame:s.frame,phase:s.phase,player:s.player,camera:s.camera,enemies:s.enemies,items:s.items,popups:s.popups,score:s.score,lives:s.lives,coins:s.coins,time:s.time,events:s.events,pose:s.locomotionPose,compression:s.springCompression(s.area.springs![0])});
  for(let frame=0;frame<80;frame++){
   const buttons=frame<24?['right','b'] as const:frame<32?['left','a'] as const:[];
   for(const s of sims)s.step([...buttons],1);
   assert.deepEqual(physical(sims[1]),physical(sims[0]),'Physical divergence at native update '+frame);
  }
 });
}
