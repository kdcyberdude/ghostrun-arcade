import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {nativeTransformRows,nativeTransformStep} from '../src/native-player-task.js';
import {Simulation,nativePiranhaStep} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-player-task.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),ends={grow:196,shrink:200,fire:192};

test('native transformation timers complete in GameRoutines after an NMI that still holds interval timers',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.rows.length,346);assert.equal(fixture.completions.length,6);assert.deepEqual(fixture.diagnostics,[]);
 assert.deepEqual(['grow','shrink','fire'].map(k=>nativeTransformRows(k as keyof typeof ends)),[59,55,63]);
 for(const e of fixture.rows){
  const kind=e.kind as keyof typeof ends,next=nativeTransformStep(kind,e.before.timer-ends[kind]);
  assert.equal(e.after.timer,next.done?0:next.timer);assert.equal(e.after.engine,next.done?8:e.before.engine);
  assert.equal(e.after.interval,e.before.interval);assert.equal(e.after.frame,(e.before.frame+1)&255);
 }
});

test('completion-row Piranha movement reads its unchanged NMI timer, including37 and49 held counts',()=>{
 let compared=0,held=0;
 for(const e of fixture.completions){
  const p=unpack(e.beforeRam),r=unpack(e.afterRam);
  for(let s=0;s<6;s++)if(p[15+s]&&p[22+s]===13){
   const n={y:p[0xcf+s],speed:(p[0x58+s]<<24)>>24,flag:p[0xa0+s],up:p[0x417+s],down:p[0x434+s],timer:p[0x78a+s]};
   nativePiranhaStep(n,p[0x6e+s]*256+p[0x87+s],r[0x6d]*256+r[0x86],r[9],false);
   assert.deepEqual([n.y,n.speed,n.flag,n.timer],[r[0xcf+s],(r[0x58+s]<<24)>>24,r[0xa0+s],r[0x78a+s]],`${e.id} row${e.row} slot${s}`);compared++;if(p[0x78a+s])held++;
  }
 }
 assert.equal(compared,6);assert.equal(held,2);
});

test('clean mood2-1 includes the complete DonePlayerTask world pass with every strict field exact',()=>{
 const e=fixture.replay!,initial=unpack(e.initialRam),ram=unpack(e.ram),pads=unpack(e.pads),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 assert.equal(sha(initial),e.initialRamSha256);assert.equal(sha(ram),e.ramSha256);assert.equal(pads.length,971);
 const result=strictCompare(decodeEntrance(initial,e.receipt),pads,ram,e.level);assert.equal(result.coverage.frames,971);
 for(const [field,first]of Object.entries(result.fields))assert.equal(first,null,field);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,e.receipt));sim.step([],0);sim.inputs=[];
 const buttons=['a','b','select','start','up','down','left','right'] as const;
 for(let f=0;f<pads.length;f++)sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);
 const r=ram.subarray(970*2048,971*2048),plant=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.kind==='piranha'&&e.enemySlot===0),para=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.kind==='paratroopa'&&e.enemySlot===4);
 assert.equal(sim.intervalControl,r[0x77f]);assert.equal(plant.pir.timer,r[0x78a]);assert.equal(Math.floor(para.x),r[0x72]*256+r[0x8b]);
 assert.equal(sim.powerChange,undefined);assert.equal(Math.floor(sim.player.y)-32,r[0xce]);
});
