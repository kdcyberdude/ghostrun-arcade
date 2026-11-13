import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('a later-slot NoRun visit preserves the frame timer already decremented by NMI',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 const plant=sim.makeEnemy({kind:'piranha',x:160,y:184}),bro=sim.makeEnemy({kind:'hammerBro',x:192,y:184});
 Object.assign(plant,{active:true,enemySlot:0,pir:{y:160,speed:1,flag:0,up:136,down:160,timer:10}});
 Object.assign(bro,{active:true,enemySlot:1,hbro:{state:0,jumpTimer:0,throwTimer:0,frameTimer:10,interval:128,speed:0,force:0,fraction:0,y:160}});
 sim.enemies=[plant,bro];sim.slotFrameTimers=[10,10,0,0,0];sim.frame=100;
 sim.tickIntervalTimers();
 assert.deepEqual([plant.pir.timer,bro.hbro.frameTimer,...sim.slotFrameTimers.slice(0,2)],[9,9,9,9]);
 // An earlier actor now starts growth: later actors skip movement, but must
 // retain the one timer decrement performed before the enemy-slot pass.
 sim.powerChange={kind:'grow',from:0,to:1,remaining:3};
 sim.tickHeldEnemyFrameTimers(plant);sim.tickHeldEnemyFrameTimers(bro);
 assert.deepEqual([plant.pir.timer,bro.hbro.frameTimer,...sim.slotFrameTimers.slice(0,2)],[9,9,9,9]);
});
