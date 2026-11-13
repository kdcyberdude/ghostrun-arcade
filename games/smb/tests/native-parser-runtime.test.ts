import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button,SpringSpec} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import clockEvidence from '../data/native-parser-clock.json';
import springEvents from './fixtures/native-spring-events.json';
import springSlots from './fixtures/native-spring-slot-events.json';
import sidePipeEvents from './fixtures/native-side-pipe-events.json';
import bulletDefeats from './fixtures/native-bullet-defeat-events.json';

function replay(level:string,through:number,inspect:(sim:any,frame:number)=>void,runName='v2'){
 const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.${runName}.json`,import.meta.url),'utf8'));
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

test('ordinary Koopa side collision reads rawY+20 before moving at the 8-2 wall',()=>{
 replay('8-2',791,(sim,frame)=>{
  if(frame<789)return;
  const e=sim.enemies.find((e:any)=>e.active&&e.enemySlot===3&&e.kind==='koopa');assert.ok(e);
  assert.equal(e.x,frame===789?355:frame===790?354.5:354,`row${frame}`);
 });
});

test('a Spiny landing returns before checking the wall in its new direction',()=>{
 // Native 6-1: row246 lands at x497.5 moving right; row247 then sees
 // the wall at x+16, reverses, and moves left to497.
 replay('6-1',247,(sim,frame)=>{
  if(frame<245)return;
  const e=sim.enemies.find((e:any)=>e.active&&e.enemySlot===1&&e.kind==='spiny');assert.ok(e);
  assert.equal(e.x,frame===246?497.5:497,`row${frame}`);
 });
});


test('6-3 spring landing, compression and grounded launch hold match native RAM',()=>{
 replay('6-3',1959,(sim,frame)=>{
  const event=springEvents.find(e=>e.level==='6-3'&&e.frame===frame);
  if(event){assert.equal(Math.floor(sim.player.y)-32,event.yAfter,`row${frame} y`);assert.equal(Math.floor(sim.player.vy),event.speedAfter,`row${frame} speed`);assert.equal(sim.player.x,1846+240/256,`row${frame} pinned x`);assert.equal(sim.camera,[1751,1752,1753,1754,1755,1756,1757,1758,1760,1762,1764,1766,1769][frame-1944],`row${frame} camera`);}
  if(frame>=1957)assert.equal(Math.floor(sim.player.y)-32,[150,138,127][frame-1957],`row${frame} release`);
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

test('5-3 retained frenzy controller delays id40 until the native Koopa final movement and next slot pass',()=>{
 replay('5-3',620,(sim,frame)=>{
  if(frame===466){assert.equal(sim.frenzyControllers.find((c:any)=>c.column===1312).slot,3);}
  if(frame<547)return;
  const platform=sim.area.platforms.find((p:any)=>p.x===1466)!;
  if(frame<550)assert.equal(sim.platformSlots.has(platform),false,`row${frame} waits`);
  if(frame===549){assert.equal(sim.slotSub[2],184,'erased Koopa completes its horizontal movement');assert.deepEqual(sim.slotVertical[2],{speed:3,force:61,fraction:221},'erasure clears state, preserving vertical bytes');}
  if(frame===550){assert.equal(sim.platformSlots.get(platform),2);assert.equal(sim.platformMotion.collisionPosition(platform,sim.platformFrame).x,1504+184/256);}
  if(frame>=617)assert.equal(Math.floor(sim.player.x),[1470,1472,1473,1475][frame-617],`row${frame} Mario carry`);
 });
});


test('native engine3 retains X speed and saved scroll while Y and enemies continue through its area timer',()=>{
 replay('1-1',461,(sim,frame)=>{
  if(frame<413)return;
  const tick=frame-413;
  assert.equal(sim.phase,frame===461?'intro':'pipe');assert.equal(sim.player.x,917);assert.equal(sim.player.vx,9432/4096);
  assert.equal(Math.floor(sim.player.y)-32,112+tick,`row${frame} y`);
  if(frame<=418)assert.equal(sim.camera,[805,808,810,812,814,816][tick],`row${frame} camera`);
  assert.equal(sim.playerXScroll,3);assert.equal(sim.pipeTimer,48-tick);
  if(frame===414){const e=sim.enemies.find((e:any)=>e.active&&!e.dead&&!e.slotFreed&&e.enemySlot===0);assert.ok(e);assert.equal(e.x,769.5,'enemy world continues during pipe entry');}
 },'mood0-3d43-entry0000');
});


test('6-3 Spring allocations include the native checkpoint rendering pass before engine7 frenzy creation',()=>{
 replay('6-3',2575,(sim,frame)=>{
  const event=springSlots.births.find(e=>e.level==='6-3'&&e.frame===frame);
  if(event){const spring=sim.area.springs.find((s:SpringSpec)=>s.nativeColumn===event.after.x);assert.ok(spring);assert.equal(sim.springSlots.get(spring),event.slot);assert.equal(sim.parserColumnX,event.column[1]);}
  if(frame===2574||frame===2575){const bullet=sim.enemies.find((e:any)=>e.active&&e.frenzy&&e.enemySlot===1);assert.ok(bullet);assert.equal(bullet.x,frame===2574?1823:1821.5);assert.equal(bullet.y,192);assert.equal(bullet.graphicsVisible,frame===2575);assert.equal(sim.swimBag,64);}
 });
});

test('a solid tree underside stops Mario without creating a native bump marker or killing the Koopa above',()=>{
 replay('1-3',202,(sim,frame)=>{
  if(frame<196)return;
  const e=sim.enemies.find((e:any)=>e.active&&!e.dead&&!e.slotFreed&&e.enemySlot===0&&e.kind==='redKoopa');assert.ok(e,`row${frame} live Koopa`);
  assert.equal(e.x,447-(frame-195)/2);assert.equal(e.y,80);assert.equal(sim.score,43400);
  if(frame===196){assert.equal(Math.floor(sim.player.y)-32,76);assert.equal(sim.blockBounceTimer,0);assert.equal(sim.nativeBlockBounce,0);}
 },'mood0-6a33-entry0006');
});


test('ordinary side-pipe movement keeps the native incoming fraction and running timer without a fitted first speed',()=>{
 replay('1-2',1735,(sim,frame)=>{
  if(frame<1728)return;
  const event=sidePipeEvents.find(e=>e.level==='1-2'&&e.frame===frame)!;assert.ok(event);
  assert.equal(sim.player.x,event.after.x,`row${frame} x`);assert.equal(Math.round(sim.player.vx*4096),event.after.motor.speed,`row${frame} speed`);
  assert.equal(sim.motor.runningTimer,event.after.motor.runningTimer);assert.equal(sim.motor.absolute,event.after.motor.absolute);assert.equal(sim.pipeTimer,event.after.change);
 });
});
