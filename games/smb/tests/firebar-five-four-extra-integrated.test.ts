import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level,FirebarSpec} from '../src/types.js';
import accepted from '../data/firebar-five-four-extra-production.json';

// Explicit component fixtures. Optional isolated compiler output is not traversal.
const levels=process.env.FIREBAR_EXTRA_LEVELS?JSON.parse(fs.readFileSync(process.env.FIREBAR_EXTRA_LEVELS,'utf8')) as Level[]:observedLevels();
const source=levels.find(level=>level.id==='5-4')!;
const actualBar=(sim:Simulation,x:number)=>sim.area.firebars!.find(bar=>bar.x===x&&bar.y===216)!;
function game(target:number,camera:number,x:number,omit=false){
 const level=structuredClone(source),area=level.areas.find(area=>area.id==='main')!;
 area.spawn=[x,208];area.camera=camera;
 if(omit)area.firebars=area.firebars!.filter(bar=>bar.x!==target||bar.y!==216);
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const motor=(sim:Simulation,bar:FirebarSpec)=>(sim as any).firebarMotors.get(bar).state as {active:boolean;units:number};

test('extra5-4 inventory preserves the prior nine simulation fields',()=>{
 const bars=source.areas.find(area=>area.id==='main')!.firebars!;
 const existing=bars.slice(0,accepted.expectedExistingFirebars.length);
 assert.equal(existing[0].visualOffsetY,1);
 assert.ok(existing.slice(1).every(bar=>bar.visualOffsetY===undefined));
 assert.deepEqual(existing.map(({visualOffsetY,...simulation})=>simulation),accepted.expectedExistingFirebars);
 assert.deepEqual(bars.slice(accepted.expectedExistingFirebars.length).map(bar=>[bar.x,bar.y,bar.length,bar.motor!.direction,bar.motor!.initialUnits]),[[888,216,6,1,763],[1080,216,6,-1,229]]);
});

for(const [x,direction,initialUnits,firstUnits]of [[888,1,763,768],[1080,-1,229,224]] as const){
 test(`extra${x} waits0/150frames and activates once at newly committed camera${x-259}`,()=>{
  for(const wait of[0,150]){
   const sim=game(x,x-260,x-248);let bar=actualBar(sim,x);sim.step([],wait);
   assert.equal(sim.phase,'play');assert.deepEqual(motor(sim,bar),{active:false,units:initialUnits});assert.deepEqual(sim.firebarCenters(bar),[]);
   sim.loadArea('main',[x-148,208],x-260);bar=actualBar(sim,x);sim.player.vx=1.5;sim.step([],1);
   assert.equal(sim.camera,x-259);assert.deepEqual(motor(sim,bar),{active:true,units:firstUnits});
   const centers=sim.firebarCenters(bar);for(let query=0;query<8;query++)assert.deepEqual(sim.firebarCenters(bar),centers);
   assert.equal(motor(sim,bar).units,firstUnits);sim.step([],1);assert.equal(motor(sim,bar).units,(firstUnits+direction*5+1024)%1024);
  }
 });
 test(`extra${x} public pause freezes its motor and resumes one native frame`,()=>{
  const sim=game(x,x-259,x-248),bar=actualBar(sim,x);sim.step([],9);const frame=sim.frame,before={...motor(sim,bar)},centers=sim.firebarCenters(bar);
  sim.step(['start'],1);assert.equal(sim.paused,true);sim.step([],44);assert.equal(sim.frame,frame);assert.deepEqual(motor(sim,bar),before);assert.deepEqual(sim.firebarCenters(bar),centers);
  sim.step(['start'],1);assert.equal(sim.paused,false);assert.equal(sim.frame,frame+1);assert.equal(motor(sim,bar).units,(before.units+direction*5+1024)%1024);
 });
 test(`extra${x} causes ordinary contact death, then freezes while sprite clock continues`,()=>{
  const negative=game(x,x-128,x-8,true);negative.step([],140);assert.equal(negative.phase,'play');assert.equal(negative.player.dead,false);
  const sim=game(x,x-128,x-8),bar=actualBar(sim,x);let frames=0;
  while(sim.phase==='play'&&frames++<140)sim.step([],1);
  assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);assert.equal(sim.events.filter(event=>event==='event_death').length,1);
  const before={...motor(sim,bar)},centers=sim.firebarCenters(bar),poses=new Set<number>();
  for(let sample=0;sample<32;sample++){sim.step([],1);assert.deepEqual(motor(sim,bar),before);assert.deepEqual(sim.firebarCenters(bar),centers);poses.add(Math.floor(sim.frame/4)%4);}
  assert.equal(poses.size,4);
 });
}
