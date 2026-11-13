import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {nativeAreaBindings} from '../tools/harness/native-area-identity.js';import {decodeNativeGameOver} from '../src/native-game-over.js';import fixture from './fixtures/native-game-over-cases.json';import {strictCompare} from '../tools/harness/native-strict.js';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const c of fixture.cases)test(`${c.branch.kind}/${c.branch.variant}: runtime owns each genuine game-over snapshot row through termination`,()=>{
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),level=`${initial[0x75f]+1}-${initial[0x75c]+1}`,sim:any=new Simulation(observedLevels()),model=sim.levels.find((l:any)=>l.id===level),binding=nativeAreaBindings(model).bindings.find(b=>b.data===initial[0xe7]+256*initial[0xe8])!;
 sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level},binding));sim.step([],0);sim.inputs=[];
 for(let f=0;f<pads.length;f++){
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048);
  assert.deepEqual(sim.nativeGameOver,decodeNativeGameOver(r),`source${c.events[f].frame}`);assert.equal(sim.intervalControl,r[0x77f],`interval${f}`);assert.equal(sim.random.frame,r[9],`counter${f}`);assert.deepEqual(sim.random.bytes,Array.from(r.subarray(0x7a7,0x7ae)),`RNG${f}`);
  if(c.events[f].eventQueue)assert.equal(sim.nativeEndLevelMusicQueue,c.events[f].eventQueue,`event queue${f}`);
 }
 assert.equal(sim.phase,'title'); // Subsequent title frames are outside this game-over controller proof.
});

test('strict mode3 audit compares owned controls and explicitly stops at the unimplemented title continuation',()=>{
 for(const c of fixture.cases){
  const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),level=`${initial[0x75f]+1}-${initial[0x75c]+1}`,model=observedLevels().find(l=>l.id===level)!,binding=nativeAreaBindings(model).bindings.find(b=>b.data===initial[0xe7]+256*initial[0xe8])!;
  const audit=strictCompare(decodeEntrance(initial,{level},binding),pads,ram,level);
  for(const [key,first]of Object.entries(audit.fields))if(key.startsWith('gameover.'))assert.equal(first,null,`${c.branch.kind}/${c.branch.variant} ${key}`);
  assert.equal(audit.coverage.frames,pads.length-1);assert.equal(audit.coverage.unsteppedFrames,1);assert.equal(audit.coverage.completeInputSequence,false);assert.ok(audit.diagnostics.some(g=>g.code==='unsupported-native-mode'&&g.detail.startsWith('mode=0,')));
 }
});
