import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import fixture from './fixtures/native-flag-runtime.json';import {strictCompare} from '../tools/harness/native-strict.js';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
for(const level of ['1-1','3-2','4-1','8-1'])test(`${level}: ordinary NextArea retains the old scene and compares every following load/input row exactly`,()=>{
 const c=fixture.cases.find(c=>c.level===level)!,initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),audit=strictCompare(decodeEntrance(initial,c.receipt),pads,ram,level);
 assert.equal(audit.status,'pass',JSON.stringify(audit));assert.equal(audit.coverage.frames,pads.length);assert.equal(audit.coverage.unsteppedFrames,0);assert.equal(audit.coverage.completeInputSequence,true);assert.ok(audit.coverage.continuationFrames>=166);assert.equal(audit.coverage.alignedFrames,pads.length);assert.equal(audit.coverage.comparedEntityRows,audit.coverage.nativeEntityRows);assert.deepEqual(audit.diagnostics,[]);
 for(const [field,first]of Object.entries(audit.fields))assert.equal(first,null,field);
});
test('source castle-entry rows compare literally while their unrelated firebar adapter remains explicit',()=>{
 const c=fixture.cases.find(c=>c.level==='1-3')!,pads=unpack(c.pads),audit=strictCompare(decodeEntrance(unpack(c.initial),c.receipt),pads,unpack(c.ram),c.level);
 assert.equal(audit.coverage.frames,pads.length);assert.equal(audit.coverage.unsteppedFrames,0);for(const [field,first]of Object.entries(audit.fields))assert.equal(first,null,field);
 // The fixture's seven declared castle firebars have no source slot adapter yet.
 // Their absence cannot become a complete-input claim merely because the load controls match.
 if(audit.diagnostics.some(g=>g.detail.startsWith('firebar:')))assert.equal(audit.coverage.completeInputSequence,false);
});

test('NextArea silence and SecondaryGameSetup area-music queues occur on their native PPU rows',async()=>{
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js'),{initializeEntrance}=await import('../tools/harness/native-entrance.mjs');let rows=0;
 for(const level of ['1-1','1-3','3-2','4-1','8-1']){const c=fixture.cases.find(c=>c.level===level)!,sim:any=new Simulation(observedLevels()),pads=unpack(c.pads),ram=unpack(c.ram);sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(c.initial),c.receipt));sim.step([],0);sim.inputs=[];
  for(let f=0;f<pads.length;f++){sim.step(['a','b','select','start','up','down','left','right'].filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`===level)continue;rows++;assert.deepEqual([sim.nativeEndLevelMusicQueue,sim.nativeEndLevelMusicAreaQueue,sim.nativeEndLevelMusic.eventMusicBuffer],[r[0xfc],r[0xfb],r[0x7b1]],`${level} source frame${f}`);}
 }
 assert.equal(rows,832);
});
