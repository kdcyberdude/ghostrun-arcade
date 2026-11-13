import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {compareRun} from '../tools/harness/native-divergence.js';import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-world11-bonus-cases.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const c of fixture.cases)test(`native bonus pipe body/feet/entry ${c.sha256.slice(0,12)} preserves every retained field`,()=>{
 const initial=unpack(c.initialRam),ram=unpack(c.ram),pads=unpack(c.pads);assert.equal(hash(initial),c.initialRamSha256);assert.equal(hash(ram),c.ramSha256);assert.equal(hash(pads),c.padsSha256);assert.equal(ram.length,c.frames*2048);
 const entrance=decodeEntrance(initial,c.receipt),result=compareRun(entrance,pads,f=>ram.subarray(f*2048,(f+1)*2048),'1-1'),strict=strictCompare(entrance,pads,ram,'1-1');
 assert.ok(Object.values(result.fields).every(v=>v===null),JSON.stringify(result));assert.ok(Object.values(strict.fields).every(v=>v===null),JSON.stringify(strict.fields));assert.equal(strict.coverage.frames,c.frames);assert.equal(strict.coverage.completeInputSequence,true);assert.deepEqual(strict.diagnostics,[]);
});
