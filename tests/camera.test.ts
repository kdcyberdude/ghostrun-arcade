import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import observations from '../evidence/camera-exact-regressions.json';
import firstLevel from '../evidence/first-level-comparison.json';
import winningInputs from '../data/observed-winning-inputs.json';
import reserved from '../evidence/camera-lag-heldout-measurements.json';
import type {Button} from '../src/types.js';

for(const observed of observations.cases)test(`${observed.id} preserves observed camera onset`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const action of observed.actions){
  sim.step(action.buttons as Button[],action.frames);
  assert.equal(sim.frame,action.nativeFrame);
  assert.ok(Math.abs(Math.floor(sim.player.x)-action.x)<=observations.tolerancePixels);
  assert.ok(Math.abs(Math.floor(sim.player.y)-action.feetY)<=observations.tolerancePixels);
  assert.ok(Math.abs(sim.camera-action.camera)<=observations.tolerancePixels);
  if(observed.id==='independent-slow-run-jump'||action.tick===6||action.tick===7)assert.equal(sim.camera,action.camera,`tick${action.tick}: measured camera${action.camera}`);
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

test('ordinary first-level collision and resumed scrolling preserve the measured camera path',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 const keys:Button[]=['up','down','left','right','a','b'],exact=new Set([18,33,34,56,94,112,113,116]);
 for(let i=0;i<175;i++){
  const[mask,frames]=winningInputs.actions[i];sim.step(keys.filter((_,b)=>mask&(1<<b)),frames);
  const observed=firstLevel.rows.find(r=>r.tick===i+1);if(!observed)continue;
  assert.equal(sim.frame,observed.nativeFrame);
  assert.ok(Math.abs(Math.floor(sim.player.x)-observed.reference.x)<=2,`tick${i+1}: playerX`);
  assert.ok(Math.abs(Math.floor(sim.player.y)-observed.reference.y)<=2,`tick${i+1}: playerY`);
  assert.ok(Math.abs(sim.camera-observed.reference.camera)<=2,`tick${i+1}: camera`);
  if(exact.has(i+1))assert.equal(sim.camera,observed.reference.camera,`tick${i+1}: exact collision/resumption camera`);
 }
 // Decisions35/36 retain camera+1/+2 and fail the separate99% raw RGB check.
});

test('fresh ordinary wall reversal preserves the exact measured camera while player motion remains separately qualified',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const row of reserved.records.filter(r=>r.experiment==='camera-reserved-wall-reverse')){
  if(row.request.op!=='step')continue;
  sim.step(row.request.buttons as Button[],row.response.frames_advanced);
  if(row.measurement)assert.equal(sim.camera,row.camera,`tick${row.response.tick}: reversal camera`);
 }
 // These source controls have an existing6px horizontal discrepancy; this is
 // a camera-only regression, not a passing movement or browser gameplay case.
 sim.reset(true);
 for(const action of observations.cases[0].actions){sim.step(action.buttons as Button[],action.frames);assert.equal(sim.camera,action.camera);}
});
