import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,nativeFrenzyHeight,nativeImposeGravity} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
import events from './fixtures/native-enemy-rule-events.json';

// Native enemy rules checked against every event of the per-frame RAM traces of the 32 v2 recordings (tests/fixtures/native-enemy-rule-events.json, made by
// tools/harness/native-enemy-rule-events.mjs; a new recording of the same levels can be added by re-running it). Each rule reads only native state: the
// PseudoRandomBitReg bytes, the slot index, the cannon table and timers, IntervalTimerControl, EnemyIntervalTimer, BitMFilter, the 8.8 vertical state.
function fixture(level='fixture'){
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const area={id:'main',width:8192,palette:0,theme:'ground' as const,tiles,enemies:[],spawn:[40,208] as [number,number],evidence:'Synthetic native-rule fixture'};
 const sim=new Simulation([{id:level,time:400,main:'main',areas:[area],evidence:'Native-rule fixture'} as Level]);sim.reset(true);return sim as any;
}

test('BulletBillHandler keeps a cannon object only on screen and with Mario outside -40..38 px (252 of 252 native cannon objects)',()=>{
 for(const o of events.cannonObjects){
  const sim=fixture();sim.camera=o.cameraNext;sim.player.x=o.marioNext;
  sim.spawnNativeBullet(o.x,192,-1);const shot=sim.enemies[sim.enemies.length-1];Object.assign(shot,{enemySlot:o.slot,bbCheck:true,age:2});
  sim.nativeBulletBillCheck(shot);
  assert.equal(shot.dead===0,o.kept,`${o.level} row ${o.row}: x ${o.x} Mario ${o.marioNext} camera ${o.cameraNext}`);
  if(o.kept)assert.equal(Math.sign(shot.vx),o.x<o.marioNext?1:-1,'it flies toward Mario');
 }
});

// Rows where a slot became busy later in the same frame than the cannon pass sees it (not modelled): 7 of 10,652 table rows of the full traces.
const TIMER_EXCEPTIONS=new Set(['7-1/581','7-1/703','7-1/2580','7-1/2921','8-2/1450','8-2/1699','8-3/2414']);
test('cannon timers: each free slot s of 2..0 picks entry (random byte s+1 & mask), counting it down or restarting it at 14 (native table rows)',()=>{
 let checked=0;
 for(const row of events.cannonTimerRows){
  if(TIMER_EXCEPTIONS.has(`${row.level}/${row.row}`))continue;
  const sim=fixture(row.level);sim.camera=0;sim.player.x=0;
  sim.cannonTable=row.prev.map((timer:number,k:number)=>row.loaded[k]?{cannon:{x:4000+k*16,y:176,native:true},timer}:undefined);
  const used=new Set(row.busy.flatMap((b:boolean,s:number)=>b?[s]:[]));
  sim.nativeCannonPass(used,row.mask,[0,...row.bytes]);
  assert.deepEqual(sim.cannonTable.map((e:any,k:number)=>e?e.timer:row.next[k]),row.next,`${row.level} row ${row.row}`);checked++;
 }
 assert.ok(checked>400,`${checked} rows`);
});

test('a Podoboo relaunches with move force = random byte s+1 | 0x80 and EnemyIntervalTimer = (force & 15) | 6, speed -7 from y 514 (all native relaunches)',()=>{
 assert.ok(events.podobooLaunches.length>=50);
 for(const l of events.podobooLaunches){
  const sim=fixture();const bytes=[0,0,0,0,0,0,0];bytes[l.slot+1]=l.byte;sim.random.bytes=bytes;
  const e={kind:'podoboo',enemySlot:l.slot,pod:{y:300,speed:3,force:0,fraction:0,timer:0}} as any;
  sim.updateNativePodoboo(e);
  assert.equal(e.pod.timer,l.timer,`${l.level} row ${l.row} timer`);
  assert.equal((e.pod.force-28)&255,l.force,`${l.level} row ${l.row} force`);
  assert.ok(Math.abs(e.pod.y-l.y)<=1,`${l.level} row ${l.row} y ${e.pod.y} vs ${l.y}`); // 514 - 7 + the carry of the slot's fraction byte
 }
});

test('interval timers count down together once every 21 frames, when IntervalTimerControl wraps from 0 to 20 (native Podoboo rows)',()=>{
 for(const t of events.intervalTicks){
  const sim=fixture();sim.intervalControl=t.control;
  sim.enemies=t.timers.flatMap((pair:number[]|null,s:number)=>pair?[{kind:'podoboo',enemySlot:s,pod:{y:300,speed:0,force:0,fraction:0,timer:pair[0]}}]:[]);
  sim.tickIntervalTimers();
  assert.equal(sim.intervalControl,t.controlNext,`${t.level} row ${t.row}`);
  for(const e of sim.enemies){const [before,after]=t.timers[e.enemySlot]!;if(after>before)assert.equal(e.pod.timer,0,'a timer that reached 0 relaunches on that frame (previous test)');else assert.equal(e.pod.timer,after,`${t.level} row ${t.row} slot ${e.enemySlot}`);}
 }
});

test('MoveJ_EnemyVertically: y += speed + carry of fraction + force, speed += 28/256, capped at 3 (native Podoboo and jumping Paratroopa rows)',()=>{
 for(const g of events.gravityRows){
  const n={...g.before,timer:0};nativeImposeGravity(n,28,3);
  assert.deepEqual({y:n.y,speed:n.speed,force:n.force,fraction:n.fraction},g.after,`${g.level} row ${g.row} id ${g.id}`);
 }
});

test('the frenzy Bullet Bill height is the BitMFilter pick of random byte s (all native 5-3/6-3 frenzy Bullet Bills)',()=>{
 assert.ok(events.frenzyBullets.length>=18);
 for(const b of events.frenzyBullets){
  const pick=nativeFrenzyHeight(b.byte,b.bagBefore);
  assert.equal(pick.y,b.y,`${b.level} row ${b.row}`);assert.equal(pick.bag,b.bagAfter,`${b.level} row ${b.row} filter`);
 }
});
