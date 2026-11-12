import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import run from '../evidence/native-runs/3-3.v2.json';
import window from '../data/native-powerup-slot.json';

test('native special-slot power-up retains every vertical byte through reveal, landings and offscreen erase',()=>{
 const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(run.initialRam),{level:run.level}));sim.step([],0);sim.inputs=[];
 const pads=unpack(run.pads),buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<window.first+window.rows.length;f++){
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);if(f<window.first)continue;
  const [id,state,x,y,speed,force,fraction]=window.rows[f-window.first],i=sim.items.find((i:{nativePowerState?:number})=>i.nativePowerState!==undefined);
  assert.deepEqual([sim.nativePowerSlot.speed,sim.nativePowerSlot.force,sim.nativePowerSlot.fraction],[speed,force,fraction],`native row ${f} retained bytes`);
  if(id===46){assert.ok(i,`native row ${f}: live power-up`);assert.deepEqual([i.nativePowerState,i.x,i.y-8],[state,x,y],`native row ${f} power-up`);}
  else assert.equal(i,undefined,`native row ${f}: erased special object`);
 }
});
