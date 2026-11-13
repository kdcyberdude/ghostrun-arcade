import {test} from 'node:test';
import {assertNativeCornerCase} from './helpers/native-corner.js';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import controls from '../evidence/entry-collision-stationary-control-cases.json';
import type {Button} from '../src/types.js';

// These three old full-reset prefixes crossed a fitted flag-end boundary with no captured077F.
// Keep their contact scope using independent native POWER-ON branches and one-time room RAM.
const nativeReplacements:Record<string,string>={'c-zero-impact-a-only-after386':'a-only','c-zero-impact-neutral-after386':'neutral-after-jump','c-zero-impact-resume-after386':'resume-after-jump'};
for(const observed of controls.cases)test(`${observed.name} preserves measured resting contact`,()=>{
 if(nativeReplacements[observed.name]){assertNativeCornerCase(nativeReplacements[observed.name]);return;}
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const action of observed.steps){
  sim.step(action.buttons as Button[],action.frames);assert.equal(sim.frame,action.nativeFrame);
  if(!action.reference)continue;
  const errors={x:Math.floor(sim.player.x)-action.reference.x,y:Math.floor(sim.player.y)-action.reference.y,camera:Math.floor(sim.camera)-action.reference.camera};
  const context=JSON.stringify({name:observed.name,frame:action.nativeFrame,errors});
  assert.ok(Math.abs(errors.y)<=controls.tolerancePixels,context);
  if(observed.compareWholeX)assert.ok(Math.abs(errors.x)<=controls.tolerancePixels,context);
  if(observed.compareCamera)assert.ok(Math.abs(errors.camera)<=controls.tolerancePixels,context);
  if(action.exactRestX)assert.equal(Math.floor(sim.player.x),action.reference.x,context);
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});
