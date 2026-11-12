import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level} from '../src/types.js';

for(const [name,spawn] of [['ground approach',[1990,208]],['falling spring contact',[2012,160]]] as const){
 test('3-1 spring artwork is physics-inert during '+name,()=>{
  const after=structuredClone(observedLevels().find(l=>l.id==='3-1')!) as Level;
  const main=after.areas.find(a=>a.id==='main')!;
  assert.equal(main.springs?.find(s=>s.x===2016)?.palette,'0f-16-30-27');
  const index=main.decorations!.findIndex(t=>t.x===2016&&t.y===192&&t.id===104&&t.palette===15);
  assert(index>=0);
  const before=structuredClone(after),prior=before.areas.find(a=>a.id==='main')!;
  delete prior.springs!.find(s=>s.x===2016)!.palette;prior.decorations!.splice(index,1);
  const sims=[before,after].map(level=>{const s=new Simulation([level]);s.reset(true);s.loadArea('main',[...spawn],1893);return s;});
  const physical=(s:Simulation)=>({frame:s.frame,phase:s.phase,player:s.player,camera:s.camera,enemies:s.enemies,items:s.items,popups:s.popups,score:s.score,lives:s.lives,coins:s.coins,time:s.time,events:s.events,pose:s.locomotionPose,compression:s.springCompression(s.area.springs![0])});
  for(let frame=0;frame<80;frame++){
   const buttons=frame<24?['right','b'] as const:frame<32?['left','a'] as const:[];
   for(const s of sims)s.step([...buttons],1);
   assert.deepEqual(physical(sims[1]),physical(sims[0]),'Physical divergence at native update '+frame);
  }
 });
}
