import {test}from'node:test';import assert from'node:assert/strict';import fs from'node:fs';
import {Simulation}from'../src/simulation.js';import {waterFixture}from'../tools/compare-water.js';import type{Button}from'../src/types.js';
interface Sample{experiment:string;frame:number;nativeFrames:number;buttons:Button[];pose?:{cell:number}|null}
const observations:Sample[]=JSON.parse(fs.readFileSync('data/player-pose-water-observations.json','utf8')).observations;
test('neutral water falling pose remains at the first swim cell independent of global clock',()=>{
 for(const clock of[0,7,32,109]){const level=waterFixture();level.areas[0].spawn=[40,60];const sim=new Simulation([level]);sim.reset(true);sim.frame=clock;
  for(let frame=0;frame<40;frame++){sim.step([],1);assert.equal(sim.swimPoseFrame,0);}
 }
});
for(const name of['water-short-a','water-held-a','water-repeated-a','water-air-walk','water-air-run'])test(`${name} matches exact reference swimming cell observations`,()=>{
 const sim=new Simulation([waterFixture()]);sim.reset(true);let compared=0;
 for(const row of observations.filter(r=>r.experiment===name&&r.frame>180)){
  sim.step(row.buttons,row.nativeFrames);if(!row.pose||![17,18,19].includes(row.pose.cell))continue;
  assert.equal(17+sim.swimPoseFrame,row.pose.cell,`nativeframe${row.frame-180}`);compared++;
 }
 assert.ok(compared>=8,'each independent control trace must include its complete airborne observation window');
});
