import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import controls from '../evidence/subpixel-running-control-cases.json';
import type {Button} from '../src/types.js';

const keys:Button[]=['up','down','left','right','a','b'];
for(const observed of [...controls.cases,...controls.regressionCases])test(`${observed.name} matches reference motor behavior within 2px`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const action of observed.actions){
  sim.step(keys.filter((_,bit)=>Boolean(action.mask&(1<<bit))),action.frames);
  assert.equal(sim.frame,action.nativeFrame);
  const errors={x:Math.floor(sim.player.x)-action.x,y:Math.floor(sim.player.y)-action.y,camera:Math.floor(sim.camera)-action.camera};
  assert.ok(Object.values(errors).every(error=>Math.abs(error)<=controls.tolerancePixels),JSON.stringify({name:observed.name,frame:action.nativeFrame,errors}));
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});
