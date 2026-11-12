import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import rules from '../data/water-entry-5-2-rules.json';
import measured from '../data/optional-five-two-entry-measurements.json';
import type {Level} from '../src/types.js';

test('5-2 optional entry holds its measured standing pose before the seven observed falling samples',()=>{
 const level:Level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const main=level.areas.find(a=>a.id===level.main)!,pipe=main.pipes!.find(p=>p.to===rules.area)!;
 // Diagnostic initial placement on the actual entrance, then ordinary Down.
 // This tests the compiled map/connection; it is not a campaign traversal.
 main.spawn=[pipe.x-8,pipe.y];main.enemies=[];
 const water=level.areas.find(a=>a.id===rules.area)!;
 assert.equal(water.platforms!.length,2);assert.ok(water.platforms!.every(p=>p.width===48));
 const sim=new Simulation([level]);sim.reset(true);
 for(const sample of measured.measurements.filter(m=>m.tick>=5480&&m.tick<=5489)){
  // The Mario sprite of a live capture is one native frame old (waterbig: the native-exact entry fall, identical for small and big Mario in native rows,
  // reproduces every sample exactly one frame earlier; the old fitted fall needed 2 px of slack).
  sim.step(['down'],sample.nativeFramesSinceStart-sim.frame-1);const spriteY=sim.player.y;sim.step(['down'],1);
  if(sample.player){assert.ok(Math.abs(spriteY-sample.player.feetY)<0.5,`${sample.tick}: ${spriteY} vs${sample.player.feetY}`);assert.equal(sim.player.x,24);}
  if(sample.tick===5480)assert.equal(sim.waterEntryStanding,true);
  if(sample.tick>=5481)assert.equal(sim.waterEntryStanding,false);
  if(sample.tick<=5484)assert.equal(sim.entryTimerHidden,true);
  if(sample.tick>=5485)assert.equal(sim.entryTimerHidden,false);
 }
 assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
});

test('the 5-2 water side pipe returns within the same level without a fresh-level intro',()=>{
 const level:Level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const water=level.areas.find(a=>a.id===rules.area)!,pipe=water.pipes![0];
 level.main=water.id;water.spawn=[pipe.x-14,pipe.y];water.camera=water.width-256;water.enemies=[];
 water.entryFall=undefined;water.waterEntryFall=false;water.spawnVelocity=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.player.size=2;
 sim.step(['right'],3);assert.equal(sim.phase,'pipe');
 const time=sim.time;sim.step([],pipe.transitionFrames??64);
 assert.equal(sim.area.id,'area-2');assert.equal(sim.phase,'play');
 assert.equal(sim.player.x,1848);assert.equal(sim.player.y,176);assert.equal(sim.camera,1792);
 assert.equal(sim.player.size,2);assert.equal(sim.time,time);assert.equal(sim.lives,3);
});
