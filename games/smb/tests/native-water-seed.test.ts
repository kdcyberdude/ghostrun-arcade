import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeNativeWater,initializeNativeWater} from '../tools/harness/native-water-seed.mjs';
import cases from './fixtures/native-water-seed-cases.json';

for(const c of cases)test(`one-time native water snapshot ${c.level} row ${c.row} predicts the following 200 frames`,()=>{
 const r=zlib.gunzipSync(Buffer.from(c.initial,'base64')),sim:any=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex((l:any)=>l.id===c.level);sim.loadArea(c.area);sim.phase='play';sim.phaseFrame=0;
 // The general source profile owns these common fields; this test exercises
 // only the independent water hook without changing that shared adapter.
 sim.camera=r[0x71a]*256+r[0x71c];sim.random.bytes=Array.from(r.subarray(0x7a7,0x7ae));sim.random.frame=r[9];sim.broClock=r[9];sim.intervalControl=r[0x77f];sim.alignLifeClock(r[0x77f]);
 sim.time=r[0x7f8]*100+r[0x7f9]*10+r[0x7fa];sim.timerFrames=r[0x787]===0?23:(24-r[0x787])%24;sim.score=Array.from(r.subarray(0x7dd,0x7e3)).reduce((a,b)=>a*10+b,0)*10;sim.coins=r[0x75e];sim.lives=r[0x75a]+1;
 sim.player.size=r[0x756];sim.player.facing=r[0x33]===2?-1:1;sim.secondaryHardMode=Boolean(r[0x6cc]);sim.colorRotations=r[0x6d4];sim.playerAnim.reset(r[0x70d],r[0x781],r[0x70c],false);
 Object.assign(sim.specialSlot5,{frenzyQueue:r[0x6cd],frenzyBuffer:r[0x6cb]});sim.parserClock.task=r[0x71f];sim.parserClock.scroll=r[0x73d];
 const state=JSON.parse(JSON.stringify(decodeNativeWater(r)));initializeNativeWater(sim,state);sim.step([],0);sim.inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'];
 for(let i=0;i<c.pads.length;i++){
  sim.step(names.filter((_,bit)=>c.pads[i]&(1<<bit)),1);
  const got=[Math.floor(sim.player.x),(Math.floor(sim.player.y)-32)&255,Math.floor(sim.camera),sim.water.speed&255,sim.water.force,sim.water.frac,sim.bubbleState.timer,sim.bubbles.map((b:any)=>[b.x,b.y,b.page,b.fraction])];
  assert.deepEqual(got,c.expected[i],`source row ${c.row+i+1}`);
 }
});
