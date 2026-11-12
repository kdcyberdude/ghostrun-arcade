import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import sourceInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';

const names:Button[]=['up','down','left','right','a','b'];
function pipeApproach(){
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const [mask,frames] of sourceInputs.actions.slice(0,52))sim.step(names.filter((_,i)=>Boolean(mask&(1<<i))),frames);
 assert.equal(sim.frame,390);return sim;
}
function near(value:number,reference:number){assert.ok(Math.abs(value-reference)<=2,`${value} is not within 2 pixels of ${reference}`);}

test('1-1 landing without Run brakes toward the bonus pipe and enters',()=>{
 const sim=pipeApproach();sim.step(['right'],8);near(Math.floor(sim.player.x),906);
 sim.step(['left'],7);near(Math.floor(sim.player.x),916);
 sim.step([],8);near(Math.floor(sim.player.x),923);
 sim.step(['down'],3);assert.equal(sim.phase,'pipe');
});

test('1-1 delayed reversal misses the bonus pipe like the reference',()=>{
 const sim=pipeApproach();sim.step(['right'],8);sim.step([],7);sim.step(['left'],8);
 near(Math.floor(sim.player.x),925);sim.step(['down'],24);
 assert.equal(sim.phase,'play');assert.equal(sim.area.id,'main');near(Math.floor(sim.player.x),927);
});

test('releasing Run after a 1-1 airborne reversal permits the observed pipe entry',()=>{
 const sim=pipeApproach();sim.step(['left','b'],8);sim.step(['right'],7);
 near(Math.floor(sim.player.x),917);sim.step(['down'],3);assert.equal(sim.phase,'pipe');
});
