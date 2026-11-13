import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';
import captures from './fixtures/native-flag-runtime.json';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
const keys:Button[]=['a','b','select','start','up','down','left','right'],unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
// Old screenshot-only reset cases lacked the initial077F byte and fitted a per-recording areaFrame offset.
// Native RAM captures replace that end-phase assumption; genuine old observations remain in data unchanged.
test('native pole camera is restored after restarting with independent source approaches',()=>{
 const sim:any=new Simulation(observedLevels());let checked=0;
 for(const level of ['1-1','2-3','1-3','1-1']){
  const c=captures.cases.find(c=>c.level===level)!,initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);
  sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.receipt));sim.inputs=[];
  for(let f=0;f<pads.length;f++){
   sim.step(keys.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==level)break;
   if(r[14]!==4&&r[14]!==5)continue;
   assert.equal(Math.floor(sim.camera),r[0x71a]*256+r[0x71c],`${level} sourcePPU${f}`);checked++;
  }
 }
 assert.ok(checked>2000);
});
