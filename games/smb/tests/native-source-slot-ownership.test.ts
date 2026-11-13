import test from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button,Enemy} from '../src/types.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-hbro-spawn.json';
const keys:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of fixture.runs)test(`native plants/Bros retain ownership until source erasure ${run.name}`,()=>{
 const ram=gunzipSync(Buffer.from(run.ramGzip,'base64')),sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(Buffer.from(run.initial,'base64'),run.receipt));sim.step([],0);sim.inputs=[];
 for(let f=0;f<run.pads.length;f++){sim.step(keys.filter((_,i)=>run.pads[f]&(1<<i)),1);const r=ram.subarray(f*2048,(f+1)*2048),expected=[];
  for(let slot=0;slot<5;slot++)if(r[0xf+slot]&&!(r[0xf+slot]&128)&&[5,13].includes(r[0x16+slot]))expected.push([slot,r[0x16+slot],r[0x6e+slot]*256+r[0x87+slot]]);
  const actual=(sim.enemies as Enemy[]).filter(e=>(e.kind==='piranha'&&e.nativePipe||e.kind==='hammerBro'&&e.nativeId===5)&&sim.holdsNativeSlot(e)).map(e=>[e.enemySlot,e.kind==='piranha'?13:5,Math.floor(e.x)]).sort((a,b)=>a[0]!-b[0]!);assert.deepEqual(actual,expected,`Enemy_Flag ownership row${f}`);
 }
});
test('source bound carry retains a Bro through pre-handler release and frees it only on actual erasure',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=757;sim.frame=10;const e:Enemy=sim.makeEnemy({kind:'hammerBro',nativeId:5,x:736,y:151});Object.assign(e,{active:true,enemySlot:2,slotFreed:false});sim.enemies=[e];assert.equal(sim.nativeLeftBound(e),486);sim.releaseNativeSlots();assert.equal(e.slotFreed,false);sim.eraseOffscreenEnemies();assert.equal(e.active,true);
 sim.camera=768;assert.equal(sim.nativeLeftBound(e),752);sim.releaseNativeSlots();assert.equal(e.slotFreed,false,'owns slot before its own handler erases it');sim.eraseOffscreenEnemies();assert.equal(e.slotFreed,true);assert.equal(sim.holdsNativeSlot(e),false);assert.equal(sim.slotReleaseFrame[2],10);
});
test('native defeated Hammer Bros still return through OffscreenBoundsCheck',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=757;const e:Enemy=sim.makeEnemy({kind:'hammerBro',nativeId:5,x:736,y:151});Object.assign(e,{active:true,enemySlot:2,dead:1,hbro:{state:32},defeat:{y:151,speed:1,force:0,fraction:0,timer:0}});sim.enemies=[e];assert.equal(sim.nativeLeftBound(e),486);assert.equal(sim.holdsNativeSlot(e),true);sim.camera=768;sim.eraseOffscreenEnemies();assert.equal(sim.holdsNativeSlot(e),false);
});
