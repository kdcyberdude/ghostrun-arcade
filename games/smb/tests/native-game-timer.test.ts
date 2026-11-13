import {test} from 'node:test';import assert from 'node:assert/strict';import {initializeNativeGameTimer,runNativeGameTimer,tickNativeGameTimer} from '../src/native-game-timer.js';
test('source timer fetch preserves000 through a zero-time header, then preloads401 exactly once',()=>{
 const n={time:0,control:0,fetch:true};assert.equal(initializeNativeGameTimer(n,0),false);assert.equal(n.time,0);assert.equal(n.fetch,true);
 assert.equal(initializeNativeGameTimer(n,1),true);assert.deepEqual(n,{time:401,control:0,fetch:false});assert.equal(initializeNativeGameTimer(n,2),false);assert.equal(n.time,401);
});
test('NMI counter reaches pending0 during engine7 and PlayerRdy engine8 consumes it on that row',()=>{
 const n={time:401,control:2,fetch:false};tickNativeGameTimer(n);assert.equal(runNativeGameTimer(n,1,7,1).tick,false);tickNativeGameTimer(n);assert.equal(runNativeGameTimer(n,1,7,1).tick,false);assert.equal(n.control,0);
 assert.equal(runNativeGameTimer(n,1,8,1).tick,true);assert.deepEqual(n,{time:400,control:24,fetch:false});
});
test('RunGameTimer source guards, timeout, and100-before-decrement hurry event',()=>{
 for(const [mode,engine,yHigh]of [[0,8,1],[1,7,1],[1,11,1],[1,8,2]]){const n={time:100,control:0,fetch:false};assert.deepEqual(runNativeGameTimer(n,mode,engine,yHigh),{tick:false,timeUp:false,hurry:false});}
 const n={time:100,control:0,fetch:false};assert.equal(runNativeGameTimer(n,1,8,1).hurry,true);n.time=0;n.control=0;assert.equal(runNativeGameTimer(n,1,8,1).timeUp,true);
});

test('native NMI, timer fetch and RunGameTimer match every retained original32 transition',async()=>{
 const {default:data}=await import('./fixtures/native-game-timer-events.json');let count=0;
 for(const row of data.events){
  const [level,frame,before,input,after,occurrences]=row as [string,number,number[],number[],number[],number];const n={time:before[0],control:before[1],fetch:Boolean(before[2])};
  if(input[0])tickNativeGameTimer(n);if(input[1]>=0)initializeNativeGameTimer(n,input[1]);runNativeGameTimer(n,input[2],input[3],input[4]);
  assert.deepEqual([n.time,n.control,Number(n.fetch)],after,`${level} native frame${frame}`);count+=occurrences;
 }
 assert.equal(count,data.checked);
});
