import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {excerptReplay,type Excerpt} from '../tools/harness/native-excerpt.js';

const read=(run:string)=>JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/6-2.water-${run}.json`,import.meta.url),'utf8')) as Excerpt;
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
// The changed swimming decisions start after this native main-area return hit.
// These are authentic archived-entrance replays, not POWER-ON dashboard proof.
test('eligible separated shell contact retires kick overlap before the native return hit',()=>{
 const x=read('down-strokes'),pads=unpack(x.pads),ram=unpack(x.ram),sim:any=new Simulation(observedLevels());sim.reset(true);
 initializeEntrance(sim,decodeEntrance(unpack(x.initialRam),{level:x.level},x.source.nativeAreaBinding));sim.step([],0);sim.inputs=[];
 for(let f=0;f<=1176;f++){
  if(f===1176){const shell=sim.enemies.find((e:any)=>e.active&&!e.dead&&e.enemySlot===2);assert.equal(shell.kind,'beetle');assert.equal(shell.movingShell,true);assert.equal(shell.kickOverlap,undefined);assert.equal(sim.collisionBits[2]&1,0);assert.equal(sim.player.dead,false);}
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,i)=>pads[f]&(1<<i)),1);
  const engine=ram[f*x.addrs.length+x.addrs.indexOf(14)];assert.equal(sim.player.dead,engine===11||engine===6,`native frame${f}`);
 }
 assert.equal(sim.phase,'dying');assert.equal(sim.collisionBits[2]&1,1);
});
for(const run of ['down-strokes','reverse','right-strokes'])test(`6-2 ${run} keeps every native excerpt field exact after shell separation`,()=>{
 assert.deepEqual(excerptReplay(read(run)).fields,{dead:null,time:null,score:null,coins:null,cam:null,x:null,y:null,enemy:null});
});
