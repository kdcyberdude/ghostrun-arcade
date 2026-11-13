import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import data from './fixtures/native-game-timer-runtime.json';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of data.runs)test(`${run.level}: every recorded PPU row retains native timer digits/control, including engine7 and000`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);
  assert.deepEqual([sim.time,24-sim.timerFrames],[run.times[frame],run.controls[frame]],`native PPU frame${frame}`);
 }
});
