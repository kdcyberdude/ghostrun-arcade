import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeCoinSlot,nativeMiscGravity,nativeMiscOffscreen,nativeHammerBox,nativeHammerContact,type NativeBox} from '../src/native-misc.js';
import {Simulation} from '../src/simulation.js';
import events from './fixtures/native-enemy-rule-events.json';

test('native jumping coins allocate the highest free misc slot, or overwrite slot 8',()=>{
 assert.ok(events.coinSpawns.length>0);
 for(const e of events.coinSpawns)assert.equal(nativeCoinSlot(new Set(e.busy)),e.slot,`${e.level} row ${e.row}`);
 assert.equal(nativeCoinSlot(new Set([6,7,8])),8);
});

test('misc gravity and jumping coin number timers match native rows',()=>{
 assert.ok(events.miscRows.length>0);
 for(const e of events.miscRows){
  const n={...e.before,slot:e.slot},at=`${e.level} row ${e.row} slot ${e.slot}`;
  let y=n.y,x=n.x;
  if(n.state===1||n.state===0x81){y=nativeMiscGravity(n,y,n.state===1?0x50:0x10,n.state===1?6:4);if(n.state===1&&n.speed===5)n.state++;}
  else{n.state++;x+=e.scroll;if(n.state===48)continue;}
  if(n.state<0x80&&n.state>=2&&!(e.frame&1))y--;
  assert.deepEqual([y,n.speed,n.force,n.fraction],[e.after.y,e.after.speed,e.after.force,e.after.fraction],at);
  if(n.state<0x80)assert.equal(x,e.after.x,at);
  if(n.state===0x81)assert.deepEqual(nativeHammerBox(e.after.x,e.after.y,e.camera,e.checkX),e.box,at);
 }
});

test('native misc offscreen bit tables match the last processed object on native rows',()=>{
 for(const e of events.miscOffscreenRows)assert.equal(nativeMiscOffscreen(e.x,e.y,e.camera),e.bits,`${e.level} row ${e.row}`);
});

test('odd-frame native hammer contact uses cached boxes, reverses once and preserves its latch',()=>{
 assert.ok(events.hammerContacts.length>0);
 for(const e of events.hammerContacts){
  const n={slot:e.slot,state:0x81,speed:0,force:0,fraction:0,collision:e.latch,box:e.box as NativeBox};
  const hit=nativeHammerContact(n,e.player as NativeBox,e.frame,e.priorMisc?nativeMiscOffscreen(e.priorMisc.x,e.priorMisc.y,e.priorMisc.camera):e.offscreen),at=`${e.level} row ${e.row}`;
  assert.equal(n.collision,e.nextLatch,at);assert.equal(hit?-e.speed:e.speed,e.nextSpeed,at);
 }
});

test('hammer contact includes touching edges, runs only on odd frames, and latches until separation',()=>{
 const n={slot:0,state:0x81,speed:0,force:0,fraction:0,collision:false,box:[2,100,10,108] as NativeBox},player:[number,number,number,number]=[10,100,20,112];
 assert.equal(nativeHammerContact(n,player,2,0),false);assert.equal(n.collision,false);
 assert.equal(nativeHammerContact(n,player,3,1),false);assert.equal(n.collision,false);
 assert.equal(nativeHammerContact(n,player,3,0),true);assert.equal(n.collision,true);
 assert.equal(nativeHammerContact(n,player,5,0),false);
 n.box=[0,0,8,8];assert.equal(nativeHammerContact(n,player,7,0),false);assert.equal(n.collision,false);
 n.box=[2,100,10,108];assert.equal(nativeHammerContact(n,player,9,0),true);
});

test('native misc clipping reads the aliased object position, separately from the hammer position',()=>{
 assert.deepEqual(nativeHammerBox(1840,87,1641,0),[0,87,0,95]);
 assert.deepEqual(nativeHammerBox(1840,87,1641,1840),[199,87,207,95]);
});

test('block-object aliases used by misc clipping follow native bounce and shatter slots',()=>{
 for(const event of events.blockAliasRows){
  const context={nativeBlocks:structuredClone(event.before)};
  (Simulation.prototype as any).advanceNativeBlocks.call(context);
  assert.deepEqual(context.nativeBlocks,event.after,`${event.level} row ${event.row}`);
 }
});

test('simulation coin misc pass preserves native arc, floating-number state, scroll and erasure',()=>{
 for(const event of events.miscRows.filter(e=>e.before.state>0&&e.before.state<48)){
  const i={kind:'coin',x:event.before.x,y:event.before.y,vy:0,life:1000,nativeCoin:{...event.before,slot:event.slot}};
  const context={random:{frame:event.frame},lakituScroll:event.scroll,camera:event.camera-event.scroll,miscPositions:Array.from({length:9},()=>({x:0,y:0})),miscHammerBytes:Array.from({length:9},()=>({force:0,fraction:0}))};
  (Simulation.prototype as any).moveNativeCoin.call(context,i);
  assert.deepEqual([i.x,i.y,i.nativeCoin.state,i.nativeCoin.speed,i.nativeCoin.force,i.nativeCoin.fraction],[event.after.x,event.after.y,event.after.state,event.after.speed,event.after.force,event.after.fraction],`${event.level} row ${event.row}`);
 }
});
