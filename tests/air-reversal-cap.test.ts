import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Button,Level} from '../src/types.js';
import levels from '../data/levels.json';
import controls from '../evidence/air-reversal-control-cases.json';

const buttons:Button[]=['up','down','left','right','a','b'];
for(const c of controls.cases.filter(c=>c.qualifiedCapCase)) {
 test(`observed native takeoff cap: ${c.name} (${c.classification})`,()=>{
  const sim=new Simulation(levels as unknown as Level[]);sim.reset(true);
  let observations=0;
  for(const a of c.actions) {
   sim.step(buttons.filter((_,i)=>a.mask&(1<<i)),a.frames);
   assert.equal(sim.frame,a.nativeFrame);
   assert.equal(sim.phase,'play');
   const r=a.reference,dx=Math.floor(sim.player.x)-r.x,dy=Math.floor(sim.player.y)-r.y,dc=sim.camera-r.camera;
   assert.ok(Math.abs(dx)<=2&&Math.abs(dy)<=2&&Math.abs(dc)<=2,`${c.name} frame ${a.nativeFrame}: X${dx}, Y${dy}, camera${dc}`);
   observations++;
  }
  assert.equal(observations,c.actions.length);assert.ok(observations>=18);
 });
}
