import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictSimEntities} from '../tools/harness/native-strict-entities.js';import fixture from './fixtures/native-special-controller.json';import type {Button} from '../src/types.js';
test('slot5 NoRun controller retains actual high Y byte and source lifetime',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,fixture.entrance);sim.inputs=[];const buttons:Button[]=['a','b','select','start','up','down','left','right'];let compared=0;
 for(let frame=0;frame<fixture.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>fixture.pads[frame]&(1<<bit)),1);const row=fixture.rows[frame],actor=strictSimEntities(sim).find(e=>e.slot===5&&e.kind==='bullet-cheep-frenzy-control');
  assert.equal(Boolean(actor),Boolean(row),`actual slot5 lifetime row${frame}`);
  if(row){assert.deepEqual([actor!.x,actor!.y,actor!.state],[row[0],(row[1]-1)*256+row[2],row[3]],`actual slot5 bytes row${frame}`);compared++;}
 }
 assert.equal(compared,563);
});
