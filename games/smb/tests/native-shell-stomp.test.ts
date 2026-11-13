import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import airWindow from './fixtures/native-shell-stomp-window.json';
import revivalWindow from './fixtures/native-shell-revival-window.json';
import revivals from './fixtures/native-shell-revivals.json';

function assertWindow(window:typeof airWindow|typeof revivalWindow){
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);
  const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  for(const expected of row.actors){
   const actor=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&!e.dead&&e.enemySlot===expected.slot);assert.ok(actor,`row${frame} slot${expected.slot}`);assert.equal(actor.kind,expected.id===2?'beetle':expected.id===1||expected.id===3?'redKoopa':'koopa');
   const {id,...wanted}=expected;
   assert.deepEqual({slot:actor.enemySlot,state:actor.walkerState,timer:actor.shellTimer??0,vx:actor.vx,x:actor.x,y:actor.y,...actor.fall},wanted,`row${frame}`);
  }
 }
}

test('an airborne shell stomp holds state4, then falls in state2 with retained walking speed and lands in state3',()=>assertWindow(airWindow));
test('native shell interval expiry chooses FrameCounter direction and holds position on the revival frame',()=>assertWindow(revivalWindow));

test('all additional native corpus shell revivals retain position and fraction while selecting velocity from FrameCounter',()=>{
 assert.equal(revivals.events.length,66);assert.deepEqual(revivals.failures,[]);
 for(const e of revivals.events){assert.equal(e.timer,0);assert.equal(e.x1,e.x0);assert.equal(e.y1,e.y0);assert.equal(e.fraction1,e.fraction0);assert.equal(e.vx,(e.counter&1?-1:1)*(e.hard?0.75:0.5),`${e.file} row${e.frame}`);}
});
