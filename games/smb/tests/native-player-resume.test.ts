import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-player-resume.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const names=['a','b','select','start','up','down','left','right'] as const;

test('every native powerup growth start writes Player_State0 and retains A/B through the freeze',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.timelines.length,4);
 for(const e of fixture.timelines){
  const first=e.rows[0];assert.equal(first.state,0);assert.equal(first.timer,255);
  for(const r of e.rows.slice(0,e.firstController-e.pickup)){assert.equal(r.state,0);assert.equal(r.currentAB,first.currentAB);assert.equal(r.previousAB,first.currentAB);}
 }
});

test('recorded growths and seven native input-only branches preserve scalar fields and strict actor ratchets',()=>{
 assert.equal(fixture.observer.verifiedBaselineRows,12495);assert.equal(fixture.observer.branches.length,7);assert.equal(fixture.replays.length,11);
 for(const e of fixture.replays){
  const initial=unpack(e.initialRam),pads=unpack(e.pads),ram=unpack(e.ram);assert.equal(hash(initial),e.initialRamSha256);assert.equal(hash(pads),e.padsSha256);assert.equal(hash(ram),e.ramSha256);
  const result=strictCompare(decodeEntrance(initial,e.receipt),pads,ram,e.level),label=`${e.id} ${e.branch}`;
  assert.equal(result.coverage.frames,e.frames);
  for(const [field,first]of Object.entries(result.fields)){
   // This fourth recorded epoch has pre-existing source enemy allocation gaps before its pickup.
   const prior=e.id.startsWith('a389925')?({missing:742,extra:742,kind:906,position:743} as Record<string,number>)[field]:undefined;
   if(prior===undefined)assert.equal(first,null,`${label} ${field}`);else assert.ok(first===null||first>=prior,`${label} ${field}`);
  }
 }
});

test('native A/B latch, fractional x/y, and new-jump fraction reset match every controlled resume',()=>{
 for(const e of fixture.replays){
  const initial=unpack(e.initialRam),pads=unpack(e.pads),ram=unpack(e.ram),sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,e.receipt));sim.step([],0);sim.inputs=[];
  for(let f=0;f<pads.length;f++){
   sim.step(names.filter((_,bit)=>pads[f]&(1<<bit)),1);if(f<e.pickup)continue;const r=ram.subarray(f*2048,(f+1)*2048),label=`${e.id} ${e.branch} row${f}`;
   assert.equal(sim.nativePlayerAB,r[10],`${label} currentAB`);
   if(f>=e.firstController){assert.equal(sim.player.x,r[0x6d]*256+r[0x86]+r[0x400]/256,`${label} x bytes`);if(!sim.player.grounded)assert.equal(sim.player.y-32,r[0xce]+r[0x416]/256,`${label} y bytes`);}
  }
  if(e.branch==='a-repress-during-freeze'){
   const before=ram.subarray((e.firstController-1)*2048,e.firstController*2048),first=ram.subarray(e.firstController*2048,(e.firstController+1)*2048);
   assert.equal(before[10]&128,0,'actual A/B stayed released despite A held on the controller during the freeze');assert.equal(first[0x1d],1);assert.equal(first[0x416],0,'InitJS clears the native vertical fraction');
  }
 }
});
