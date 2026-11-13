import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import corpseWindow from './fixtures/native-goomba-slot-window.json';
import cannonWindow from './fixtures/native-cannon-group-slot-window.json';
import airWindow from './fixtures/native-goomba-air-squash-window.json';

function assertWindow(window:typeof corpseWindow|typeof cannonWindow|typeof airWindow){
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);
  const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  const actual=sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.dead<90&&e.kind==='goomba').map((e:any)=>({slot:e.enemySlot,state:e.walkerState??(e.squashed?4:0),x:e.x,y:e.y})).sort((a:any,b:any)=>a.slot-b.slot);
  assert.deepEqual(actual,row.actors.map(({slot,state,x,y})=>({slot,state,x,y})),`row${frame}`);
  if(window===airWindow)for(const expected of row.actors){const e=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.dead<90&&e.kind==='goomba'&&e.enemySlot===expected.slot);assert.deepEqual({speed:e.fall.speed,force:e.fall.force,fraction:e.fall.fraction,timer:e.shellTimer??0,vx:e.vx},{speed:expected.speed,force:expected.force,fraction:expected.fraction,timer:expected.timer,vx:expected.vx},`vertical motor row${frame} slot${expected.slot}`);}
  if('cannons' in row&&Array.isArray(row.cannons)){
   for(const e of sim.enemies)if(e.active&&!e.dead&&e.bbCheck)assert.equal(e.graphicsVisible,false,`cannon birth has no handler picture row${frame}`);
   const cannons=sim.enemies.filter((e:any)=>e.active&&!e.dead&&!e.frenzy&&e.kind==='bullet').map((e:any)=>({slot:e.enemySlot,x:e.x,y:e.y})).sort((a:any,b:any)=>a.slot-b.slot);assert.deepEqual(cannons,row.cannons,`cannon row${frame}`);
   if('slotSub' in row&&Array.isArray(row.slotSub)&&!row.actors.some(e=>e.slot===0))assert.equal(sim.slotSub[0],row.slotSub[0],`cannon retained fraction row${frame}`);
  }
 }
}

test('a squashed Goomba holds its slot until native erasure, delaying the next group and preserving its birth position',()=>assertWindow(corpseWindow));
test('a rejected cannon preserves the native horizontal fraction for the next Goomba group',()=>assertWindow(cannonWindow));

test('an airborne squashed Goomba holds the stomp row, then walks/falls in state2 and lands in state3 until interval14 erasure',()=>assertWindow(airWindow));
