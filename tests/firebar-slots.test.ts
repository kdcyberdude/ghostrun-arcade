import test from 'node:test';
import assert from 'node:assert/strict';
import excerpts from '../data/firebar-slot-native-excerpts.json';
import {FirebarSlots} from '../src/firebar-slots.js';
import {firebarFlameCenters} from '../src/firebar-motion.js';
import {observedLevels} from '../src/levels.js';

for(const run of excerpts.runs)test(`1-4 native slot carry and viewport clocks, mood ${run.mood}`,()=>{
 const bars=observedLevels().find(l=>l.id==='1-4')!.areas[0].firebars!;
 const clock=new FirebarSlots(bars);
 for(const [i,camera] of run.cameras.entries()){
  // Production advances at the previous camera, then commits scrolling. The
  // native excerpts expose the committed camera and the resulting slot angle.
  clock.step(run.cameras[Math.max(0,i-1)]);
  clock.cameraEntry(run.cameras[Math.max(0,i-1)],camera);
  for(const [frame,x,angle,fraction] of run.samples)if(frame===i){
   const bar=bars.find(b=>b.x===x)!;
   const nativeUnits=((angle+24)%32)*32+fraction/8;
   assert.deepEqual(clock.centers(bar),firebarFlameCenters({active:true,units:nativeUnits},{x:bar.x,y:bar.y,length:6}),`native row ${i}, bar ${x}`);
  }
 }
});
