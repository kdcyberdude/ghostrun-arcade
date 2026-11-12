import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
interface Observation {experiment:string;nativeFrames:number;request:{op:string;buttons?:Button[];mask?:number};response:{frames_advanced?:number};player?:{cell:number;direction:string}}
const observations:Observation[]=JSON.parse(fs.readFileSync('data/player-pose-observations.json','utf8')).observations;
const names:Button[]=['up','down','left','right','a','b','start','select'];
function simulation(){const sim=new Simulation(observedLevels());sim.reset(true);return sim;}
function apply(sim:Simulation,row:Observation){if(row.request.op==='reset')sim.reset(true);else sim.step(row.request.buttons??names.filter((_,i)=>(row.request.mask??0)&1<<i),row.response.frames_advanced??0);}
function cell(sim:Simulation){return sim.locomotionPose.kind==='walk'?12+sim.locomotionPose.frame:sim.locomotionPose.kind==='jump'?16:sim.locomotionPose.kind==='skid'?15:23;}
test('walking pose cadence agrees with all four fresh reference start phases',()=>{
 for(let phase=0;phase<4;phase++){
  const sim=simulation();for(const row of observations.filter(r=>r.experiment===`walk-phase-${phase}`)){apply(sim,row);assert.equal(cell(sim),row.player!.cell,`phase${phase},nativeframe${row.nativeFrames}`);}
 }
});
test('walking off a pipe preserves walking pose and facing during new reverse input',()=>{
 const sim=simulation();for(const row of observations.filter(r=>r.experiment==='pipe-ledge-reverse'&&r.nativeFrames<=428)){
  apply(sim,row);if(row.nativeFrames===420||row.nativeFrames===428){assert.equal(sim.player.grounded,false);assert.equal(cell(sim),14);assert.equal(sim.locomotionPose.facing,1);}
 }
 assert.equal(sim.player.facing,-1,'physical facing can respond independently of the frozen falling artwork');
});
test('a head collision retains the initiated jump pose',()=>{
 const sim=simulation();for(const row of observations.filter(r=>r.experiment==='pipe-ledge-release'&&r.nativeFrames<=142)){
  apply(sim,row);if(row.nativeFrames===135||row.nativeFrames===142)assert.equal(cell(sim),16);
 }
});
test('an independently initiated moving jump changes from walking to jump pose and back',()=>{
 const sim=simulation();for(const row of observations.filter(r=>r.experiment==='moving-short-jump'&&r.nativeFrames<=97)){
  apply(sim,row);if(row.nativeFrames>=67&&row.nativeFrames<=90)assert.equal(cell(sim),16);if(row.nativeFrames===97)assert.equal(sim.locomotionPose.kind,'walk');
 }
});
test('the first observed moving landing immediately selects walking cell12',()=>{
 const sim=simulation(),actions:number[][]=JSON.parse(fs.readFileSync('data/observed-winning-inputs.json','utf8')).actions;
 for(let tick=1;tick<=20;tick++){
  const [mask,frames]=actions[tick-1];sim.step(names.filter((_,i)=>mask&1<<i),frames);
  if(tick===19)assert.equal(sim.player.grounded,false,'the recorded inputs must approach the landing from the air');
 }
 assert.equal(sim.frame,150);assert.equal(sim.player.grounded,true);assert.equal(sim.player.y,208);
 assert.equal(sim.locomotionPose.kind,'walk');assert.equal(cell(sim),12,'reference-first-dense decision20/native150 shows walking cell12');
});
test('an enemy bounce after a walking fall retains its walking pose until the next initiated jump',()=>{
 const sim=simulation(),actions:number[][]=JSON.parse(fs.readFileSync('data/observed-winning-inputs.json','utf8')).actions;
 for(let tick=1;tick<=98;tick++){
  const [mask,frames]=actions[tick-1];sim.step(names.filter((_,i)=>mask&1<<i),frames);
  if(tick===94){assert.equal(sim.player.grounded,false);assert.equal(sim.locomotionPose.kind,'walk');}
  if(tick===95){assert.ok(sim.player.vy<0,'the geometric enemy collision must actually bounce the player');assert.equal(sim.locomotionPose.kind,'walk');}
  if(tick===98)assert.equal(sim.locomotionPose.kind,'jump');
 }
});

const airborneFacingObservations=JSON.parse(fs.readFileSync('data/airborne-facing-observations.json','utf8')) as {cases:{name:string;controls:{frame:number;mask:number;frames:number}[];samples:{frame:number;stage:string;cell:number;facing:string}[]}[]};
for(const observed of airborneFacingObservations.cases)test(`initiated jump retains measured grounded facing: ${observed.name}`,()=>{
 const sim=simulation();let compared=0;for(const input of observed.controls){sim.step(['up','down','left','right','a','b','x','y','start','select'].filter((_,i)=>input.mask&(1<<i)) as Button[],input.frames);const ref=observed.samples.find(s=>s.frame===input.frame);if(!ref||ref.cell!==16)continue;assert.equal(sim.locomotionPose.kind,'jump');assert.equal(sim.locomotionPose.facing,ref.facing==='left'?-1:1,`native frame${input.frame}`);compared++;}assert.ok(compared>=2);
});
test('measured pre-jump skid facing and subsequent landing facing remain unchanged',()=>{
 const observed=airborneFacingObservations.cases.find(c=>c.name==='facing-calibration-preskid')!,sim=simulation();let compared=0;for(const input of observed.controls){sim.step(['up','down','left','right','a','b','x','y','start','select'].filter((_,i)=>input.mask&(1<<i)) as Button[],input.frames);const ref=observed.samples.find(s=>s.frame===input.frame);if(!ref||!['prejump-skid','landing-reverse'].includes(ref.stage))continue;assert.equal(sim.player.grounded,true);assert.equal(sim.locomotionPose.facing,ref.facing==='left'?-1:1,`native frame${input.frame}`);compared++;}assert.equal(compared,4);
});
