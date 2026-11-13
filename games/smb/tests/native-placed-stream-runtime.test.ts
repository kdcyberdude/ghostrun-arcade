import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import data from './fixtures/native-placed-stream-runtime.json';import {strictSimEntities} from '../tools/harness/native-strict-entities.js';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of data.runs)test(`${run.level}: every native placed cursor row spends one attempt per free slot`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);const s=sim.placedStream;
  assert.ok(s,`source stream ${frame}`);assert.deepEqual([s.offset,s.page,Number(s.selected)],run.cursor[frame],`native cursor ${frame}`);
  const row=run.banks.find(r=>r.frame===frame);if(!row)continue;
  const actors=strictSimEntities(sim).filter(e=>e.bank==='enemy');
  for(let slot=0;slot<5;slot++){
   const reference:{slot:number;x:number;y:number}=row.actors[slot],actor=actors.find(e=>e.slot===slot);assert.equal(Boolean(actor),Boolean(row.flags[slot]),`native slot${slot} flag ${frame}`);
   if(actor)assert.deepEqual([actor.x,actor.y],[reference.x,reference.y],`native slot${slot} position ${frame}`);
  }
 }
});
