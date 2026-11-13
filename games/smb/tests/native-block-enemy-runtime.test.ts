import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {isolatePlacedStream} from './helpers/isolated-placed-stream.js';
const setup=()=>{const sim:any=isolatePlacedStream(new Simulation([observedLevels().find(l=>l.id==='1-1')!]));sim.reset(true);sim.phase='play';sim.player.x=1000;sim.player.y=208;sim.camera=1100;sim.enemies=[];return sim;};
const goomba=(sim:any,slot:number)=>{const e=sim.makeEnemy({kind:'goomba',x:1248,y:144});Object.assign(e,{active:true,enemySlot:slot,vx:-0.5,fall:{speed:0,force:0,fraction:225},walkerState:0});sim.enemies.push(e);return e;};
test('temporary block marker is consumed in slot order after graphics, then native defeated movement runs on that row',()=>{
 const sim=setup(),first=goomba(sim,0),second=goomba(sim,1);sim.enemyBumpCells.set('78,9',0x23);
 sim.updateEnemies(208);
 assert.deepEqual([first.graphicsY,first.walkerState,first.x,first.y,first.defeat.speed,first.defeat.force,first.defeat.fraction],[144,34,1249,137,-3,61,225]);
 assert.equal(second.dead,0,'the same native $23 cannot stun a second slot');assert.equal(sim.enemyBumpCells.get('78,9'),0);assert.deepEqual(sim.pendingScore,[{value:100,left:5}]);
});
test('ordinary solid support cannot substitute for the native temporary marker',()=>{
 const sim=setup(),e=goomba(sim,0);sim.tiles.set('78,9',196);sim.updateEnemies(208);assert.equal(e.dead,0);assert.equal(e.defeat,undefined);
});
test('native replacement retires the temporary enemy block-buffer overlay',()=>{
 const sim=setup();sim.enemyBumpCells.set('78,9',0);sim.blockGraphics.push({slot:0,key:'78,9',x:1248,y:144,metatile:196,replace:true});sim.advanceNativeBlockPictures();assert.equal(sim.enemyBumpCells.has('78,9'),false);
});

import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import clips from './fixtures/native-block-enemy-clips.json';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';import {compareRun} from '../tools/harness/native-divergence.js';
test('all frames in six authenticated, entrance-seeded World1-1 bump clips match native state (pictures and POWER-ON unchecked)',()=>{
 for(const clip of clips.clips){
  const unpack=(key:'initial'|'ram'|'pads')=>{const data=gunzipSync(Buffer.from(clip[key],'base64'));assert.equal(createHash('sha256').update(data).digest('hex'),clip[`${key}Sha256`]);return data;};
  const initial=unpack('initial'),ram=unpack('ram'),pads=unpack('pads'),entrance=decodeEntrance(initial,clip.receipt);
  const strict=strictCompare(entrance,pads,ram,'1-1'),legacy=compareRun(entrance,pads,f=>ram.subarray(f*2048,(f+1)*2048),'1-1',true);
  assert.equal(strict.status,'pass',clip.sha256);assert.equal(strict.coverage.frames,pads.length);assert.equal(strict.coverage.complete,true);assert.ok(Object.values(legacy.fields).every(f=>f===null),clip.sha256);
 }
});
