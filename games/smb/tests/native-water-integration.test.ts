import {test} from 'node:test';
import waterEvents from './fixtures/native-water-rule-events.json';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import type {Excerpt} from '../tools/harness/native-excerpt.js';
import {excerptReplay} from '../tools/harness/native-excerpt.js';
import type {Button} from '../src/types.js';
import {nativeEntities,simEntities,unmatchedEntity} from '../tools/harness/native-entities.js';

function replay(level:string){
 const excerpt:Excerpt=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8'));
 const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
 const pads=unpack(excerpt.pads),ram=unpack(excerpt.ram),initial=unpack(excerpt.initialRam);
 const sim=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level}));sim.step([],0);(sim as unknown as {inputs:Set<Button>[]}).inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'];
 return {sim,pads,row(f:number){const r=new Uint8Array(2048);excerpt.addrs.forEach((a,i)=>r[a]=ram[f*excerpt.addrs.length+i]);return r;},step(f:number){sim.step(names.filter((_,b)=>pads[f]&(1<<b)),1);}};
}

for(const level of ['1-2','2-2','4-2','7-2'])test(`${level} automatic pipe load preserves native random register and resets FrameCounter`,()=>{
 const run=replay(level),area=run.sim.area.id;
 for(let f=0;f<run.pads.length;f++){
  run.step(f);if(run.sim.area.id===area)continue;
  const r=run.row(f);
  assert.equal(run.sim.random.frame,r[9],`frame ${f}`);
  assert.deepEqual(run.sim.random.bytes,Array.from(r.slice(0x7a7,0x7ae)),`frame ${f}`);
  assert.equal(run.sim.intervalControl,0,'native $077F at the room load (all four native traces)');
  return;
 }
 assert.fail('did not reach room load');
});

test('7-3 native offscreen fall keeps engine 8, player motion, camera, and timer until engine 6',()=>{
 const run=replay('7-3'),sim=run.sim;
 for(let f=0;f<=838;f++){
  run.step(f);if(f<572)continue;
  const r=run.row(f),where=`frame ${f}`;
  assert.equal(sim.phase,r[14]===8?'play':r[14]===6?'dying':'intro',where);
  if(r[14]===8){
   assert.equal(sim.player.dead,false,where);
   assert.equal(Math.floor(sim.player.x),r[0x6d]*256+r[0x86],`${where} x`);
   assert.equal((Math.floor(sim.player.y)-32)&255,r[0xce],`${where} y`);
   assert.equal(Math.floor(sim.camera),r[0x71a]*256+r[0x71c],`${where} camera`);
   assert.equal(sim.time,r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],`${where} timer`);
  }
 }
 assert.equal(sim.lives,2,'native PlayerLoseLife decrements lives after the engine-6 row');
});

test('2-3 native stream fish and slot reuse preserve all enemy positions through the full recording',()=>{
 const run=replay('2-3'),sim=run.sim;let frames=0;
 for(let f=0;f<run.pads.length;f++){
  run.step(f);const r=run.row(f);
  if(r[0x770]!==1||r[0x75f]!==1||r[0x75c]!==2||sim.level.id!=='2-3')break;
  if(r[14]!==8||sim.phase!=='play')continue;
  assert.equal(unmatchedEntity(nativeEntities(r,f?run.row(f-1):undefined),simEntities(sim)),undefined,`frame ${f}`);
  assert.equal(sim.player.dead,false,`frame ${f}`);
  assert.equal(Math.floor(sim.player.x),r[0x6d]*256+r[0x86],`frame ${f} x`);
  assert.equal((Math.floor(sim.player.y)-32)&255,r[0xce],`frame ${f} y`);
  assert.equal(Math.floor(sim.camera),r[0x71a]*256+r[0x71c],`frame ${f} camera`);
  frames++;
 }
 assert.ok(frames>1000);
});

for(const [level,through] of [['2-2',6395],['7-2',2208]] as const)test(`${level} swimming entry, whirlpool scroll and offscreen page wraps match native through frame ${through}`,()=>{
 const run=replay(level),sim=run.sim;let frames=0;
 for(let f=0;f<=through;f++){
  run.step(f);const r=run.row(f);
  if(r[14]!==8||sim.phase!=='play')continue;
  assert.equal(Math.floor(sim.player.x),r[0x6d]*256+r[0x86],`frame ${f} x`);
  assert.equal((Math.floor(sim.player.y)-32)&255,r[0xce],`frame ${f} y`);
  assert.equal(Math.floor(sim.camera),r[0x71a]*256+r[0x71c],`frame ${f} camera`);
  assert.equal(sim.time,r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],`frame ${f} timer`);
  assert.equal(sim.player.dead,false,`frame ${f}`);frames++;
 }
 assert.ok(frames>500);
});

for(const level of ['2-2','7-2'])test(`${level} recorded decisions have no divergence in any legacy comparison field`,()=>{
 const excerpt:Excerpt=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8'));
 assert.ok(Object.values(excerptReplay(excerpt).fields).every(value=>value===null));
});

test('2-2 Bloopers read Mario before the trailing whirlpool pass across his y-byte wrap',()=>{
 const run=replay('2-2'),sim=run.sim;
 for(let f=0;f<=1508;f++){
  run.step(f);if(f<1488)continue;
  const native=nativeEntities(run.row(f),run.row(f-1)).filter(e=>e.kind==='blooper');
  assert.equal(unmatchedEntity(native,simEntities(sim)),undefined,`frame ${f}`);
 }
});

