import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 4-3 low canopy supports falling Mario across the observed cap',()=>{
 for(const x of [1346,1362,1383]){
  const level=structuredClone(observedLevels().find(l=>l.id==='4-3')!);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[x,142]);
  sim.player.grounded=false;sim.player.vx=0;sim.player.vy=2;sim.step([],2);
  assert.equal(sim.player.y,144);assert.equal(sim.player.grounded,true);
 }
});
