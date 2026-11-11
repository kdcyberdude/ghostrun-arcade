import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,TRANSITIONS} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import measurements from '../data/death-transition-measurements.json';
import type {Button} from '../src/types.js';

for(const source of measurements.experiments){
 const buttons:Button[]=source.name==='side-run'?['right','b']:['right'];
 const prefixFrames=source.name==='side-run'?240:300;
 test(`${source.name} death arc matches observed shape within2px after independently aligning first motion`,()=>{
  const sim=new Simulation(structuredClone(observedLevels()));sim.reset(true);
  const rows=new Map<number,number>();let firstMotion:number|undefined,deathFeet:number|undefined;
  for(let frame=1;frame<=300;frame++){
   sim.step(frame<=prefixFrames?buttons:[],1);rows.set(sim.frame,sim.player.y);
   if(sim.phase==='dying'){deathFeet??=sim.player.y;if(firstMotion===undefined&&sim.player.y<deathFeet)firstMotion=sim.frame;}
  }
  assert.notEqual(firstMotion,undefined,'ordinary side contact caused a real death and upward motion');
  const fittedMotion=measurements.runtimeCandidates.arc.cases.find(c=>c.name===source.name)!.firstMovementFrameCandidate;
  for(const sample of source.arcSamples){
   const frame=firstMotion!+sample.frame-fittedMotion,actual=rows.get(frame)!;
   assert.ok(Math.abs(Math.floor(actual)-sample.feetY)<=2,`relative arc at native${sample.frame}: ${actual} vs ${sample.feetY}`);
  }
 });
 test(`${source.name} old scene clearing and first lives text fall within separate observed intervals`,()=>{
  const sim=new Simulation(structuredClone(observedLevels()));sim.reset(true);
  let clear:number|undefined,text:number|undefined;
  for(let frame=1;frame<=600;frame++){
   sim.step(frame<=prefixFrames?buttons:[],1);
   if(sim.phase==='intro'){clear??=sim.frame;if(sim.phaseFrame>=TRANSITIONS.introHiddenBeforeFrame)text??=sim.frame;}
  }
  for(const [label,actual,bounds]of [['scene',clear,source.firstDeathSceneClear],['lives text',text,source.firstLifeInterstitial]] as const){
   assert.ok(actual!==undefined&&actual>bounds.afterExclusive&&actual<=bounds.atOrBefore,`${label} ${actual} outside(${bounds.afterExclusive},${bounds.atOrBefore}]`);
  }
  assert.equal(sim.lives,2);assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);
 });
}

test('title start pressed at native row 60 reaches control on native row 215 (155 rows, lives screen ends on the interval clock)',()=>{
 const sim=new Simulation(structuredClone(observedLevels()));sim.step([],60);sim.step(['start'],1);
 assert.equal(sim.phase,'intro');
 let f=61;while(sim.phase==='intro'&&f<400){sim.step([],1);f++;}
 assert.equal(f-1,215,'row of the first play step (native first control row 215; the remake used 229)');
});
