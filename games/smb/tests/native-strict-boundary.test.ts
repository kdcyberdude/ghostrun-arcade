import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {strictCompare} from '../tools/harness/native-strict.js';
import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
import run from '../evidence/native-runs/1-1.v2.json';

const initial=()=>new Uint8Array(zlib.gunzipSync(Buffer.from(run.initialRam,'base64')));
for(const mode of [0,2,3])test(`strict audit cannot pass after dropping same-level native mode ${mode}`,()=>{
 const start=initial(),ram=new Uint8Array(3*2048);
 for(let f=0;f<3;f++){ram.set(start,f*2048);ram[f*2048+0x770]=mode;}
 const result=strictCompare(decodeEntrance(start,{level:'1-1'}),[0,0,0],ram,'1-1');
 assert.equal(result.status,'incomplete');assert.equal(result.coverage.complete,false);assert.equal(result.firstCoverageGap,0);
 assert.equal(result.coverage.frames,0);assert.equal(result.coverage.uncomparedSameLevelFrames,3);
 assert.ok(result.coverage.endReason.includes(`unsupported same-level native mode ${mode}`));
 assert.equal(result.diagnostics[0].code,'unsupported-native-mode');assert.ok(result.diagnostics[0].detail.includes('3 remaining same-level frames'));
});
test('a natural native level change remains a scope boundary',()=>{
 const start=initial(),ram=initial();ram[0x75c]=1;
 const result=strictCompare(decodeEntrance(start,{level:'1-1'}),[0],ram,'1-1');
 assert.equal(result.coverage.endReason,'native level changed to 1-2');assert.equal(result.coverage.uncomparedSameLevelFrames,0);
 assert.ok(!result.diagnostics.some(d=>d.code==='unsupported-native-mode'));
});
