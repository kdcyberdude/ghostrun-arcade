import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';import pipeFixture from './fixtures/native-pipe-rise-clock.json';import deathFixture from './fixtures/native-death-nextarea-clock.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
for(const fixture of [pipeFixture,deathFixture]){
 const initial=unpack(fixture.initial),pads=unpack(fixture.pads),ram=unpack(fixture.ram);
test(`${fixture.level}: retained NMI interval bank survives death/PlayerEntrance and following NextArea`,()=>{
 for(const [bytes,expected]of [[initial,fixture.initialRamSha256],[pads,fixture.padsSha256],[ram,fixture.ramSha256]] as const)assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,fixture.receipt));sim.step([],0);sim.inputs=[];let rising=0,following=0;const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);
  assert.equal(sim.intervalControl,r[0x77f],`NMI interval row${f}`);
  if(r[14]===7&&r[0x710]===2)rising++;
  if(r[0x75c]===2)following++;
 }
 assert.ok(rising>0);assert.equal(following,fixture.level==='1-2'?167:165);
 const audit=strictCompare(decodeEntrance(initial,fixture.receipt),pads,ram,fixture.level);
 for(const field of ['level','area','time','y',...Object.keys(audit.fields).filter(k=>k.startsWith('continuation.'))])assert.equal(audit.fields[field],null,field);
 assert.equal(audit.coverage.frames,pads.length);assert.equal(audit.coverage.unsteppedFrames,0);assert.equal(audit.coverage.alignedFrames,pads.length);if(fixture.level==='1-2')assert.deepEqual(audit.diagnostics,[]);else{assert.equal(audit.diagnostics.length,1);assert.equal(audit.diagnostics[0].code,'unsupported-sim-object-family');assert.ok(audit.diagnostics[0].detail.startsWith('vine:'));}
 // Earlier area-3 x/extra actor and the partial-memory camera coordinate mismatch remain exposed by strictCompare.
});
}
