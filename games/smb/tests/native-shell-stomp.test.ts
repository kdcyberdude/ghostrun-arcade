import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import airWindow from './fixtures/native-shell-stomp-window.json';
import revivalWindow from './fixtures/native-shell-revival-window.json';
import revivals from './fixtures/native-shell-revivals.json';
import springWindow from './fixtures/native-spring-enemy-bg-window.json';
import platformWindow from './fixtures/native-platform-slot-reuse-window.json';
import kickWindow from './fixtures/native-shell-kick-contact-window.json';
import victimWindow from './fixtures/native-shell-victim-window.json';
import lowerVictimWindow from './fixtures/native-shell-lower-victim-window.json';
import fallingWindow from './fixtures/native-shell-falling-window.json';

function assertWindow(window:typeof airWindow|typeof revivalWindow|typeof springWindow|typeof platformWindow|typeof kickWindow|typeof victimWindow|typeof lowerVictimWindow|typeof fallingWindow){
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);
  const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  if('freeSlots' in row&&Array.isArray(row.freeSlots))for(const free of row.freeSlots){const {slot,...expected}=free;const actual=sim.slotVertical[slot];assert.deepEqual({speed:actual.speed,force:actual.force,fraction:actual.fraction},expected,`free slot${slot} row${frame}`);}
  if('score' in row)assert.equal(sim.score,row.score,`score row${frame}`);
  if('dead' in row)assert.equal(sim.player.dead,row.dead,`death row${frame}`);
  if('slotSub' in row&&Array.isArray(row.slotSub)&&!row.actors.some(e=>e.slot===1))assert.equal(sim.slotSub[1],row.slotSub[1],`retained slot1 fraction row${frame}`);
  for(const expected of row.actors){
   const actor=sim.enemies.find((e:any)=>e.active&&!e.slotFreed&&e.dead<100&&e.enemySlot===expected.slot);assert.ok(actor,`row${frame} slot${expected.slot}`);assert.equal(actor.kind,expected.id===2?'beetle':expected.id===1||expected.id===3?'redKoopa':'koopa');
   const {id,...wanted}=expected;
   assert.deepEqual({slot:actor.enemySlot,state:(actor.walkerState??0)|(actor.defeat?32:actor.movingShell?128:0)|(actor.shellFalling?64:0),timer:actor.shellTimer??0,vx:actor.vx,x:actor.x,y:actor.y,...(actor.defeat?{speed:actor.defeat.speed,force:actor.defeat.force,fraction:actor.defeat.fraction}:actor.fall)},wanted,`row${frame}`);
  }
 }
}

test('an airborne shell stomp holds state4, then falls in state2 with retained walking speed and lands in state3',()=>assertWindow(airWindow));
test('native shell interval expiry chooses FrameCounter direction and holds position on the revival frame',()=>assertWindow(revivalWindow));

test('all additional native corpus shell revivals retain position and fraction while selecting velocity from FrameCounter',()=>{
 assert.equal(revivals.events.length,66);assert.deepEqual(revivals.failures,[]);
 for(const e of revivals.events){assert.equal(e.timer,0);assert.equal(e.x1,e.x0);assert.equal(e.y1,e.y0);assert.equal(e.fraction1,e.fraction0);assert.equal(e.vx,(e.counter&1?-1:1)*(e.hard?0.75:0.5),`${e.file} row${e.frame}`);}
});

test('a Koopa turns against native Spring BG metatile68 before moving horizontally',()=>assertWindow(springWindow));

test('an erased horizontal platform cannot respawn into another slot and overwrite the next Koopa fraction',()=>assertWindow(platformWindow));

test('native resting shell contact kicks before movement, preserves the bounce latch and holds the injuring walker',()=>assertWindow(kickWindow));

test('moving shell uses odd-frame pre-move boxes and defeated victim retains native fixed-point bytes',()=>assertWindow(victimWindow));

test('SetStun decrements the native low Y byte without borrowing from its high byte',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 for(const [feet,expected]of [[25,279],[24,278],[280,534]]){
  const e=sim.makeEnemy({kind:'goomba',x:80,y:feet});e.active=true;e.enemySlot=0;e.fall={speed:0,force:61,fraction:199};sim.stunShellVictim(e);
  assert.deepEqual(e.defeat,{y:expected,speed:-3,force:61,fraction:199,timer:0});assert.equal(e.y,expected);
 }
});

test('a lower-slot shell victim starts its native defeat motor and floatey timer on the next slot pass',()=>assertWindow(lowerVictimWindow));

test('moving shells retain state low bits while falling in bit6 with native gravity and horizontal slowdown',()=>assertWindow(fallingWindow));

test('ShellOrBlockDefeat clears moving/falling shell high bits on both members of a shell collision',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.broClock=1;
 const actors=[0,1].map(slot=>Object.assign(sim.makeEnemy({kind:'koopa',x:100+slot*10,y:208}),{active:true,enemySlot:slot,shell:true,movingShell:true,shellFalling:true,vx:slot?-3:3,walkerState:4}));sim.enemies=actors;
 sim.nativeShellContacts(actors[1],new Map(actors.map(e=>[e,{x:e.x,y:e.y}])));
 for(const actor of actors){assert.ok(actor.defeat);assert.equal(actor.movingShell,false);assert.equal(actor.shellFalling,false);assert.equal(actor.walkerState,2);}
 assert.deepEqual(sim.pendingScore,[{value:200,left:5},{value:500,left:6}]);
});
