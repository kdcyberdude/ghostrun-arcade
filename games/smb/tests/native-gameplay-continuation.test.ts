import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';
import {LiveWorld1StateAudit,captureLiveWorld1State,compareLiveWorld1Start} from '../tools/harness/native-continuous-state.js';
import fixture from './fixtures/native-gameplay-continuation.json';
const names:Button[]=['a','b','select','start','up','down','left','right'];

test('live remake resumes source parser tails without an extra clock, player or actor pass',()=>{
 for(const c of fixture.cases){
  const sim=new Simulation(observedLevels());sim.reset(false);const audit=new LiveWorld1StateAudit(),ram=gunzipSync(Buffer.from(c.ram,'base64')),pads=Buffer.from(c.pads,'base64');
  assert.equal(compareLiveWorld1Start(new Uint8Array(2048).fill(255),captureLiveWorld1State(sim,true)).status,'match');
  let partial=0,continuations=0;
  for(let f=0;f<c.frames;f++){
   const timing=(sim as any).nativeGameplayTiming,wasPending=timing.parserPending,before={frame:sim.frame,counter:sim.random.frame,x:sim.player.x,y:sim.player.y,camera:sim.camera};
   sim.step(names.filter((_,b)=>pads[f]&(1<<b)),1);const raw=ram.subarray(f*2048,(f+1)*2048),result=audit.compare(raw,captureLiveWorld1State(sim));
   assert.equal(result.status,'match',`${c.id.slice(0,8)} POWERON${f}: ${JSON.stringify(result)}`);
   if(raw[0x770]===1&&raw[0x772]===3&&raw[14]===8){assert.equal((sim as any).parserClock.task,raw[0x71f]);assert.equal((sim as any).parserClock.scroll,raw[0x73d]);}
   if(timing.parserPending&&!sim.nativeStartup&&sim.phase==='play')partial++;
   if(wasPending&&timing.parserCompleted&&!timing.nmi){continuations++;assert.deepEqual({frame:sim.frame,counter:sim.random.frame,x:sim.player.x,y:sim.player.y,camera:sim.camera},before,'parser completion preserves gameplay and clock state');}
  }
  assert.equal(partial,1);assert.equal(continuations,1);
 }
});

test('batched controller steps retain an owned physical frontier without render-driven history',()=>{
 const c=fixture.cases[0],pads=Buffer.from(c.pads,'base64'),ram=gunzipSync(Buffer.from(c.ram,'base64'));
 const held=Array.from({length:c.frames-1},(_,i)=>i+1).find(f=>{const p=ram.subarray((f-1)*2048,f*2048),r=ram.subarray(f*2048,(f+1)*2048);return r[0x770]===1&&r[0x772]===3&&r[14]===8&&p[9]===r[9]&&p.subarray(0x7a7,0x7ae).equals(r.subarray(0x7a7,0x7ae));})!;
 const sim=new Simulation(observedLevels());sim.reset(false);
 for(let start=0;start<held;){let end=start+1;while(end<held&&pads[end]===pads[start])end++;sim.step(names.filter((_,bit)=>pads[start]&(1<<bit)),end-start);start=end;}
 const machine=(sim as any).nativeGameplayTiming.machine,before={cpu:{...machine.cpu},ram:Buffer.from(machine.ram),view:captureLiveWorld1State(sim)};
 const first=sim.nativePhysicalDisplay,second=sim.nativePhysicalDisplay;assert.ok(first);assert.deepEqual(first,second);
 assert.deepEqual(machine.cpu,before.cpu);assert.deepEqual(Buffer.from(machine.ram),before.ram);assert.deepEqual(captureLiveWorld1State(sim),before.view);
 sim.step(names.filter((_,bit)=>pads[held]&(1<<bit)),1);assert.equal(sim.nativePhysicalDisplay,undefined);
 const result=new LiveWorld1StateAudit().compare(ram.subarray(held*2048,(held+1)*2048),captureLiveWorld1State(sim));assert.equal(result.status,'match');
});
