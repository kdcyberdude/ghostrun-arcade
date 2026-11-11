import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import sourceInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';
const names:Button[]=['up','down','left','right','a','b'];
function near(value:number,reference:number){assert.ok(Math.abs(value-reference)<=2,`${value} is not within 2 pixels of ${reference}`);}
function bonusPlatform(){
 const sim=new Simulation(observedLevels());sim.reset(true);
 for(const [mask,frames] of sourceInputs.actions.slice(0,52))sim.step(names.filter((_,i)=>Boolean(mask&(1<<i))),frames);
 sim.step(['right'],8);sim.step(['left'],7);sim.step([],8);sim.step(['down'],100);sim.step([],60);
 sim.step(['right','b'],8);sim.step(['right','a','b'],35);sim.step([],35);
 assert.equal(sim.frame,651);assert.equal(sim.area.id,'bonus-coins');return sim;
}
test('small Mario stops sooner when Down is held on 1-1 ground',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);sim.step(['right','b'],30);sim.step(['down'],60);
 near(Math.floor(sim.player.x),96);near(Math.floor(sim.player.y),208);
});
test('Down stops the observed bonus-room platform coast',()=>{
 const sim=bonusPlatform();sim.step(['right','b'],15);sim.step(['down'],40);
 near(Math.floor(sim.player.x),129);near(Math.floor(sim.player.y),160);
});
test('Down with the direction of travel keeps the observed bonus-room coast',()=>{
 const sim=bonusPlatform();sim.step(['right','b'],15);sim.step(['down','right'],40);
 near(Math.floor(sim.player.x),135);near(Math.floor(sim.player.y),160);
});
