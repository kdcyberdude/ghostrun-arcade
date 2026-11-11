import test from 'node:test';
import assert from 'node:assert/strict';
import excerpts from '../data/castle-contact-native-excerpts.json';
import {FirebarSlots} from '../src/firebar-slots.js';
import {firebarFlameCenters} from '../src/firebar-motion.js';
import {longFirebarFlameCenters} from '../src/long-firebar-motion.js';
import {observedLevels} from '../src/levels.js';

for(const run of excerpts.runs)test(`2-4 Podoboo slot angle carry, mood ${run.mood}`,()=>{
 const bars=observedLevels().find(l=>l.id==='2-4')!.areas[0].firebars!;
 const clock=new FirebarSlots(bars.slice(0,5),[864,864,768,768,768]);
 assert.equal(clock.tracks(bars[5]),false,'platform allocation after the measured prefix stays on its existing motor');
 for(const [i,camera] of run.cameras.entries()){
  const previous=run.cameras[Math.max(0,i-1)];
  clock.step(previous);clock.cameraEntry(previous,camera);
  for(const [frame,x,angle,fraction] of run.samples)if(frame===i){
   const bar=bars.find(b=>b.x===x)!;
   assert.deepEqual(clock.centers(bar),firebarFlameCenters({active:true,units:((angle+24)%32)*32+fraction/8},{x:bar.x,y:bar.y,length:6}),`native row ${i}, bar ${x}`);
  }
 }
});

for(const run of excerpts.sixFourRuns)test(`6-4 firebar prefix with interleaved Podoboos, mood ${run.mood}`,()=>{
 const bars=observedLevels().find(l=>l.id==='6-4')!.areas[0].firebars!;
 // Native slots0,2,4 hold the first three bars, all with untouched angle0.
 // The fourth reuses slot0. Later slots retain live Podoboo speed bytes.
 const clock=new FirebarSlots(bars.slice(0,4));
 assert.equal(clock.tracks(bars[4]),false);
 for(const [i,camera] of run.cameras.entries()){
  const previous=run.cameras[Math.max(0,i-1)];
  clock.step(previous);clock.cameraEntry(previous,camera);
  for(const [frame,x,angle,fraction] of run.samples)if(frame===i){
   const bar=bars.find(b=>b.x===x)!;
   assert.deepEqual(clock.centers(bar),firebarFlameCenters({active:true,units:((angle+24)%32)*32+fraction/8},{x:bar.x,y:bar.y,length:6}),`native row ${i}, bar ${x}`);
  }
 }
});

test('6-4 late firebar geometry agrees with both native object-birth inventories',async()=>{
 const native=(await import('../data/native-firebar-geometry.json')).default;
 const bars=observedLevels().find(l=>l.id==='6-4')!.areas[0].firebars!;
 assert.equal(bars.length,11);
 for(const run of native.areas[0].nativeBirths)for(const [frame,slot,id,x,y] of run.rows){
  const matches=bars.filter(b=>b.x===x+4&&b.y===y+4);
  assert.equal(matches.length,1,`native mood${run.mood}, row${frame}, slot${slot}`);
  assert.equal(Math.sign(matches[0].speed),id===29?-1:1);
 }
});

for(const run of excerpts.threeFourRuns)test(`3-4 second/third firebars use fresh slot angles, mood ${run.mood}`,()=>{
 const bars=observedLevels().find(l=>l.id==='3-4')!.areas[0].firebars!;
 const clock=new FirebarSlots(bars.slice(1,3));
 assert.equal(clock.tracks(bars[0]),false);
 assert.equal(clock.tracks(bars[3]),false);
 for(const [i,camera] of run.cameras.entries()){
  const previous=run.cameras[Math.max(0,i-1)];
  clock.step(previous);clock.cameraEntry(previous,camera);
  for(const [frame,x,angle,fraction] of run.samples)if(frame===i&&x!==312){
   const bar=bars.find(b=>b.x===x)!;
   assert.deepEqual(clock.centers(bar),firebarFlameCenters({active:true,units:((angle+24)%32)*32+fraction/8},{x:bar.x,y:bar.y,length:6}),`native row ${i}, bar ${x}`);
  }
 }
});

for(const run of excerpts.fiveFourRuns)test(`5-4 long-bar native phase skips horizontal bins, mood ${run.mood}`,()=>{
 const bar=observedLevels().find(l=>l.id==='5-4')!.areas[0].firebars!.find(b=>b.x===376)!;
 const clock=new FirebarSlots([bar]);
 for(const [i,camera] of run.cameras.entries()){
  const previous=run.cameras[Math.max(0,i-1)];
  clock.step(previous);clock.cameraEntry(previous,camera);
  for(const [frame,x,angle,fraction] of run.samples)if(frame===i){
   assert.equal(x,bar.x);
   assert.deepEqual(clock.centers(bar),longFirebarFlameCenters({active:true,units:((angle+24)%32)*32+fraction/8},bar),`native row ${i}`);
  }
 }
});

test('5-4 long-bar lookup matches repeated native twelve-quad OAM, without filling skipped bins',async()=>{
 const native=(await import('../data/long-firebar-native-lookup.json')).default;
 assert.equal(native.lookup[0],null);assert.equal(native.lookup[16],null);
 for(const sample of excerpts.fiveFourLongOamSamples){
  const centers=longFirebarFlameCenters({active:true,units:((sample.angle+24)%32)*32+sample.fraction/8},{x:376,y:120});
  assert.equal(centers.length,12);
  assert.deepEqual(centers.map(c=>[c.x-376,c.y-120]),sample.quads,`native row${sample.frame}`);
 }
});
