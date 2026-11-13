import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import window from './fixtures/native-goomba-slot-window.json';

test('a squashed Goomba holds its slot until native erasure, delaying the next group and preserving its birth position',()=>{
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);
  const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  const actual=sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.dead<90&&e.kind==='goomba').map((e:any)=>({slot:e.enemySlot,state:e.squashed?4:e.walkerState??0,x:e.x,y:e.y})).sort((a:any,b:any)=>a.slot-b.slot);
  assert.deepEqual(actual,row.actors.map(({slot,state,x,y})=>({slot,state,x,y})),`row${frame}`);
 }
});
