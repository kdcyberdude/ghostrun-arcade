import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import sourceInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';

const names:Button[]=['up','down','left','right','a','b'];
function bonusApproach(){
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const [mask,frames] of sourceInputs.actions.slice(0,52))sim.step(names.filter((_,i)=>Boolean(mask&(1<<i))),frames);
 sim.step(['right'],8);sim.step(['left'],7);sim.step([],8);sim.step(['down'],100);sim.step([],60);
 assert.equal(sim.frame,573);assert.equal(sim.area.id,'bonus-coins');return sim;
}
function near(value:number,reference:number){assert.ok(Math.abs(value-reference)<=2,`${value} is not within 2 pixels of ${reference}`);}

test('1-1 bonus jump coasts to the observed position after landing without Run',()=>{
 const sim=bonusApproach();sim.step(['right','b'],8);sim.step(['right','a','b'],35);sim.step([],34);
 assert.equal(sim.frame,650);near(Math.floor(sim.player.x),99);near(Math.floor(sim.player.y),160);
});

test('1-1 bonus landing retains reference momentum when reversing',()=>{
 const sim=bonusApproach();sim.step(['right','b'],8);sim.step(['right','a','b'],35);sim.step([],14);sim.step(['left'],20);
 assert.equal(sim.frame,650);near(Math.floor(sim.player.x),89);near(Math.floor(sim.player.y),160);
});

test('1-1 bonus jump coasts to the observed position with Run held after landing',()=>{
 const sim=bonusApproach();sim.step(['right','b'],8);sim.step(['right','a','b'],35);sim.step(['b'],35);
 assert.equal(sim.frame,651);near(Math.floor(sim.player.x),97);near(Math.floor(sim.player.y),160);
});
