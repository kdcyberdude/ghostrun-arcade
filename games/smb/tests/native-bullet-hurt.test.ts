import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-bullet-hurt-events.json';

test('native frenzy Bullet hurt contacts retain their complete pre-movement position',()=>{
 assert.ok(fixture.events.length>0);
 for(const e of fixture.events){assert.equal(e.master,255);assert.equal(e.counter&1,0);assert.deepEqual(e.after,e.before,`${e.level} row${e.frame} slot${e.slot}`);}
});

test('recorded frenzy Bullet contact freezes its own movement before holding the later bank slots',()=>{
 const buttons=['a','b','select','start','up','down','left','right'] as const;
 for(const e of fixture.events){
  const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${e.level}.v2.json`,import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),pads=unpack(run.pads);
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(run.initialRam),{level:e.level}));sim.step([],0);sim.inputs=[];
  for(let f=0;f<=e.frame+8;f++){
   sim.step(buttons.filter((_,b)=>pads[f]&(1<<b)),1);if(f<e.frame)continue;
   const bullet=sim.enemies.find((b:any)=>b.active&&!b.dead&&!b.slotFreed&&b.kind==='bullet'&&b.frenzy&&b.enemySlot===e.slot);assert.ok(bullet);
   assert.equal(sim.phase,'dying');assert.equal(bullet.x,e.after.x+e.after.fraction/256,`${e.level} row${f} nativeX must hold`);assert.equal(bullet.y,e.after.y+24);
  }
 }
});
