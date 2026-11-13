import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';import fixture from './fixtures/native-startup-controls.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const c of fixture.cases)test(`${c.name}: continuous source POWER-ON controls through title and first World1-1 PlayerRdy`,()=>{
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),sim:any=new Simulation(observedLevels());sim.reset(false);assert.deepEqual(sim.nativeColdRam,initial);assert.ok(sim.nativeStartup.initializing);assert.equal(sim.inputs.length,0);
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048);sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const owner=sim.nativeStartup??sim.nativeScreen;
  const mode=sim.nativeStartup?.mode??(sim.levelLoad?1:sim.phase==='play'?1:undefined),task=owner?.task??(sim.phase==='play'?3:undefined),engine=owner?.engine??(sim.phase==='play'?8:undefined),screen=owner?.screen??12,disable=owner?.disable??0;
  assert.deepEqual([mode,task,engine,screen,disable],[r[0x770],r[0x772],r[14],r[0x73c],r[0x774]],`source controls${f}`);
  assert.deepEqual([sim.random.frame,sim.intervalControl,sim.random.bytes],[r[9],r[0x77f],Array.from(r.subarray(0x7a7,0x7ae))],`source clocks${f}`);
  if(sim.nativeColdRam)assert.deepEqual(sim.nativeColdRam,r,`full CPU cold RAM${f}`);
  if(r[0x770]!==1)continue;
  assert.equal(sim.nativeStartup,undefined,`source mode1 load owns transition${f}`);if(owner){assert.equal(owner.columns,r[0x71e],`source column sets${f}`);assert.equal(owner.timer,r[0x7a0],`source screen timer${f}`);}if(r[0x772]===3&&r[14]>=7)assert.equal(sim.colorRotations%6,r[0x6d4],`source GameEngine color rotation${f}`);
  assert.deepEqual([sim.score,sim.coins,sim.time,Math.floor(sim.camera),Math.floor(sim.player.x),Math.floor(sim.player.y)-32],[0,r[0x75e],r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],r[0x71a]*256+r[0x71c],r[0x6d]*256+r[0x86],(r[0xb5]-1)*256+r[0xce]],`World1-1 state${f}`);
  assert.equal(sim.parserColumnX,r[0x725]*256+r[0x726]*16,`source parser column${f}`);assert.equal(sim.areaControls.locked,Boolean(r[0x723]),`source scroll lock${f}`);
  const entities=strictEntityDifferences(strictNativeEntities(r),strictSimEntities(sim));assert.deepEqual(entities.mismatches,[],`source actor bank${f}`);assert.deepEqual(entities.gaps,[],`native actor coverage${f}`);
 }
 assert.equal(c.rows.length,pads.length);
});
