import test from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {compareRun} from '../tools/harness/native-divergence.js';import {strictCompare} from '../tools/harness/native-strict.js';import type {Enemy,Button} from '../src/types.js';import fixture from './fixtures/native-walker-corpse.json';
for(const run of fixture.runs.filter(r=>r.events.length))test(`native defeated walker bounds/floaty ownership ${run.sha256.slice(0,8)}`,()=>{
 for(const event of run.events){const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=event.camera;sim.nativeAreaOffset=0;const e=sim.makeEnemy({kind:event.kind,x:event.x,y:event.y+24,nativeId:event.id});Object.assign(e,{active:true,dead:1,enemySlot:event.slot,defeat:{y:e.y,speed:event.speed,force:event.force,fraction:event.fraction,timer:0}});sim.enemies=[e];
  if(event.floatyBefore)sim.popups=[{value:200,x:0,y:0,age:0,life:48,victim:e}];sim.eraseOffscreenEnemies();
  assert.equal(Boolean(e.active&&!e.slotFreed&&e.dead<90),event.owned,`native flag ${event.frame}`);assert.equal(sim.popups.some((p:{victim?:Enemy})=>p.victim===e),Boolean(event.floatyAfter),`native FloateyNum_Control ${event.frame}`);
 }
});
test('independent native1-2 replay clears the corpse before its slot is reused',()=>{
 const run=fixture.runs.find(r=>r.ramGzip)!,ram=gunzipSync(Buffer.from(run.ramGzip!,'base64')),entrance=decodeEntrance(Buffer.from(run.initial,'base64'),run.receipt),legacy=compareRun(entrance,run.pads,f=>ram.subarray(f*2048,(f+1)*2048),run.level),strict=strictCompare(entrance,run.pads,ram,run.level);
 assert.ok(Object.values(legacy.fields).every(v=>v===null),JSON.stringify(legacy.fields));assert.ok(Object.values(strict.fields).every(v=>v===null),JSON.stringify(strict.fields));
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<=408;f++){sim.step(buttons.filter((_,i)=>run.pads[f]&(1<<i)),1);if(f===407)assert.equal((sim.enemies as Enemy[]).filter(e=>e.active&&e.dead<90&&e.enemySlot===0).length,0);if(f===408){const owners=(sim.enemies as Enemy[]).filter(e=>e.active&&e.dead<90&&e.enemySlot===0);assert.equal(owners.length,1);assert.equal(owners[0].kind,'goomba');assert.equal(owners[0].graphicsVisible,false);}}
});
test('walker defeat bounds do not replace Cannon, Hammer Bro or Blooper handlers',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=686;
 for(const [kind,id]of [['bullet',51],['hammerBro',5],['blooper',7]] as const){const e=sim.makeEnemy({kind,x:612,y:200,nativeId:id});Object.assign(e,{active:true,dead:1,defeat:{y:200,speed:3,force:0,fraction:0,timer:0}});assert.equal(sim.nativeLeftBound(e),undefined);}
});
