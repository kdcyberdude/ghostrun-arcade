import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import controls from '../evidence/entry-coast-control-cases.json';
import type {Button} from '../src/types.js';

for(const observed of controls.cases)test(`${observed.name} follows measured coasting inputs`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const action of observed.steps){
  sim.step(action.buttons as Button[],action.frames);assert.equal(sim.frame,action.nativeFrame);
  const errors={x:Math.floor(sim.player.x)-action.reference.x,y:Math.floor(sim.player.y)-action.reference.y,camera:Math.floor(sim.camera)-action.reference.camera};
  assert.ok(Object.values(errors).every(error=>Math.abs(error)<=controls.tolerancePixels),JSON.stringify({name:observed.name,frame:action.nativeFrame,errors}));
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});
