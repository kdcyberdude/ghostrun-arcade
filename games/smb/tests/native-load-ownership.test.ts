import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-load-ownership-cases.json';
const unpack=(s:string)=>zlib.gunzipSync(Buffer.from(s,'base64')),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),buttons=['a','b','select','start','up','down','left','right'] as const;
for(const c of fixture.cases)test(`${c.level}: initial terrain actors exist only after their native screen-parser callback`,()=>{
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(hash(initial),c.source.initialSha256);assert.equal(hash(pads),c.source.padsSha256);assert.equal(hash(ram),c.source.ramSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.entrance));sim.step([],0);sim.inputs=[];let births=0,prior=0;
 for(let f=0;f<pads.length;f++){
  sim.step(buttons.filter((_,b)=>pads[f]&(1<<b)),1);if(f<c.from)continue;const r=ram.subarray((f-c.from)*2048,(f-c.from+1)*2048);
  const n=Array.from({length:6},(_,s)=>s).filter(s=>r[15+s]&&[13,48].includes(r[22+s])).map(s=>[s,r[15+s],r[22+s],r[0x6e+s]*256+r[0x87+s]+sim.nativeAreaOffset,r[0xcf+s]]);
  const s=sim.enemies.filter((e:any)=>e.kind==='piranha'&&e.active&&!e.slotFreed&&e.dead<100).map((e:any)=>[e.enemySlot,1,13,Math.floor(e.x),Math.floor(e.y)-24]);const pole=sim.specialSlot5;if(pole.flag&&pole.id===48)s.push([5,pole.flag,48,pole.x,pole.y]);s.sort((a:number[],b:number[])=>a[0]-b[0]);
  assert.deepEqual(s,n,`source${f} callback ownership`);assert.equal(sim.parserColumnX,(r[0x725]*16+r[0x726])*16+sim.nativeAreaOffset,`source${f} parser column`);
  if(sim.levelLoad){assert.equal(sim.levelLoad.task,r[0x772]);assert.equal(sim.levelLoad.screen,r[0x73c]);}
  if(n.length>prior)births++;prior=n.length;
 }
 assert.ok(births>0,'native window contains the actual terrain callback');
});
