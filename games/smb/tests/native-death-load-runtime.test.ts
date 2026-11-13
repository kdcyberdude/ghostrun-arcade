import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import data from './fixtures/native-death-load-runtime.json';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of data.runs)test(`${run.level}: recorded death-load RAM and source screen tasks`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);const row=run.rows.find(r=>r.frame===frame);if(!row)continue;
  assert.deepEqual({x:Math.floor(sim.player.x),y:(Math.floor(sim.player.y)-32)&255,camera:sim.camera,time:sim.time},{x:row.x,y:row.y,camera:row.camera,time:row.time},`native pose/HUD ${frame}`);
  assert.equal(Math.floor(sim.player.y)-32,row.worldY,`native Y page ${frame}`);
  if((run.level==='2-2'||run.level==='7-2')&&row.state.task===0){const slots=new Set(sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.dead<100).map((e:any)=>e.enemySlot));assert.deepEqual(row.flags.map((_,slot)=>Number(slots.has(slot))),row.flags,`retained native enemy flags ${frame}`);}
  const state=sim.nativeScreen;if(!state&&row.state.task===3&&row.state.engine===7){assert.equal(sim.phase,'play');assert.equal(sim.entryControlLocked,true);continue;}assert.ok(state,`native screen ownership ${frame}`);assert.deepEqual(Object.fromEntries(Object.keys(row.state).map(key=>[key,state[key]])),row.state,`native screen ${frame}`);
 }
});
