import {test} from 'node:test';
import assert from 'node:assert/strict';
import {itemShown} from '../src/view-rules.js';
import type {Item} from '../src/types.js';
import fixture from './fixtures/native-powerup-visibility.json';
import {GameRenderer} from '../src/renderer.js';

test('native power-up emergence states1–5 have no sprite, and state6 starts drawing (every native emergence row)',()=>{
 let compared=0;
 for(const level of fixture.levels)for(const [frame,nativePowerState,shown] of level.rows){
  assert.equal(itemShown({nativePowerState} as Item&{nativePowerState:number}),Boolean(shown),`${level.level} native frame ${frame}`);compared++;
 }
 assert.ok(compared>=67);
 assert.equal(itemShown({kind:'coin'} as Item),true,'other items keep their normal visibility');
});

test('native power-up artwork uses OAM y+1 while preserving the simulation item position',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 for(const level of fixture.levels)for(const [frame,state,shown,x,y,camera,oamX,artworkY] of level.rows){
  if(!shown)continue;const calls:number[][]=[];
  renderer.special=(_name:string,x:number,y:number)=>calls.push([x,y]);
  const item={kind:'mushroom',nativePowerState:state,x,y,emerging:1};renderer.item(item,{camera,area:{palette:0},random:{frame:0}});
  assert.deepEqual(calls,[[oamX,artworkY]],`${level.level} native frame ${frame}`);assert.equal(item.y,y);
 }
});
