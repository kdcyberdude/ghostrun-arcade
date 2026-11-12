import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import controls from '../evidence/ledge-air-control-cases.json';
import fallControls from '../evidence/ledge-air-fall-control-cases.json';
import inputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';

const keys:Button[]=['up','down','left','right','a','b'];
for(const observed of controls.cases)test(`${observed.name} matches fresh reference images within 2px`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const action of observed.actions){
  sim.step(keys.filter((_,bit)=>Boolean(action.mask&(1<<bit))),action.frames);
  assert.equal(sim.frame,action.nativeFrame);
  const errors={x:Math.floor(sim.player.x)-action.x,y:Math.floor(sim.player.y)-action.y,camera:Math.floor(sim.camera)-action.camera};
  assert.ok(Object.values(errors).every(error=>Math.abs(error)<=controls.tolerancePixels),JSON.stringify({name:observed.name,frame:action.nativeFrame,errors}));
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

for(const observed of fallControls.cases)test(`${observed.name} preserves measured momentum through landing within 2px`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const[mask,frames]of inputs.actions.slice(0,fallControls.prefixDecisionCount))sim.step(keys.filter((_,bit)=>Boolean(mask&(1<<bit))),frames);
 for(const action of observed.actions){
  sim.step(keys.filter((_,bit)=>Boolean(action.mask&(1<<bit))),action.frames);
  assert.equal(sim.frame,action.nativeFrame);
  const errors={x:Math.floor(sim.player.x)-action.x,y:Math.floor(sim.player.y)-action.y,camera:Math.floor(sim.camera)-action.camera};
  assert.ok(Object.values(errors).every(error=>Math.abs(error)<=fallControls.tolerancePixels),JSON.stringify({name:observed.name,frame:action.nativeFrame,errors}));
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});
