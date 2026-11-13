import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {applyNativeCannons} from '../tools/native-cannons.mjs';
import declarations from '../data/native-cannon-layout.json';
import window from './fixtures/native-cannon-parser-window.json';

test('all native cannon declarations come from source area style objects, including an omitted 5-2 cannon',()=>{
 const levels=observedLevels(),copy=structuredClone(levels);applyNativeCannons(copy,declarations.cannons);assert.deepEqual(copy,levels);
 assert.equal(declarations.cannons.length,31);
 assert.ok(levels.find(l=>l.id==='5-2')!.areas.find(a=>a.id==='area-2')!.cannons!.some(c=>c.x===1712&&c.y===176&&c.nativeColumn===1712));
});

test('source parser task creates the cannon table before slot2 fires on the following native pass',()=>{
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads),sim:any=new Simulation(observedLevels());
 sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  assert.equal(sim.random.frame,row.counter,`counter row${frame}`);assert.equal(sim.parserClock.task,row.task,`parser row${frame}`);assert.equal(sim.areaControls.column,row.column,`column row${frame}`);assert.equal(sim.cannonOffset,row.offset,`bank offset row${frame}`);
  assert.deepEqual(Array.from({length:6},(_,k)=>{const e=sim.cannonTable[k];return {x:e?.cannon.x??0,y:e?.cannon.y??0,timer:e?.timer??0};}),row.table,`table row${frame}`);
  const actors=sim.enemies.filter((e:any)=>e.nativeShot&&e.active&&!e.dead).map((e:any)=>({slot:e.enemySlot,x:e.x,y:e.y}));assert.deepEqual(actors,row.cannons,`cannon actors row${frame}`);
  if(frame===1154){const e=sim.enemies.find((e:any)=>e.nativeShot&&!e.dead);assert.equal(e.enemySlot,2);assert.equal(e.graphicsVisible,false);}
 }
});
