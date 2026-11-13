import{test}from'node:test';import assert from'node:assert/strict';import zlib from'node:zlib';import{createHash}from'node:crypto';
import{NativeVramBuffer1,nativeColorRotationAllowed}from'../src/native-vram-buffer.js';import{Simulation}from'../src/simulation.js';import{observedLevels}from'../src/levels.js';import type{Button}from'../src/types.js';import fixture from'./fixtures/native-vram-buffer.json';
test('literal VRAM commands preserve duplicate bytes, repeat payloads and the native NMI selected-buffer cleanup',()=>{
 const q=new NativeVramBuffer1();for(let i=0;i<4;i++){q.append({address:0x207a,control:3,payload:[3,3,3-i]});q.append({address:0x2062,control:6,payload:[36,0,0,1,0,i]});}
 assert.equal(q.offset,60);assert.equal(nativeColorRotationAllowed(80,q.offset),false);q.select(true);q.beginFrame();assert.equal(q.offset,60);q.select(false);q.beginFrame();assert.equal(q.offset,0);assert.equal(q.data[1],0);
 q.append({address:0x2249,control:0x83,payload:[0xce,36,36]});assert.equal(q.offset,6);q.append({address:0x2000,control:0x42,payload:[36]});assert.equal(q.offset,10);
 for(let offset=0;offset<256;offset++)assert.equal(nativeColorRotationAllowed(80,offset),offset<49);
});
test('three continuous source prefixes reproduce raw0300 packet bytes, buffer selector and ColorRotateOffset across score pressure, palette and block writers',()=>{
 const names:Button[]=['a','b','select','start','up','down','left','right'];let compared=0,frames=0;
 for(const c of fixture.cases){
  const pads=new Uint8Array(zlib.gunzipSync(Buffer.from(c.pads,'base64')));assert.equal(createHash('sha256').update(pads).digest('hex'),c.padsSha256);
  const s=new Simulation(observedLevels());s.reset(false);const events=new Map(c.events.map(e=>[e.frame,e]));
  for(let f=0;f<pads.length;f++){s.step(names.filter((_,b)=>pads[f]&(1<<b)),1);frames++;const e=events.get(f);if(!e)continue;compared++;
   assert.equal(s.vramBuffer1.offset,e.offset,`${c.kind} native${f} offset`);assert.equal(s.vramBuffer1.addressControl,e.selector,`${c.kind} native${f} selector`);
   assert.deepEqual([...s.vramBuffer1.data.subarray(0,e.offset+2)],e.bytes,`${c.kind} native${f} exact command order/payloads`);assert.equal(s.colorRotations%6,e.rotation,`${c.kind} native${f} ColorRotateOffset`);
   if(c.kind==='flag')assert.equal(nativeColorRotationAllowed(e.counter,e.beforeColorOffset),e.colorAccepted);
  }
 }
 assert.equal(compared,30);assert.ok(frames>4500);
});
