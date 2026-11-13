import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {captureLiveWorld1State} from '../tools/harness/native-continuous-state.js';import {victoryLoadChecks} from '../tools/harness/native-victory-readout.js';import fixture from './fixtures/native-pipe-rise-input.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const c of fixture.cases)test(`source engine7 pipe ownership gates readiness readout ${c.sha256.slice(0,12)}`,()=>{
 const pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(sha(pads),c.sha256);assert.equal(sha(ram),c.windowSha256);const sim:any=new Simulation(observedLevels());sim.reset(false);sim.events.splice(0);let observed=0,ignoredControlRows=0,ignoredHeldARows=0;
 for(let f=0;f<=c.to;f++){
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,i)=>pads[f]&(1<<i)),1);sim.events.splice(0);if(f<c.from)continue;
  const r=ram.subarray((f-c.from)*2048,(f-c.from+1)*2048),nativeReady=r[0x772]===3&&r[14]===8;observed++;
  assert.equal(sim.pipeRising,r[14]===7,`source${f} native motor ownership`);
  if(r[14]===7){ignoredControlRows++;if(pads[f]&1)ignoredHeldARows++;assert.equal(r[0xa],0);assert.equal(sim.nativePlayerAB,0);assert.equal(sim.phase,'play');assert.equal(sim.entryControlLocked,false);}
  assert.equal(captureLiveWorld1State(sim).loadReady,nativeReady,`source${f} continuous readiness`);
  const check=victoryLoadChecks(r,sim).find(([key])=>key==='load.ready')!;assert.equal(check[2],check[1],`source${f} strict readiness`);
 }
 assert.equal(observed,c.to-c.from+1);assert.ok(ignoredControlRows>90);if(c.sha256.startsWith('1ec0'))assert.ok(ignoredHeldARows>0);
});
