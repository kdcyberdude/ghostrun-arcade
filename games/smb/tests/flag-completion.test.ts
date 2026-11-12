import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,FLAG_COMPLETION} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import inputs from '../data/observed-winning-inputs.json';
import type {Button,Level,Tile} from '../src/types.js';

function flagFixture(frozenTime:number){
 const tiles:Tile[]=[];for(let x=0;x<40;x++)tiles.push([x,13,84]);tiles.push([6,12,97],[9,8,69],[10,8,69],[11,8,69]);
 // The ordinary jump approach consumes one timer unit before touching the pole.
 const level:Level={id:'1-1',time:frozenTime+1,main:'main',evidence:'Synthetic flag collision fixture; no campaign completion claim',areas:[{id:'main',width:640,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],exit:{x:104,doorX:160,kind:'flag'},evidence:'Fixture'}]};
 const next:Level={...level,id:'1-2',time:400,areas:[{...level.areas[0],spawn:[40,208],exit:undefined}]};
 const sim=new Simulation([level,next]);sim.reset(true);return sim;
}

test('walking into the flag pedestal waits for a jump to reach the pole',()=>{
 // Reference 1-1 tick 222..237: right+B approach, neutral wait, then jump.
 const sim=flagFixture(326);
 sim.step(['right','b'],75);sim.step([],90);
 assert.equal(sim.phase,'play');
 sim.step(['right','a','b'],23);
 assert.equal(sim.phase,'flag');
});

test('ordinary jump contact freezes the clock and produces0,1,3 or6 actual firework bursts',()=>{
 for(const digit of [0,1,3,6]){
  const sim=flagFixture(300+digit),seen=new Set<number>();let firstZero:number|undefined,grabbedTime:number|undefined,scoreBeforeTimer:number|undefined,clearCues=0,blastCues=0;
  for(let frame=0;frame<1200&&sim.levelIndex===0;frame++){
   sim.step(frame<40?['right','a','b']:[],1);
   if(sim.phase==='flag'&&grabbedTime===undefined)grabbedTime=sim.time;
   if(sim.phase==='flag'&&sim.flagInside&&scoreBeforeTimer===undefined)scoreBeforeTimer=sim.score;
   if(sim.phase==='flag'&&sim.time===0&&firstZero===undefined)firstZero=sim.frame;
   for(const firework of sim.flagFireworks){seen.add(firework.index);assert.ok(firework.phase>=0&&firework.phase<=2);}
   for(const event of sim.events.splice(0)){if(event==='event_level_clear')clearCues++;if(event==='sfx_blast_fireworks')blastCues++;}
  }
  assert.equal(grabbedTime,300+digit);assert.equal(seen.size,digit);assert.equal(blastCues,digit);assert.equal(clearCues,1);assert.equal(sim.levelIndex,1);
  assert.equal(sim.score,scoreBeforeTimer!+grabbedTime!*50+digit*500);
  // Native rows (1-1 160, 1-2 141, 2-3 140, 3-1 151, 3-3 144, 4-2 155 ...): a no-firework level ends 140..160 rows after the timer reaches 0, on a 21-row area-clock phase (was a flat 160 from the 1-1 sample alone).
  assert.ok(firstZero!==undefined);if(digit===0){const tail=sim.frame-firstZero;assert.ok(tail>=140&&tail<=160,`tail ${tail}`);}
 }
});

test('castle flag raises32pixels with background priority geometry after timer conversion',()=>{
 const sim=flagFixture(306);let firstZero:number|undefined;const sampled=new Map<number,{x:number;y:number}>();
 for(let frame=0;frame<900&&sim.levelIndex===0;frame++){
  sim.step(frame<40?['right','a','b']:[],1);
  if(sim.time===0&&sim.phase==='flag'){
   firstZero??=sim.frame;const elapsed=sim.frame-firstZero;
   if([0,15,23,31,32,40].includes(elapsed)&&sim.castleFlag)sampled.set(elapsed,sim.castleFlag);
  }
 }
 assert.deepEqual(sampled.get(0),{x:160,y:146});assert.deepEqual(sampled.get(15),{x:160,y:131});
 assert.deepEqual(sampled.get(23),{x:160,y:123});assert.deepEqual(sampled.get(31),{x:160,y:115});
 assert.deepEqual(sampled.get(32),{x:160,y:114});assert.deepEqual(sampled.get(40),{x:160,y:114});
});

test('firework cadence and score credit match observed native-frame phase checkpoints',()=>{
 const sim=flagFixture(306);let firstZero:number|undefined;const phases=new Map<number,number>();const scores=new Map<number,number>();
 for(let frame=0;frame<1000&&sim.levelIndex===0;frame++){
  sim.step(frame<40?['right','a','b']:[],1);
  if(sim.time===0&&sim.phase==='flag'){
   firstZero??=sim.frame;const elapsed=sim.frame-firstZero;
   if(sim.flagFireworks.length)phases.set(elapsed,sim.flagFireworks[0].phase);
   scores.set(elapsed,sim.score);
  }
 }
 assert.equal(phases.get(35),0);assert.equal(phases.get(43),1);assert.equal(phases.get(50),2);
 assert.equal(phases.has(58),false);assert.equal(scores.get(57)!-scores.get(56)!,500);
 assert.equal(phases.get(69),0);assert.equal(phases.get(77),1);assert.equal(phases.get(84),2);
 assert.equal(FLAG_COMPLETION.fireworkOffsetsFromCastleFlag.length,6);
});

test('recorded1-1 controls preserve the measured timer-score conversion and normal next-level transition',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);const keys:Button[]=['up','down','left','right','a','b'];
 let flag:number|undefined,zero:number|undefined,next:number|undefined,finalScore:number|undefined;
 const walking=new Map<number,{x:number;y:number}>();
 for(const [mask,duration] of inputs.actions.slice(0,264))for(let frame=0;frame<duration;frame++){
  sim.step(keys.filter((_,i)=>mask&(1<<i)),1);
  if(sim.phase==='flag'){
   flag??=sim.frame;if(sim.time===0){zero??=sim.frame;finalScore=sim.score;}
   if([1404,1412,1419,1427,1434,1442,1449,1457,1464].includes(sim.frame))walking.set(sim.frame,{x:sim.player.x,y:sim.player.y});
  }
  if(sim.levelIndex===1)next??=sim.frame;
 }
 assert.ok(Math.abs(flag!-1311)<=2);assert.ok(Math.abs(zero!-1817)<=2);assert.equal(finalScore,17650);
 assert.ok(next!==undefined&&next>=1975&&next<=1985);assert.equal(sim.levelIndex,1);assert.notEqual(sim.phase,'ending');
 // Image-coordinate positions recovered from pole/background registration.
 for(const [frame,x,y] of [[1404,3180,192],[1412,3185,204],[1419,3191,208],[1427,3200,208],[1434,3210,208],[1442,3222,208],[1449,3232,208],[1457,3244,208],[1464,3255,208]]){
  const actual=walking.get(frame)!;assert.ok(Math.abs(actual.x-x)<=2,`x at${frame}`);assert.ok(Math.abs(actual.y-y)<=2,`y at${frame}`);
 }
});
