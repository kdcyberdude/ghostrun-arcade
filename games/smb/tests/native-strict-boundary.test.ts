import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {strictCompare} from '../tools/harness/native-strict.js';
import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
import run from '../evidence/native-runs/1-1.v2.json';

const initial=()=>new Uint8Array(zlib.gunzipSync(Buffer.from(run.initialRam,'base64')));
for(const mode of [0,3])test(`strict audit cannot pass after dropping same-level native mode ${mode}`,()=>{
 const start=initial(),ram=new Uint8Array(3*2048);
 for(let f=0;f<3;f++){ram.set(start,f*2048);ram[f*2048+0x770]=mode;}
 const result=strictCompare(decodeEntrance(start,{level:'1-1'}),[0,0,0],ram,'1-1');
 assert.equal(result.status,'incomplete');assert.equal(result.coverage.complete,false);assert.equal(result.firstCoverageGap,0);
 assert.equal(result.coverage.frames,0);assert.equal(result.coverage.uncomparedSameLevelFrames,3);
 assert.ok(result.coverage.endReason.includes(`unsupported same-level native mode ${mode}`));
 assert.equal(result.diagnostics[0].code,'unsupported-native-mode');assert.ok(result.diagnostics[0].detail.includes('3 remaining same-level frames'));
});
test('a logical level change cannot truncate retained strict input',()=>{
 const start=initial(),ram=initial();ram[0x75c]=1;
 const result=strictCompare(decodeEntrance(start,{level:'1-1'}),[0],ram,'1-1');
 assert.equal(result.coverage.endReason,'end of trace');assert.equal(result.coverage.frames,1);assert.equal(result.coverage.continuationFrames,1);assert.equal(result.coverage.unsteppedFrames,0);assert.equal(result.fields.level,0);assert.notEqual(result.status,'pass');assert.equal(result.coverage.uncomparedSameLevelFrames,0);
 assert.ok(!result.diagnostics.some(d=>d.code==='unsupported-native-mode'));
});

test('same-level mode2 is stepped even without a remake victory owner, and cannot produce a false pass',()=>{
 const start=initial(),ram=new Uint8Array(3*2048);for(let f=0;f<3;f++){ram.set(start,f*2048);ram[f*2048+0x770]=2;}
 const result=strictCompare(decodeEntrance(start,{level:'1-1'}),[0,0,0],ram,'1-1');assert.equal(result.coverage.frames,3);assert.equal(result.coverage.victoryFrames,3);assert.equal(result.coverage.uncomparedSameLevelFrames,0);assert.equal(result.coverage.complete,false);assert.equal(result.fields['victory.owned'],0);assert.ok(result.diagnostics.some(d=>d.code==='native-victory-not-owned'));assert.notEqual(result.status,'pass');
});

test('strict coverage cannot pass a truncated RAM/input pair or empty retained input',()=>{
 const start=initial(),entrance=decodeEntrance(start,{level:'1-1'});
 const short=strictCompare(entrance,[0,0],start,'1-1');assert.equal(short.coverage.frames,1);assert.equal(short.coverage.unsteppedFrames,1);assert.equal(short.coverage.completeInputSequence,false);assert.ok(short.diagnostics.some(d=>d.code==='input-ram-length-mismatch'));assert.notEqual(short.status,'pass');
 const empty=strictCompare(entrance,[],new Uint8Array(),'1-1');assert.equal(empty.coverage.completeInputSequence,false);assert.equal(empty.status,'incomplete');assert.ok(empty.diagnostics.some(d=>d.code==='empty-native-input'));
});

test('native retained-scene provenance is recognized while an unowned following UI load remains explicit',()=>{
 const start=initial(),ram=new Uint8Array(4096);ram.set(start);ram.set(start,2048);ram[2048+0x75c]=1;ram[2048+0x772]=1;
 const audit=strictCompare(decodeEntrance(start,{level:'1-1'}),[0,0],ram,'1-1');assert.equal(audit.coverage.frames,2);assert.equal(audit.fields.level,1);assert.ok(audit.diagnostics.some(d=>d.code==='native-load-control-not-owned'));assert.ok(!audit.diagnostics.some(d=>d.code==='post-level-scene-transition'),'matching original compiled ROM source is not a permanently unsupported native behavior');assert.notEqual(audit.status,'pass');
});
