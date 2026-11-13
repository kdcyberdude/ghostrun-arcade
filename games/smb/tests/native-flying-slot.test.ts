import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {moveFlyingCheep} from '../src/flying-cheep.js';import fixture from './fixtures/native-flying-slot-events.json';
const windows=JSON.parse(gunzipSync(Buffer.from(fixture.gzipBase64,'base64')).toString()) as {level:string;slot:number;born:number;rows:number[][]}[];

test('native flying Cheep initialization retains shared0417 while SmallBBox clears speed and force',()=>{
 assert.equal(fixture.births.length,38);assert.equal(fixture.births.filter(e=>e.before.fraction).length,28);assert.equal(fixture.rejected.length,1);
 for(const e of fixture.births){assert.deepEqual(e.after,{speed:-5,force:0,fraction:e.before.fraction},`${e.level} row${e.frame}`);assert.equal(e.y,248);}
 for(const e of fixture.rejected){assert.ok(e.slot>=3+Number(Boolean(e.hard)));assert.deepEqual(e.after,{speed:0,force:0,fraction:e.before.fraction});}
});

test('all retained native flight windows preserve their real initial fraction and subsequent motor bytes',()=>{
 assert.equal(windows.reduce((n,w)=>n+w.rows.length,0),fixture.windowRows);let transitions=0;
 for(const w of windows)for(let i=1;i<w.rows.length;i++){
  const p=w.rows[i-1],r=w.rows[i];if(!p[6]&&r[6])continue; // a new mid-bank hurt needs its own slot-order observation
  const n={y:p[2],speed:p[3],force:p[4],fraction:p[5],timer:0};if(!r[6])moveFlyingCheep(n);
  assert.deepEqual([n.y,n.speed,n.force,n.fraction],r.slice(2,6),`${w.level} row${r[0]} slot${w.slot}`);transitions++;
 }
 assert.ok(transitions>=6940);
});

test('flying Cheep uses the authoritative shared slot fraction and the native hard-mode limit',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='2-3')!),sim:any=new Simulation([level]);sim.reset(true);sim.enemies=[];sim.area.platforms=[];sim.camera=100;sim.player.x=212;sim.player.vx=2.5;
 const generator=sim.area.generators[0];sim.slotVertical[0]={speed:3,force:99,fraction:73};sim.slotYFrac[0]=0;sim.random.bytes=[0,0,0,0,0,0,0];sim.updateFishFrenzy(generator);
 assert.equal(sim.enemies[0].pod.fraction,73,'InitFlyingCheepCheep preserves the real0417, not a family cache');
 sim.enemies=[];for(let slot=0;slot<3;slot++)sim.enemies.push({...sim.makeEnemy({kind:'cheep',x:250,y:200}),active:true,enemySlot:slot});sim.fishTimer=0;sim.slotVertical[3]={speed:-2,force:88,fraction:61};sim.secondaryHardMode=false;generator.maxFish=4;
 sim.updateFishFrenzy(generator);assert.equal(sim.enemies.length,3,'normal limit rejects slot3 despite stale scene metadata');assert.deepEqual(sim.slotVertical[3],{speed:0,force:0,fraction:61});
 sim.fishTimer=0;sim.secondaryHardMode=true;generator.maxFish=3;sim.updateFishFrenzy(generator);assert.equal(sim.enemies.length,4);assert.equal(sim.enemies[3].pod.fraction,61,'native hard mode admits slot3');
});

test('live flying and swimming Cheep motors mirror their shared RAM aliases for the next occupant',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.enemies=[{active:true,enemySlot:0,dead:0,nativeFlight:true,pod:{speed:-3,force:84,fraction:32}},{active:true,enemySlot:1,dead:0,nativeSwim:{originY:248,fraction:130}}];sim.rememberSlotVertical();
 assert.deepEqual(sim.slotVertical.slice(0,2),[{speed:-3,force:84,fraction:32},{speed:0,force:248,fraction:130}]);
 sim.enemies[0].x=100.5;sim.enemies[0].vx=1.5;sim.enemies[0].pod.fraction=99;sim.leaveFlyingCheepSlot(sim.enemies[0]);assert.equal(sim.slotVertical[0].fraction,99);
});

test('recorded7-3 launch and flight retain all native motor bytes through the previous position failure',()=>{
 const run=JSON.parse(fs.readFileSync(new URL('../evidence/native-runs/7-3.v2.json',import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),initial=unpack(run.initialRam),pads=unpack(run.pads),buttons=['a','b','select','start','up','down','left','right'] as const;
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level:'7-3'}));sim.step([],0);sim.inputs=[];
 const track=windows.find(w=>w.level==='7-3'&&w.slot===3&&w.born===406)!;assert.ok(track);
 const birth=fixture.births.find(e=>e.level==='7-3'&&e.frame===406&&e.slot===3)!;assert.ok(birth);assert.equal(birth.before.fraction,32);
 for(let frame=0;frame<=433;frame++){
  sim.step(buttons.filter((_,b)=>pads[frame]&(1<<b)),1);if(frame<406)continue;
  const fish=sim.enemies.find((e:any)=>e.active&&!e.dead&&!e.slotFreed&&e.nativeFlight&&e.enemySlot===3);assert.ok(fish);
  const n=track.rows.find(r=>r[0]===frame)!;assert.ok(n);assert.deepEqual([Math.round(fish.x*256),fish.pod.y,fish.pod.speed,fish.pod.force,fish.pod.fraction],n.slice(1,6),`native motion bytes row${frame}`);
  if(frame===406)assert.equal(fish.pod.fraction,birth.after.fraction);
  if(frame===423)assert.deepEqual([fish.x,fish.y-24],[1156,171]);
  if(frame===427)assert.deepEqual([fish.x,fish.y-24],[1162,155]);
  if(frame===433)assert.deepEqual([fish.x,fish.y-24],[1171,133]);
  assert.deepEqual(sim.slotVertical[3],{speed:fish.pod.speed,force:fish.pod.force,fraction:fish.pod.fraction});
 }
});
