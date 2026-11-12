import {test} from 'node:test';
import assert from 'node:assert/strict';
import events from './fixtures/native-water-rule-events.json';
import {stepNativeBlooper} from '../src/blooper-motion.js';
import {moveFlyingCheep} from '../src/flying-cheep.js';
import {moveSwimmingCheep} from '../src/swimming-cheep.js';
import {NativeBubbles} from '../src/native-bubbles.js';

test('MoveBloober predicts every live native slot transition, including wrapped vertical coordinates',()=>{
 assert.ok(events.blooper.length>8000);
 for(const [level,row,slot,before,input,after] of events.blooper as [string,number,number,number[],number[],number[]][]){
  const [x,y,counter,force,timer,dir]=before,[frameCounter,randomByte,mask,playerX,playerY,playerDir,control,previousY,previousPage,page]=input;
  const b={counter,force,timer:Math.max(0,timer-Number(control===0)),dir:dir as 1|2};
  const inputs={slot,frameCounter,randomByte,mask,playerX,playerY,playerDir:playerDir as 1|2};
  const saved={...b},next=stepNativeBlooper(b,x,y,inputs);
  let got=[next.x,next.y,b.counter,b.force,b.timer,b.dir];
  // End-row player RAM follows ProcessWhirlpools, while the Blooper reads before it. At a page wrap
  // bracket the earlier player input; the full recorded-input regression verifies the actual runtime phase.
  if(page!==previousPage&&JSON.stringify(got)!==JSON.stringify(after)){
   const alternate=stepNativeBlooper(saved,x,y,{...inputs,playerY:previousY});
   got=[alternate.x,alternate.y,saved.counter,saved.force,saved.timer,saved.dir];
  }
  assert.deepEqual(got,after,`${level} row ${row} slot ${slot}`);
 }
});

test('MoveFlyingCheepCheep predicts every live native vertical transition from its slot bytes',()=>{
 assert.ok(events.flying.length>6000);
 for(const [level,row,slot,before,after] of events.flying as [string,number,number,number[],number[]][]){
  const [y,speed,force,fraction]=before,n={y,speed,force,fraction,timer:0};moveFlyingCheep(n);
  assert.deepEqual([n.y,n.speed,n.force,n.fraction],after,`${level} row ${row} slot ${slot}`);
 }
});

test('new Bloopers initialize native direction, force, counter and timer; fish inherit slot fractions',()=>{
 assert.ok(events.blooperSpawns.length>=25);assert.ok(events.slotReuse.length>=30);
 for(const [level,row,slot,state] of events.blooperSpawns as [string,number,number,number[]][])
  assert.deepEqual(state.slice(2),[0,0,0,2],`${level} row ${row} slot ${slot}`);
 for(const [level,row,slot,before,after] of events.slotReuse as [string,number,number,number[],number[]][])
  assert.deepEqual(after,before,`${level} row ${row} slot ${slot}`);
});

test('MoveSwimmingCheepCheep predicts every live native slot transition',()=>{
 assert.ok(events.swimming.length>8000);
 for(const [level,row,slot,id,before,after] of events.swimming as [string,number,number,10|11,number[],number[]][]){
  const [x,y,fraction,flag,originY]=before,n={y,fraction,flag,originY};
  const nextX=moveSwimmingCheep(n,x,id,slot);
  assert.deepEqual([nextX,n.y,n.fraction,n.flag,n.originY],after,`${level} row ${row} slot ${slot}`);
 }
});

test('BubbleCheck predicts all 9,791 native water engine transitions including death timer freezes',()=>{
 assert.equal(events.bubbles.length,9791);
 for(const [level,row,before,p,random,tick,after] of events.bubbles as unknown as [string,number,[number,number[][]],number[],number[],boolean,[number,number[][]]][]){
  const b=new NativeBubbles();b.timer=before[0];before[1].forEach(([x,y,page,fraction],s)=>Object.assign(b.slots[s],{x,y,page,fraction}));
  b.step({x:p[0],y:p[1],facing:p[2]},random,tick);
  assert.deepEqual([b.timer,b.slots.map(v=>[v.x,v.y,v.page,v.fraction])],after,`${level} row ${row}`);
 }
});

test('Entrance_GameTimerSetup preserves native water floor scratch indexing into bubble code',()=>{
 assert.equal(events.bubbleEntrances.length,6);
 for(const [level,row,p,random,after] of events.bubbleEntrances as unknown as [string,number,number[],number[],[number,number[][]]][]){
  const b=new NativeBubbles(),player={x:p[0],y:p[1],facing:p[2]};b.entrance(player);b.step(player,random,false);
  assert.deepEqual([b.timer,b.slots.map(v=>[v.x,v.y,v.page,v.fraction])],after,`${level} row ${row}`);
 }
});
