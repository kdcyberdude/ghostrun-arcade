import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import native from './fixtures/model-play-wall.json';

test('model-play 1-1 air wall contact releases acceleration after the native back-out pause',()=>{
 const sim=new Simulation(structuredClone(observedLevels()));sim.reset(true);
 const names=['a','b','select','start','up','down','left','right'] as const;
 const samples=new Map(native.rows.filter(r=>r.i<650).map(r=>[r.i,r]));let frame=native.start;
 for(const [pad,count]of native.actions)for(let n=0;n<count;n++,frame++){
  sim.step(names.filter((_,b)=>pad&(1<<b)),1);
  // The retained native PPU row consumes its pad immediately; production queues it for two frames.
  const row=samples.get(frame-2);if(!row)continue;
  assert.equal(Math.round(sim.player.vx*4096),row.vx,`native speed at ${row.i}`);
  assert.ok(Math.abs(sim.player.x-row.x)<1,`native x at ${row.i}: ${sim.player.x} vs ${row.x}`);
  assert.ok(Math.abs(Math.floor(sim.player.y)-32-row.y)<=1,`native y at ${row.i}`);
 }
});
