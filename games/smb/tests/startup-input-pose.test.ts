import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('a short rightward pulse displays the measured walking pose, then stands after release',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 sim.step([],4);sim.step(['right','b'],1);sim.step([],2);
 assert.equal(sim.frame,7);
 assert.equal(sim.locomotionPose.kind,'walk');
 assert.equal(sim.locomotionPose.frame,0);
 assert.equal(sim.locomotionPose.facing,1);
 sim.step([],1);
 assert.equal(sim.frame,8);
 assert.equal(sim.locomotionPose.kind,'stand');
});

test('down with the direction restores the measured standing pose after a short pulse',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 sim.step([],4);sim.step(['right','b'],1);sim.step(['down','right'],2);
 assert.equal(sim.frame,7);assert.equal(sim.locomotionPose.kind,'walk');
 sim.step(['down','right'],1);
 assert.equal(sim.frame,8);assert.equal(sim.locomotionPose.kind,'stand');
});
