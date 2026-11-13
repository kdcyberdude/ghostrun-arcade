import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import fixture from './fixtures/native-flag-runtime.json';import {strictCompare} from '../tools/harness/native-strict.js';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('strict replay covers every retained ordinary-flag/load frame and preserves all earlier firsts',()=>{
 let frames=0,continuations=0;
 for(const c of fixture.cases){
  const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),start=decodeEntrance(initial,c.receipt);
  let boundary=-1;for(let f=0;f<pads.length;f++){const r=ram.subarray(f*2048,(f+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==c.level){boundary=f;break;}}assert.ok(boundary>0,c.level);
  const prefix=strictCompare(start,pads.subarray(0,boundary),ram.subarray(0,boundary*2048),c.level),full=strictCompare(start,pads,ram,c.level);
  assert.equal(full.coverage.frames,pads.length,c.level);assert.equal(full.coverage.unsteppedFrames,0,c.level);assert.equal(full.coverage.continuationFrames,pads.length-boundary,c.level);assert.ok(full.coverage.flagFrames>0,c.level);
  for(const [field,first]of Object.entries(prefix.fields))if(first!==null)assert.equal(full.fields[field],first,`${c.level} preserves earlier ${field}`);
  assert.ok(full.identity.continuations.length>0,c.level);if(prefix.first!==null)assert.notEqual(full.status,'pass',c.level);
  frames+=full.coverage.frames;continuations+=full.coverage.continuationFrames;
 }
 assert.equal(frames,30604);assert.equal(continuations,1834);
});

test('a changed native coin byte in the final following-level row is compared, not discarded with the tail',()=>{
 const c=fixture.cases.find(c=>c.level==='3-2')!,initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),start=decodeEntrance(initial,c.receipt),baseline=strictCompare(start,pads,ram,c.level);
 assert.equal(baseline.fields.coins,null);const changed=ram.slice(),last=pads.length-1;changed[last*2048+0x75e]=(changed[last*2048+0x75e]+1)%100;
 const audit=strictCompare(start,pads,changed,c.level);assert.equal(audit.fields.coins,last);assert.equal(audit.coverage.frames,pads.length);assert.notEqual(audit.status,'pass');
 for(const [field,first]of Object.entries(baseline.fields))if(field!=='coins')assert.equal(audit.fields[field],first,`the one-byte counterexample preserves ${field}`);
});
