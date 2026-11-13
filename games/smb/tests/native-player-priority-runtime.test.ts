import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import priorities from './fixtures/native-player-priority.json';import recordings from './fixtures/native-game-timer-runtime.json';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of recordings.runs.filter(run=>priorities.rows.some(row=>row[0]===run.level)))test(`${run.level}: pipe, entrance and castle controller rows retain native stored/drawn priority`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];
 const rows=new Map(priorities.rows.filter(row=>row[0]===run.level).map(row=>[row[1],row]));let checked=0;
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);const row=rows.get(frame);if(!row)continue;checked++;
  assert.deepEqual([sim.playerBackgroundPriority,sim.playerDrawBackgroundPriority],[row[4],row[5]],`native PPU frame${frame}`);
 }
 assert.equal(checked,rows.size);
});
