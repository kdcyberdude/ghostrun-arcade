import {test}from'node:test';import assert from'node:assert/strict';import zlib from'node:zlib';import{createHash}from'node:crypto';
import {Simulation}from'../src/simulation.js';import{observedLevels}from'../src/levels.js';import{decodeEntrance,initializeEntrance}from'../tools/harness/native-entrance.mjs';import type{Button}from'../src/types.js';
import fixture from'./fixtures/native-pole-walk-episodes.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),names:Button[]=['a','b','select','start','up','down','left','right'];
test('23 entrance-seeded native pole episodes retain every flag row and native camera position',()=>{
 assert.equal(fixture.cases.length,23);let inputs=0,compared=0;
 for(const c of fixture.cases){
  const initial=unpack(c.initial),pads=unpack(c.pads);assert.equal(sha(initial),c.initialSha256);assert.equal(sha(pads),c.padSha256);
  const s:any=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,decodeEntrance(initial,c.receipt));s.step([],0);s.inputs=[];
  const rows=new Map(c.rows.map(r=>[r[0],r]));
  for(let f=0;f<pads.length;f++){
   s.step(names.filter((_,b)=>pads[f]&(1<<b)),1);inputs++;const r=rows.get(f);if(!r)continue;compared++;
   assert.deepEqual([s.player.x,Math.round(s.player.vx*4096),s.player.climbing?3:s.player.grounded?0:2,Math.floor(s.player.y)-32],r.slice(1,5),`${c.sha256}:${c.index} native flag row ${f}`);
   assert.equal(Math.floor(s.camera),r[5],`${c.sha256}:${c.index} native camera row ${f}`);
  }
 }
 assert.equal(inputs,60253);assert.equal(compared,15020);
});
