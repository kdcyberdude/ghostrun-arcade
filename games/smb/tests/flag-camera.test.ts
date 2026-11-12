import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import observations from '../data/flag-camera-regressions.json';
import type {Button} from '../src/types.js';

const keys:Button[]=['up','down','left','right','a','b'];
// The level end follows a free-running 21-row area clock (native rows, evidence in docs/NATIVE_ROLES.md 'Level-end sequences'), whose phase at the pole is run-specific hidden state:
// the recorded route and four screenshot-era runs fit offset 0 (cal-standard only 0), 'reserved-three' fits only offsets 8..14 at the unchanged tolerance (scan: evidence/local/warp-realign/flagphase.ts).
const clockPhaseOffset:Record<string,number>={'reserved-three':11};
function replay(sim:Simulation,observed:typeof observations.cases[number]){
 sim.reset(true);(sim as unknown as {areaFrame:number}).areaFrame+=clockPhaseOffset[observed.name]??0;const checkpoints=new Map(observed.checkpoints.map(([frame,camera])=>[frame,camera]));let checked=0;
 for(const[mask,frames]of observed.actions){
  const buttons=keys.filter((_,bit)=>mask&(1<<bit));
  for(let frame=0;frame<frames;frame++){
   sim.step(buttons,1);const camera=checkpoints.get(sim.frame);if(camera===undefined)continue;
   assert.ok(Math.abs(sim.camera-camera)<=observations.tolerancePixels,`${observed.name} native${sim.frame}: camera${sim.camera}, reference${camera}`);checked++;
  }
 }
 assert.equal(checked,checkpoints.size);assert.equal(sim.level.id,'1-2');assert.equal(sim.lives,3);
}

for(const observed of observations.cases)test(`${observed.name} ordinary pole approach preserves the observed cutscene camera`,()=>{
 replay(new Simulation(observedLevels()),observed);
});

test('pole camera history is recaptured after restarting with a different approach',()=>{
 const sim=new Simulation(observedLevels());
 replay(sim,observations.cases.find(c=>c.name==='cal-six')!);
 replay(sim,observations.cases.find(c=>c.name==='cal-standard')!);
});
