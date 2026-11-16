import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';import fixture from './fixtures/native-flag-score-cases.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const c of fixture.cases)test(`${c.sourcePadSha256.slice(0,8)}: flag engine keeps parser tasks, fireworks and every score row in native order`,()=>{
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),sim:any=new Simulation(observedLevels());
 // the stored decoded entrances predate the sound RAM seed; decodeEntrance reads it from the same initial RAM
 const entrance={...c.entrance,sound:{zeroPage:Array.from(initial.subarray(0xf0,0x100)),page7:Array.from(initial.subarray(0x7b0,0x7cb))}};sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];let flagRows=0,births=0,awards=0;
 for(const [bytes,expected]of [[initial,c.initialRamSha256],[pads,c.padsSha256],[ram,c.ramSha256]] as const)assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
 for(let f=0;f<pads.length;f++){
  const r=ram.subarray(f*2048,(f+1)*2048),scoreBefore=sim.score;sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const nativeScore=Array.from(r.subarray(0x7dd,0x7e3)).reduce((n,v)=>n*10+v,0)*10;assert.equal(sim.score,nativeScore,`score source${c.sourceFrameOffset+f}`);
  if(r[0x772]!==3||![4,5].includes(r[14]))continue;flagRows++;
  assert.equal(sim.parserClock.task,r[0x71f],`parser${f}`);assert.equal(sim.parserClock.scroll,r[0x73d],`parser scroll${f}`);
  assert.equal(sim.nativeFireworksCounter,r[0x6d7],`fireworks remaining${f}`);assert.equal(sim.nativeFrenzyTimer,r[0x78f],`frenzy interval${f}`);
  if(sim.nativeCastleFlag){assert.deepEqual([sim.nativeCastleFlag.task,sim.nativeCastleFlag.state,sim.nativeCastleFlag.interval],[r[0x746],r[0x1e+sim.nativeCastleFlag.slot],r[0x796+sim.nativeCastleFlag.slot]],`ID49${f}`);}
  const native=Array.from({length:6},(_,slot)=>({slot,flag:r[15+slot],id:r[0x16+slot],x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],timer:r[0xa0+slot],cell:r[0x58+slot]})).filter(e=>e.flag&&e.id===22),actual=sim.nativeFireworks.filter((e:any)=>e.active).map((e:any)=>({slot:e.slot,flag:1,id:22,x:e.x,y:e.y,timer:e.timer,cell:e.cell}));assert.deepEqual(actual,native,`firework bank${f}`);
  const previous=f?ram.subarray((f-1)*2048,f*2048):initial;births+=native.filter(e=>!previous[15+e.slot]).length;if(sim.score-scoreBefore===500)awards++;
 }
 assert.ok(flagRows>0);assert.ok(births>0);assert.equal(awards,births);
 const audit=strictCompare(entrance,pads,ram,c.level);assert.equal(audit.status,'pass',JSON.stringify(audit));assert.equal(audit.coverage.frames,pads.length);assert.equal(audit.coverage.unsteppedFrames,0);
});
