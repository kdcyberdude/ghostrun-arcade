import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictSimEntities} from '../tools/harness/native-strict-entities.js';
import run from '../evidence/native-runs/2-1.v2.json';import fixture from './fixtures/native-strict-springs.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('continuous native2-1 spring lifetime includes flag play and erases at the actual post-scroll boundary',()=>{
 const initial=unpack(run.initialRam),pads=unpack(run.pads),sim:any=new Simulation(observedLevels()),events=new Map(fixture.events.filter(e=>e[0]==='2-1').map(e=>[e[1],e]));
 assert.equal(createHash('sha256').update(initial).digest('hex'),run.source.initialRamSha256);assert.equal(fixture.sources.find(s=>s.level==='2-1')!.initialSha256,run.source.initialRamSha256);
 sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level:'2-1'}));sim.step([],0);sim.inputs=[];let expected:unknown[]=[],erasedAt=-1,flagRows=0;
 for(let frame=0;frame<run.frames;frame++){
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,bit)=>pads[frame]&(1<<bit)),1);const event=events.get(frame);
  if(event){const [, ,slot,flag,id,xLow,xPage,yLow,yPage]=event as [string,number,number,number,number,number,number,number,number];expected=flag&&id===50?[[slot,xPage*256+xLow,(yPage-1)*256+yLow]]:[];if(!flag){erasedAt=frame;assert.equal(sim.phase,'flag');}}
  const actual=strictSimEntities(sim).filter(e=>e.kind==='spring').map(e=>[e.slot,e.x,e.y]);assert.deepEqual(actual,expected,`native source frame${frame}`);if(sim.phase==='flag')flagRows++;
 }
 assert.equal(erasedAt,2203);assert.ok(flagRows>500);assert.equal(sim.springSlots.size,0);
});
test('flag actor dispatch erases a spring in slot order without reusing that same slot for frenzy on the erasure row',()=>{
 for(const springSlot of [0,1]){
  const sim:any=new Simulation(observedLevels());sim.reset(true);const spring={x:0,y:200};sim.springSlots.set(spring,springSlot);sim.camera=73;
  sim.nativeCastleFlag={slot:1-springSlot,x:1000,y:113,task:3,state:3,interval:0,draw:false};sim.nativeFireworksCounter=3;sim.nativeFrenzyTimer=0;sim.specialSlot5.frenzyBuffer=22;
  sim.runNativeFlagActors();assert.equal(sim.springSlots.has(spring),false);assert.equal(sim.slotReleaseFrame[springSlot],sim.frame);assert.equal(sim.nativeFireworks.length,1);assert.equal(sim.nativeFireworks[0].slot,2);
 }
});
