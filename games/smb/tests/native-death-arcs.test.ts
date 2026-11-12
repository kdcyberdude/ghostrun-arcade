import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import data from './fixtures/native-death-arcs.json';
for(const event of data.cases)test(`native death arc ${event.level} row${event.frame}: freeze, byte gravity and engine6 exit`,()=>{
 const sim:any=new Simulation([observedLevels()[0]]);sim.reset(true);
 const [y,fraction,,force]=event.initial;Object.assign(sim.player,{y:y+fraction/256,vy:force/256,grounded:false});sim.die();
 for(const [index,row] of event.rows.entries()){
  sim.step([],1);
  assert.equal(sim.phase,'dying',`native row${event.frame+index+1}`);
  const m=sim.deathMove;
  assert.deepEqual([Math.floor(sim.player.y),index<15?fraction:m.fraction,index<15?-4:m.speed,index<15?force:m.force,sim.loseLife?6:11],row,`native row${event.frame+index+1}`);
 }
});
