import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

test('a hidden plant stays inhibited while Mario jumps vertically above its pipe',()=>{
 const tiles:Tile[]=Array.from({length:30},(_,x)=>[x,13,84]);
 const level:Level={id:'plant-vertical-gate',time:400,main:'main',evidence:'Conditional fixture based on the observed 1-2 on-pipe jump.',areas:[{id:'main',width:480,palette:0,theme:'underground',tiles,solidRects:[{x:77,y:160,width:32,height:48,id:84}],enemies:[{kind:'piranha',x:85,y:184,phase:48,spawnCamera:0}],spawn:[85,160],evidence:'Observed pipe-relative placement, inferred hidden phase.'}]};
 const sim=new Simulation([level]);sim.reset(true);sim.step([],200);
 const observed=new Map([[11,128],[21,105],[31,94],[41,107],[51,149],[111,128],[121,105],[131,94],[141,107]]);
 for(let frame=1;frame<=150;frame++){
  const interval=(frame-1)%50;
  sim.step(interval<30?['a']:[],1);
  assert.equal(sim.phase,'play');
  assert.equal(sim.player.x,85);
  assert.equal(sim.enemies[0].y,184);
  const bottom=observed.get(frame);
  if(bottom!==undefined)assert.ok(Math.abs(Math.floor(sim.player.y)-bottom)<=2,`frame ${frame}`);
 }
});
