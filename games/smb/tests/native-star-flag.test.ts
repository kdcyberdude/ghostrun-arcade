import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runNativeStarFlag,runNativeFirework} from '../src/native-star-flag.js';
import fixture from './fixtures/native-star-flag-events.json';

test('source StarFlag task and timer control match every retained and mood actor transition',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.rows,533547);assert.deepEqual(fixture.diagnostics,[]);
 assert.equal(fixture.transitions.reduce((n,e)=>n+e.count,0),fixture.rows);
 for(const e of fixture.transitions){const s={...e.before},out=runNativeStarFlag(s,e.input);assert.deepEqual(s,e.after,JSON.stringify(e.examples));assert.equal(out.time,e.time,JSON.stringify(e.examples));}
});

test('source fireworks timer and erasure match all24648 native actor rows',()=>{
 assert.equal(fixture.fireworkTransitions.reduce((n,e)=>n+e.count,0),24648);
 for(const e of fixture.fireworkTransitions){const s={...e.before};assert.equal(runNativeFirework(s),e.score);assert.deepEqual(s,e.after,JSON.stringify(e.examples));}
});

test('PlayerEndLevel sees task5 on the following dispatch; zero-timer music wait is source controlled',()=>{
 const s={task:4,y:113,state:0,interval:0},input={time:0,fireworks:255,music:32,endWalk:true,blocked:true};
 assert.equal(runNativeStarFlag(s,input).nextLevel,false);assert.equal(s.task,4);
 assert.equal(runNativeStarFlag(s,{...input,music:0}).nextLevel,false);assert.equal(s.task,5);
 assert.equal(runNativeStarFlag(s,{...input,music:0}).nextLevel,true);
});

test('castle entry selects the native fireworks digit and raises the flag to rawY113 before interval6',()=>{
 for(const digit of [0,1,2,3,6,9]){
  const s={task:0,y:144,state:0,interval:0},input={time:digit,fireworks:0,music:0,endWalk:true,blocked:true};
  const out=runNativeStarFlag(s,input);assert.equal(s.task,2);assert.equal(s.state,digit===1?5:digit===3?3:0);assert.equal(out.fireworks,[1,3,6].includes(digit)?digit:255);
 }
 const s={task:3,y:144,state:0,interval:0},input={time:0,fireworks:255,music:0,endWalk:true,blocked:true};
 for(let i=0;i<31;i++){runNativeStarFlag(s,input);assert.equal(s.task,3);}
 assert.equal(s.y,113);runNativeStarFlag(s,input);assert.deepEqual(s,{task:4,y:113,state:0,interval:6});
});
