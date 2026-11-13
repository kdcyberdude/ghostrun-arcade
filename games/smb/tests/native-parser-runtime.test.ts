import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import clockEvidence from '../data/native-parser-clock.json';
import bulletDefeats from './fixtures/native-bullet-defeat-events.json';

function replay(level:string,through:number,inspect:(sim:any,frame:number)=>void){
 const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8'));
 const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
 const initial=unpack(run.initialRam),pads=unpack(run.pads),buttons:Button[]=['a','b','select','start','up','down','left','right'];
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 const entrance=decodeEntrance(initial,{level});initializeEntrance(sim,entrance);
 assert.deepEqual([sim.parserClock.task,sim.parserClock.scroll],[initial[0x71f],initial[0x73d]]);
 sim.step([],0);sim.inputs=[];
 for(let frame=0;frame<=through;frame++){sim.step(buttons.filter((_,b)=>pads[frame]&(1<<b)),1);inspect(sim,frame);}
}

test('runtime coin buffer2 write holds the 4-3 parser clock and permits the native red Koopa first movement',()=>{
 replay('4-3',205,(sim,frame)=>{
  const event=clockEvidence.windows.find(e=>e.frame===frame);if(!event)return;
  assert.deepEqual([sim.parserClock.task,sim.parserClock.scroll],event.after,`row${frame}`);
  assert.equal(sim.parserVramBusy,event.input.busy,`row${frame}`);
  if(frame===203){const e=sim.enemies.find((e:any)=>e.kind==='redKoopa'&&e.active&&e.enemySlot===3);assert.ok(e);assert.equal(e.x,624);assert.equal(e.y,192);assert.equal(e.graphicsVisible,false);}
  if(frame===204){const e=sim.enemies.find((e:any)=>e.kind==='redKoopa'&&e.active&&e.enemySlot===3);assert.ok(e);assert.equal(e.x,623.5);}
 });
});

test('native enemy-loader reservation precedes the parser clock advance and pipe-column slot allocation',()=>{
 replay('6-2',293,(sim,frame)=>{
  if(frame!==293)return;
  const para=sim.enemies.find((e:any)=>e.kind==='paratroopa'&&e.originX===688);
  const plant=sim.enemies.find((e:any)=>e.kind==='piranha'&&e.originX===744);
  assert.ok(para.active);assert.equal(para.enemySlot,0);assert.equal(para.x,687.5);
  assert.equal(plant.active,false);assert.equal(plant.slotLost,true);
 });
});


test('source placed actors exist on their native first frame and defer graphics and movement to the next handler',()=>{
 replay('1-1',71,(sim,frame)=>{
  if(frame<70)return;const e=sim.enemies.find((e:any)=>e.nativeId===6&&e.originX===352);
  assert.ok(e.active);assert.equal(e.enemySlot,0);assert.equal(e.x,frame===70?352:351.5);assert.equal(e.graphicsVisible,frame===71);
 });
 replay('1-2',350,(sim,frame)=>{
  if(frame<349)return;
  for(const [slot,x,y] of [[0,256,208],[1,272,192]]){
   const e=sim.enemies.find((e:any)=>e.active&&e.enemySlot===slot);
   assert.ok(e);assert.equal(e.x,x-(frame===350?0.5:0));assert.equal(e.y,y);assert.equal(e.graphicsVisible,frame===350);
  }
 });
});

test('native horizontal Paratroopa birth retains horizontal and vertical slot fractions while clearing its counters',()=>{
 let priorFraction=0;
 replay('7-3',1858,(sim,frame)=>{
  if(frame===1857)priorFraction=sim.slotVertical[0].fraction;
  if(frame!==1858)return;
  const e=sim.enemies.find((e:any)=>e.nativeId===16&&e.active);
  assert.ok(e);assert.equal(e.enemySlot,0);assert.deepEqual(e.horizontalFlight,{x:2240.25,y:128,primary:0,secondary:0});
  assert.equal(e.graphicsVisible,false);assert.deepEqual(sim.slotVertical[0],{speed:0,force:0,fraction:priorFraction});
 });
});

test('red Paratroopa wing removal retains the original-Y horizontal fraction and selects native ID1 without ID3 ledge avoidance',()=>{
 replay('5-3',488,(sim,frame)=>{
  if(frame<487)return;
  const e=sim.enemies.find((e:any)=>e.active&&e.enemySlot===2);
  assert.ok(e);assert.equal(e.kind,'redKoopa');assert.equal(e.nativeId,1);assert.equal(e.redFlight,undefined);
  assert.equal(e.x,frame===487?1184.71875:1185.21875);assert.equal(e.y,109);
  assert.deepEqual(e.fall,{speed:0,force:frame===487?0:61,fraction:31});
 });
});

test('a lives-screen respawn creates the first actor on engine7 and moves it on the engine8 readiness pass',()=>{
 replay('8-2',625,(sim,frame)=>{
  if(frame<624)return;
  const e=sim.enemies.find((e:any)=>e.active&&e.nativeId===14&&e.enemySlot===0);
  assert.ok(e);assert.equal(e.x,frame===624?288:287.5);assert.equal(e.y,176);assert.equal(e.graphicsVisible,frame===625);
  if(frame===625){assert.equal(sim.broClock,166);assert.equal(e.pod.force,28);assert.equal(e.pod.fraction,0);}
 });
});


test('the native frenzy Bullet stomp keeps pre-move x, draws the old picture, drops two pixels, and awards 200 without a chain step',()=>{
 let chain=0;
 replay('6-3',1928,(sim,frame)=>{
  if(frame===1922)chain=sim.stompChain;
  if(frame<1923)return;
  const expected=bulletDefeats.find(e=>e.level==='6-3'&&e.frame===frame)!.after;
  const e=sim.enemies.find((e:any)=>e.active&&e.kind==='bullet'&&e.enemySlot===3);
  assert.ok(e);assert.equal(e.dead,1);assert.equal(e.x,expected.x);assert.equal(e.y,expected.y);
  assert.deepEqual({speed:e.pod.speed,force:e.pod.force,fraction:e.pod.fraction},{speed:expected.speed,force:expected.force,fraction:expected.fraction});
  assert.equal(sim.stompChain,chain);
  if(frame===1923){assert.equal(e.graphics.dead,0);assert.equal(e.graphics.y,144);assert.equal(e.graphics.x,1862.5);}
  if(frame===1928)assert.equal(sim.score,238000);
 });
});

test('the frenzy Bullet corpse is erased on the first graphics pass below page1, retaining its final slot bytes',()=>{
 replay('6-3',1982,(sim,frame)=>{
  if(frame!==1982)return;
  const e=sim.enemies.find((e:any)=>e.frenzy&&e.enemySlot===3&&e.dead===100);
  assert.ok(e);assert.equal(e.slotFreed,true);assert.equal(e.y,282);
  assert.deepEqual(sim.slotVertical[3],{speed:3,force:56,fraction:212});assert.equal(sim.slotSub[3],128);
 });
});
