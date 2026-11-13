import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import window from './fixtures/native-shell-stomp-window.json';

test('an airborne shell stomp holds state4, then falls in state2 with retained walking speed and lands in state3',()=>{
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);
  const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  for(const expected of row.actors){
   const actor=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&!e.dead&&e.enemySlot===expected.slot&&e.nativeId===expected.id);assert.ok(actor,`row${frame} slot${expected.slot}`);
   assert.deepEqual({slot:actor.enemySlot,id:actor.nativeId,state:actor.walkerState,x:actor.x,y:actor.y,...actor.fall},expected,`row${frame}`);
  }
 }
});
