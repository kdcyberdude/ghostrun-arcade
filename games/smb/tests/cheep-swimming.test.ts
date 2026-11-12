import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';
import calibration from '../evidence/cheep-two-two-calibration-motor.json';
import reserved from '../evidence/cheep-two-two-reserved-motor.json';

function fixture(enemy:Partial<EnemySpec>={},playerX=0){
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const level:Level={id:'2-2',time:400,main:'main',evidence:'Synthetic swimming enemy fixture, not campaign traversal',areas:[{id:'main',width:1024,palette:12,theme:'water',spawn:[playerX,208],tiles,enemies:[{kind:'cheep',x:200.25,y:80,palette:'0f-10-30-27',...enemy}],evidence:'Ordinary production controller/collision updates'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('swimming fish X follows471 actual calibration/reserved samples from one visible seed per actor',()=>{
 let samples=0;
 for(const data of [calibration,reserved])for(const c of data.cases)for(const track of c.tracks){
  const sim=fixture({palette:track.palette}),seed=track.samples[0];let elapsed=0;
  for(const sample of track.samples){
   const next=sample.nativeFrame-seed.nativeFrame;sim.step([],next-elapsed);elapsed=next;
   const observed=Math.floor(sim.enemies[0].x+seed.worldX-200);
   assert.ok(Math.abs(observed-sample.worldX)<=2,`${c.name}/${track.id}/${sample.nativeFrame}: ${observed} vs ${sample.worldX}`);samples++;
  }
 }
 assert.equal(samples,471);
});

test('swimming color speeds preserve inferred rightward sign while unknown palettes retain the legacy motor',()=>{
 for(const [palette,speed]of [['0f-10-30-27',.25],['0f-16-30-27',.5],[undefined,.75],['0f-00-30-10',.75]] as const){
  for(const direction of [-1,1]){
   const sim=fixture({palette,direction});sim.step([],16);
   assert.equal(sim.enemies[0].x,200.25+direction*speed*16);
  }
 }
});

test('flying Cheep and Blooper horizontal motion and the existing vertical fallback are unchanged',()=>{
 const flying=fixture({motion:'flying'});flying.step([],16);assert.equal(flying.enemies[0].x,192.25);
 const blooper=fixture({kind:'blooper'});blooper.step([],16);assert.ok(Math.abs(blooper.enemies[0].x-(200.25-16*.9))<1e-10);
 const swimming=fixture();swimming.step([],16);assert.equal(swimming.enemies[0].y,80+Math.sin(16/40)*24);
});

test('a swimming fish still causes genuine contact death through ordinary production collision steps',()=>{
 const sim=fixture({x:60,y:184},40);sim.step([],36);assert.equal(sim.phase,'play');
 sim.step([],1);assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
});
