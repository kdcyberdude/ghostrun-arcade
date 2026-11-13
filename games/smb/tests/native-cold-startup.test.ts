import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {NativeColdStartup} from '../src/native-cold-startup.js';import source from '../data/native-cold-program.json';import fixture from './fixtures/native-cold-startup.json';
const cases=JSON.parse(zlib.gunzipSync(Buffer.from(fixture.proof,'base64')).toString()) as {pad:number;rows:({ram:string;frame:number;done:boolean;nmiCycles:number|null}&Record<string,any>)[]}[];
test('cold startup reproduces every CPU/PPU sample and RAM byte for all first-controller possibilities',()=>{
 assert.equal(cases.length,256);assert.equal(fixture.samples,1792);assert.equal(fixture.verifiedCapturePrefix,7);
 for(const c of cases){const s=new NativeColdStartup();assert.ok(s.ram.every(v=>v===255));
  for(const row of c.rows){s.step(c.pad);const {ram,frame,done,nmiCycles,...expected}=row;assert.deepEqual(s.snapshot(),expected,`pad${c.pad} PPU${frame} CPU/PPU`);assert.deepEqual(s.ram,new Uint8Array(Buffer.from(ram,'hex')),`pad${c.pad} PPU${frame} RAM`);assert.equal(s.done,done);assert.equal(s.nmiCycles??null,nmiCycles);}
  assert.equal(s.nmiCycles,71599);assert.equal(s.done,true);const snapshot=s.snapshot(),ram=s.ram.slice();s.step(c.pad^255);assert.deepEqual(s.snapshot(),snapshot,'normal title execution belongs to the next owner');assert.deepEqual(s.ram,ram);
 }
});
test('source program contains operations and cold-read table bytes, never sampled RAM or replay frames',()=>{
 assert.equal(source.instructions.length,407);assert.equal(source.data.length,17);assert.ok(source.instructions.every(r=>typeof r[1]==='string'&&typeof r[2]==='string'));assert.ok(source.data.every(([address])=>address>=0x8000));assert.equal(Object.hasOwn(source,'samples'),false);assert.equal(Object.hasOwn(source,'proof'),false);
});
