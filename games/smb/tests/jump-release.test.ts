import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';

interface CapturedSample {tick:number;nativeFrame:number;player:{feetY:number}|null}
interface CapturedCase {name:string;samples:CapturedSample[]}
interface CapturedRecord {experiment:string;stage:string;request:{op:string;buttons?:Button[]};response:{tick:number;frames_advanced:number}}

// These ordinary controls were declared before observing the new reference
// outcomes. Neither the map nor the player/enemies are mutated by the tests.
for(const tag of ['latch','latch-heldout']){
 const controls=JSON.parse(fs.readFileSync(new URL(`../evidence/entity-paratroopa-${tag}-controls.json`,import.meta.url),'utf8')) as {records:CapturedRecord[]};
 const measurements=JSON.parse(fs.readFileSync(new URL(`../evidence/entity-paratroopa-${tag}-measure.json`,import.meta.url),'utf8')) as {cases:CapturedCase[]};
 for(const captured of measurements.cases)test(`captured ${captured.name}: releasing A keeps ordinary falling gravity after repress`,()=>{
  const sim=new Simulation(observedLevels());sim.reset(true);
  const expected=new Map(captured.samples.slice(1,5).map(sample=>[sample.tick,sample]));
  let checked=0;
  for(const record of controls.records.filter(record=>record.experiment===captured.name)){
   if(record.request.op==='reset')sim.reset(true);
   else if(record.request.op==='step')sim.step(record.request.buttons??[],record.response.frames_advanced);
   if(record.stage!=='probe')continue;
   const sample=expected.get(record.response.tick);if(!sample)continue;
   assert.equal(sim.frame,sample.nativeFrame,'actual native-duration accounting');
   assert.equal(sim.phase,'play');assert.equal(sim.lives,3);assert.equal(sim.score,0);
   assert.equal(Math.floor(sim.player.y),sample.player!.feetY,`tick${sample.tick}, native${sample.nativeFrame}: ${sim.player.y}`);
   checked++;
  }
  assert.equal(checked,4);
 });
}
