import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-flag-runtime.json';
test('a held death NMI stays held on PlayerLoseLife even though ContinueGame clears TimerControl later that row',()=>{
 const c=fixture.cases.find(c=>c.level==='1-1')!,unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),buttons:Button[]=['a','b','select','start','up','down','left','right'];
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.receipt));sim.step([],0);sim.inputs=[];let heldDispatch=0;
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048),before=f?ram.subarray((f-1)*2048,f*2048):initial;sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);
  assert.equal(sim.intervalControl,r[0x77f],`native interval row${f}`);
  if(before[14]===6&&before[0x747]>0&&r[14]===0){heldDispatch++;assert.equal(r[0x747],0);assert.equal(r[0x77f],before[0x77f]);}
 }
 assert.equal(heldDispatch,1);
});
