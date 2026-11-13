import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeCoinBlockStartY,nativeCoinSlot,nativeMiscGravity} from '../src/native-misc.js';
import {Simulation} from '../src/simulation.js';
import data from './fixtures/native-coin-blocks.json';

test('CoinBlock preserves carry from FindEmptyMiscSlot and the native block sprite origin',()=>{
 assert.equal(nativeCoinBlockStartY(144,false),127);assert.equal(nativeCoinBlockStartY(144,true),128);
 const busy=new Set([6,7,8]);assert.deepEqual([nativeCoinSlot(busy),nativeCoinBlockStartY(144,busy.has(8))],[8,128],'overwrite8 searched occupied slots and has carry1');
 assert.equal(data.inputs,368);assert.equal(data.receipts.length,368);assert.equal(data.events.length,1148);assert.deepEqual(data.diagnostics,[]);
 for(const e of data.events){
  const y=(e.marioY+(e.size===0||e.duck?18:4))&240;
  assert.equal(y,e.blockY,`${e.id} row${e.row}`);
  const n={slot:e.slot,state:1,speed:-5,...e.before},after=nativeMiscGravity(n,nativeCoinBlockStartY(y,e.busy.includes(8)),80,6);
  assert.deepEqual([after,n.speed,n.force,n.fraction],[e.after.y,e.after.speed,e.after.force,e.after.fraction],`${e.id} row${e.row}`);
 }
});

test('simulation normal-block coin birth and first misc pass match all retained and mood source events',()=>{
 const proto=Simulation.prototype as any;
 for(const e of data.events){
  const context:any={player:{x:e.marioX,y:e.marioY+32,size:e.size,duck:e.duck},items:e.busy.map(slot=>({kind:'coin',life:1000,nativeCoin:{slot,state:1,speed:0,force:0,fraction:0}})),miscHammerBytes:Array.from({length:9},()=>({force:0,fraction:0})),miscPositions:Array.from({length:9},()=>({x:0,y:0})),random:{frame:e.frame},camera:e.camera-e.scroll,lakituScroll:e.scroll,spawnNativeCoin:proto.spawnNativeCoin};
  context.miscHammerBytes[e.slot]={...e.before};proto.spawnNativeBlockCoin.call(context,e.blockX/16);
  const item=context.items.at(-1);assert.equal(item.nativeCoin.slot,e.slot);
  proto.moveNativeCoin.call(context,item);
  assert.deepEqual([item.x,item.y,item.nativeCoin.state,item.nativeCoin.speed,item.nativeCoin.force,item.nativeCoin.fraction],[e.after.x,e.after.y,e.after.state,e.after.speed,e.after.force,e.after.fraction],`${e.id} row${e.row}`);
 }
});
