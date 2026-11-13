import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import data from './fixtures/native-pipe-load-runtime.json';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of data.runs)test(`${run.level}: native pipe memory, screen and entry rows retain source clocks and Mario`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];const rows=new Map(run.rows.map(row=>[row.frame,row]));
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);const row=rows.get(frame);if(!row)continue;
  assert.deepEqual([Math.floor(sim.player.x),Math.floor(sim.player.y)-32,sim.camera,sim.time,24-sim.timerFrames],[row.x,row.y,row.camera,row.time,row.control],`native pose/HUD ${frame}`);
  assert.deepEqual([sim.random.frame,sim.intervalControl,Array.from(sim.random.bytes)],[row.fc,row.interval,row.random],`native NMI ${frame}`);
  // RenderingAreaGraphics writes its 144-byte VRAM_Buffer2 across $03c4 before player setup.
  if(row.state.task!==1&&row.state.task!==2&&!(row.state.task===3&&row.state.engine===0))assert.equal(sim.playerBackgroundPriority,row.priority[0],`native player priority ${frame}`);
  assert.equal(sim.playerDrawBackgroundPriority,row.priority[1],`native OAM priority ${frame}`);
  const state=sim.nativeScreen;if(state)assert.deepEqual(Object.fromEntries(Object.keys(row.state).map(key=>[key,state[key]])),row.state,`native task ${frame}`);else assert.equal(row.state.task,3,`native gameplay ${frame}`);
 }
});
