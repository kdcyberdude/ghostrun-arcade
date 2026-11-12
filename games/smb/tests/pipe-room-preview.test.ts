import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function atPipe(id:'1-1'|'2-1',size:0|1){
 const level=structuredClone(observedLevels().find(l=>l.id===id)!);
 const main=level.areas.find(a=>a.id==='main')!;
 main.spawn=id==='1-1'?[922,144]:[1653,144];
 main.camera=id==='1-1'?811:1540;
 const sim=new Simulation([level]);sim.reset(true);sim.enemies=[];sim.player.size=size;
 return sim;
}

const previewId=(sim:Simulation)=>sim.pipePreviewArea?.id;

test('1-1 small player previews the real target room only during the observed loading interval',()=>{
 const sim=atPipe('1-1',0);sim.step(['down'],75);
 assert.equal(sim.phase,'pipe');assert.equal(sim.pipePreviewArea,undefined);
 sim.step(['down'],1);
 assert.equal(sim.area.id,'main');assert.equal(previewId(sim),'bonus-coins');
 sim.step(['down'],4);assert.equal(previewId(sim),'bonus-coins');
 sim.step(['down'],1);assert.equal(sim.pipePreviewArea,undefined);assert.equal(sim.area.id,'bonus-coins');
});

test('unmeasured size and other pipes do not receive the preview',()=>{
 for(const [id,size] of [['1-1',1],['2-1',0]] as const){
  const sim=atPipe(id,size);sim.step(['down'],76);
  assert.equal(sim.phase,'pipe');assert.equal(sim.pipePreviewArea,undefined);
 }
});

test('larger players and other pipes retain the same transition and fall state',()=>{
 for(const [id,size] of [['1-1',1],['1-1',2],['2-1',0],['2-1',1]] as const){
  const level=structuredClone(observedLevels().find(l=>l.id===id)!);
  const main=level.areas.find(a=>a.id==='main')!;
  main.spawn=id==='1-1'?[922,144]:[1653,144];main.camera=id==='1-1'?811:1540;
  const old=structuredClone(level);
  for(const pipe of old.areas.flatMap(a=>a.pipes??[])){delete pipe.smallPlayerRoomEntry;pipe.smallPlayerRoomPreviewFrames=7;}
  const a=new Simulation([level]),b=new Simulation([old]);a.reset(true);b.reset(true);a.enemies=[];b.enemies=[];a.player.size=size;b.player.size=size;
  for(let frame=0;frame<180;frame++){
   a.step(['down'],1);b.step(['down'],1);
   const state=(s:Simulation)=>({phase:s.phase,phaseFrame:s.phaseFrame,area:s.area.id,player:s.player,time:s.time,score:s.score,coins:s.coins,events:s.events,gravity:s.area.entryFall?.gravity});
   assert.deepEqual(state(a),state(b),`${id} size ${size} frame ${frame+1}`);
  }
 }
});

test('small-player coin-room entry follows the measured source fall',()=>{
 const sim=atPipe('1-1',0);
 // Native source observations come from separate reset runs; the first room
 // transition and unobserved subpixel values remain inferred.
 for(const [frame,top] of [[82,50],[83,51],[90,60],[97,73],[98,76],[105,100],[112,130],[113,134],[120,164],[127,193],[128,193]] as const){
  sim.step(['down'],frame-sim.frame);
  assert.equal(sim.area.id,'bonus-coins');
  assert.ok(Math.abs(Math.floor(sim.player.y)-15-top)<=2,`frame ${frame}: feet ${sim.player.y}, source top ${top}`);
 }
});
