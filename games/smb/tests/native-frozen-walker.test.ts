import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {enemyRenderPicture} from '../src/enemy-picture.js';
import type {Button,Enemy} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-frozen-walker.json';

test('1-2: a falling Goomba lands during the death freeze, after its picture is drawn',()=>{
 const initial=gunzipSync(Buffer.from(fixture.initial,'base64')),pads=gunzipSync(Buffer.from(fixture.pads,'base64')),ram=gunzipSync(Buffer.from(fixture.ram,'base64'));
 for(const [key,data]of Object.entries({initial,pads,ram}))assert.equal(createHash('sha256').update(data).digest('hex'),fixture.hashes[key as keyof typeof fixture.hashes]);
 const entrance=decodeEntrance(initial,{level:fixture.level},fixture.binding);
 assert.equal(strictCompare(entrance,pads,ram,fixture.level).first,null);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<pads.length;f++){
  sim.step(names.filter((_,bit)=>pads[f]&(1<<bit)),1);
  if(f<544||f>546)continue;
  const row=ram.subarray(f*2048,(f+1)*2048),enemy=sim.enemies.find((e:Enemy)=>e.active&&!e.slotFreed&&e.enemySlot===0);
  assert.ok(enemy);assert.equal(enemy.y,row[0xcf]+24);assert.equal(enemy.walkerState,row[0x1e]);
  assert.equal(enemy.fall.fraction,row[0x417]);assert.equal(enemy.fall.speed,row[0xa0]);assert.equal(enemy.fall.force,row[0x434]);
  assert.equal(sim.player.y,row[0xce]+32+row[0x416]/256);assert.equal(sim.player.grounded,row[0x1d]===0);
  // OAM on the next NES picture contains this row's pre-background-collision position.
  assert.equal(enemyRenderPicture(enemy,sim.frame,true).graphicsY,f===546?208:f===545?210:207);
 }
});
