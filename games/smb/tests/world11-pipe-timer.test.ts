import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import sourceInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';
const names:Button[]=['up','down','left','right','a','b'];
function approach(){
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const [mask,frames] of sourceInputs.actions.slice(0,52))sim.step(names.filter((_,i)=>Boolean(mask&(1<<i))),frames);
 assert.equal(sim.frame,390);return sim;
}
function checkTimer(sim:Simulation,firstFrame:number,firstValue:number){
 assert.equal(sim.frame,firstFrame);assert.equal(sim.area.id,'bonus-coins');assert.equal(sim.entryTimerHidden,false);assert.equal(sim.time,firstValue);
 sim.step([],23);assert.equal(sim.time,firstValue);sim.step([],1);assert.equal(sim.time,firstValue-1);
}
test('1-1 early bonus entry displays and advances the source timer on observed frames',()=>{
 const sim=approach();sim.step(['left','b'],8);sim.step(['right'],7);sim.step(['down'],3);sim.step([],91);checkTimer(sim,499,382);
});
test('1-1 later bonus entry aligns source timer after a different arrival phase',()=>{
 const sim=approach();sim.step(['right'],8);sim.step(['left'],7);sim.step([],8);sim.step(['down'],3);sim.step([],91);checkTimer(sim,507,381);
});
test('1-1 clock continues normally when Mario does not enter the pipe',()=>{
 const sim=approach();sim.step(['right'],8);sim.step(['left'],7);sim.step([],248);assert.equal(sim.frame,653);assert.equal(sim.area.id,'main');assert.equal(sim.time,372);
});
