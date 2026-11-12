import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import inputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';

test('fresh 1-1 idle timer matches the observed source decision endpoints',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 sim.step([],97);assert.equal(sim.time,396,'source tick 13, native frame 97');
 sim.step([],120);assert.equal(sim.time,391,'source tick 29, native frame 217');
});

test('captured 1-1 ledge releases, stomp and running descent match observed feet within 2px',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 const keys:Button[]=['up','down','left','right','a','b'];
 const feet=new Map([[92,147],[93,172],[94,204],[95,187],[96,203],[97,208],[138,131],[139,163],[140,191],[141,208],[152,198]]);
 for(let i=0;i<154;i++){
  const [mask,frames]=inputs.actions[i];sim.step(keys.filter((_,bit)=>Boolean(mask&(1<<bit))),frames);
  const expected=feet.get(i+1);
  if(expected!==undefined)assert.ok(Math.abs(Math.floor(sim.player.y)-expected)<=2,`tick${i+1}: ${sim.player.y} vs ${expected}`);
  if(i+1===94)assert.ok(sim.score>=100,'the observed Goomba stomp has occurred');
 }
 assert.equal(sim.lives,3);assert.equal(sim.phase,'play');
});

test('an independent earlier reversal catches the observed narrow1-2 corner',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);const keys:Button[]=['up','down','left','right','a','b'];
 for(const [mask,frames]of inputs.actions.slice(0,403))sim.step(keys.filter((_,bit)=>Boolean(mask&(1<<bit))),frames);
 sim.step(['right','b'],inputs.actions[403][1]);
 assert.ok(Math.abs(sim.player.x-894)<=2,`${sim.player.x}`);assert.ok(Math.abs(sim.player.y-160)<=2,`${sim.player.y}`);
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});
