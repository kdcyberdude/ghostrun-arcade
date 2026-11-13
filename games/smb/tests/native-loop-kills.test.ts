import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {nativePlatformObject} from '../src/platform-motion.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-loop-kills.json';

test('all native castle loopbacks erase flags, IDs and state in the complete normal enemy bank',()=>{
 assert.ok(fixture.events.length>=10);
 for(const event of fixture.events)for(const n of event.after){assert.equal(n.flag,0,`${event.level} row${event.frame} slot${n.slot}`);assert.equal(n.id,0);assert.equal(n.state,0);}
});

test('actual castle replay loopbacks erase every bank owner immediately and retain the current movement residues',()=>{
 const buttons=['a','b','select','start','up','down','left','right'] as const;
 for(const level of ['4-4','7-4','8-4']){
  const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(run.initialRam),{level}));sim.step([],0);sim.inputs=[];
  const pads=unpack(run.pads),through=Math.min(pads.length,...['dead','cam','x','y'].flatMap(k=>run.firsts[k]===null?[]:[run.firsts[k]])),original=sim.nativeLoopCommand;let loops=0;
  sim.nativeLoopCommand=function(){
   const camera=this.camera,sub=[...this.slotSub],vertical=structuredClone(this.slotVertical);original.call(this);if(this.camera>camera-1000)return;
   loops++;assert.equal(this.platformSlots.size,0,'platform flags clear on the loop row');assert.equal(this.firebarSlots?.held().size??0,0);
   assert.equal(this.springSlots.size,0);assert.ok(!this.frenzyControllers.some((c:any)=>c.slot!==undefined&&c.slot<5));
   assert.ok(!this.enemies.some((e:any)=>e.active&&e.enemySlot<5));assert.ok(!this.items.some((i:any)=>i.nativeFlame?.slot<5));
   assert.deepEqual(this.slotSub,sub);assert.deepEqual(this.slotVertical,vertical,'KillAllEnemies retains the last movement bytes');
   for(const platform of this.area.platforms??[]){const o=nativePlatformObject(platform,this.platformMotion.context);if(o)assert.equal(this.platformMotion.lost.has(platform),o.x<this.camera+256);}
  };
  // Stop at the recording's pre-existing player/death divergence; later
  // loops depend on that earlier failure and are not claimed by this test.
  for(const pad of pads.subarray(0,through))sim.step(buttons.filter((_,b)=>pad&(1<<b)),1);
  assert.equal(loops,fixture.events.filter(e=>e.level===level&&e.frame<through).length,`${level} native loop count`);
 }
});