test('7-2 placed Bloopers wait for slots and swimming frenzy respects erase and parser rows',()=>{
 const run=replay('7-2'),sim=run.sim,checks=new Map([[482,0],[520,1],[2362,3],[2363,3],[2424,1],[2425,1],[2430,2],[2431,2],[2432,2]]);
 for(let f=0;f<=2432;f++){
  run.step(f);const slot=checks.get(f);if(slot===undefined)continue;
  const r=run.row(f),enemy=sim.enemies.find(e=>e.active&&!e.dead&&e.enemySlot===slot);
  assert.equal(Boolean(enemy),Boolean(r[15+slot]),`frame ${f} slot ${slot} active`);
  if(enemy){
   assert.equal(Math.floor(enemy.x),r[0x6e+slot]*256+r[0x87+slot],`frame ${f} slot ${slot} x`);
   assert.equal(Math.floor(enemy.y)-24,r[0xcf+slot],`frame ${f} slot ${slot} y`);
  }
 }
});

test('7-2 injury preserves the water position fraction and ends its second death on the native row',()=>{
 const run=replay('7-2'),sim=run.sim;
 for(let f=0;f<=2950;f++){
  run.step(f);if(f<2713)continue;
  const r=run.row(f);
  assert.equal(sim.phase,r[14]===11||r[14]===6?'dying':'intro',`frame ${f}`);
  if(r[14]===11||r[14]===6)assert.equal((Math.floor(sim.player.y)-32)&255,r[0xce],`frame ${f} y`);
 }
});

for(const [level,end] of [['2-2',Infinity],['7-2',Infinity]] as const)test(`${level} bubble lifecycle matches native slots through every otherwise exact replay row`,()=>{
 const run=replay(level),expected=new Map<number,[number,number[][]]>();
 for(const [id,row,,,,,after] of waterEvents.bubbles as unknown as [string,number,unknown,unknown,unknown,unknown,[number,number[][]]][])if(id===level)expected.set(row,after);
 for(const [id,row,,,after] of waterEvents.bubbleEntrances as unknown as [string,number,unknown,unknown,[number,number[][]]][])if(id===level)expected.set(row,after);
 let checked=0;
 for(let f=0;f<run.pads.length&&f<=end;f++){
  run.step(f);const after=expected.get(f);if(!after)continue;
  assert.deepEqual([run.sim.bubbleState.timer,run.sim.bubbles.map(b=>[b.x,b.y,b.page,b.fraction])],after,`frame ${f}`);checked++;
 }
 assert.ok(checked>3000);
});

// Native 2-2 rows 4126–4131: right wall hit while Down preserves the
// fractional speed, the next floor row restores collision bits, and releasing
// Down accelerates with the old facing left / moving right friction multiplier.
test('water floor Down consumes a wall mask before steering resumes',()=>{
 const run=replay('2-2'),expected=[[208,128],[208,128],[512,160],[664,192],[816,240],[200,32]];
 for(let f=0;f<=4131;f++){
  run.step(f);if(f<4126)continue;
  const [speed,fraction]=expected[f-4126];
  assert.equal(Math.round(run.sim.player.vx*4096),speed,`frame ${f} speed`);
  assert.equal(Math.round((run.sim.player.x%1)*256),fraction,`frame ${f} position fraction`);
 }
});

// These two wall reversals differ in the stale Player_XSpeedAbsolute: 3
// versus14. GetPlayerAnimSpeed clears the force only below11.
test('swimming wall reversal uses the last friction absolute byte for skid stopping',()=>{
 const run=replay('2-2'),expected=new Map([[4276,[-152,240]],[6232,[-88,0]],[6233,[-240,240]],[6234,[-392,208]],[6235,[-544,160]]]);
 for(let f=0;f<=6235;f++){
  run.step(f);const pair=expected.get(f);if(!pair)continue;
  assert.equal(Math.round(run.sim.player.vx*4096),pair[0],`frame ${f} speed`);
  assert.equal(Math.round((run.sim.player.x%1)*256),pair[1],`frame ${f} fraction`);
 }
});

for(const [level,from,to,slots] of [['7-2',1118,1330,[0,2,3]],['2-2',2810,3021,[0,1]],['7-2',2713,2949,[0,1,2,3]],['2-2',6396,6596,[0,1,2]]] as const)test(`${level} native water injury holds the hitting slot and later slots through the death arc at ${from}`,()=>{
 const run=replay(level);
 for(let f=0;f<=to&&f<run.pads.length;f++){
  run.step(f);if(f<from)continue;const r=run.row(f);
  for(const slot of slots){
   if(!r[0xf+slot])continue;
   const e=run.sim.enemies.find(e=>e.active&&!e.dead&&!e.slotFreed&&e.enemySlot===slot);assert.ok(e,`frame ${f} slot ${slot}`);
   assert.equal(Math.floor(e.x),r[0x6e+slot]*256+r[0x87+slot],`frame ${f} slot ${slot} x`);
   assert.equal(Math.floor(e.y)-24,r[0xcf+slot],`frame ${f} slot ${slot} y`);
  }
 }
});

test('odd-slot Bloopers use the retained native moving direction when Mario speed byte is zero',()=>{
 const run=replay('7-2');
 for(let f=0;f<=2558;f++){
  run.step(f);if(f<2554)continue;const r=run.row(f);
  for(const slot of [1,3]){
   const e=run.sim.enemies.find(e=>e.active&&!e.dead&&!e.slotFreed&&e.enemySlot===slot);assert.ok(e?.bloop,`frame ${f} slot ${slot}`);
   assert.equal(Math.floor(e.x),r[0x6e+slot]*256+r[0x87+slot],`frame ${f} slot ${slot} x`);
   assert.equal(Math.floor(e.y)-24,r[0xcf+slot],`frame ${f} slot ${slot} y`);
  }
 }
});
