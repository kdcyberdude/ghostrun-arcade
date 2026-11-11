import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Source images show small Mario's visible top at y134 and y141 after
// 8 and 15 native frames; by frame 23 he is completely behind the pipe.
// The fixture starts from the independently registered stationary drawing
// position, rather than claiming to know the source's hidden subpixel state.
for (const [id, x, camera] of [['1-1',922,811],['2-1',1653,1540]] as const) {
 test(`${id} small Mario descends behind an automatic pipe at observed speed`,()=>{
  const level=structuredClone(observedLevels().find(l=>l.id===id)!);
  const main=level.areas.find(a=>a.id==='main')!;
  main.spawn=[x,144];main.camera=camera;
  const sim=new Simulation([level]);sim.reset(true);sim.enemies=[];
  for(const [elapsed,top] of [[8,134],[15,141]] as const){
   sim.step(['down'],elapsed-sim.frame);
   assert.equal(sim.phase,'pipe');
   assert.ok(Math.abs((Math.floor(sim.player.y)-15)-top)<=2,`frame ${elapsed}: feet ${sim.player.y}, observed top ${top}`);
  }
  sim.step(['down'],23-sim.frame);
  assert.equal(sim.phase,'pipe');
  assert.ok(Math.floor(sim.player.y)-15>=144,'sprite is fully hidden at the observed checkpoint');
 });
}
