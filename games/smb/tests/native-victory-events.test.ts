import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {stepNativeVictory,type NativeVictory,type VictoryInput} from '../src/native-victory.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-victory-events.json',import.meta.url),'utf8')) as {events:{level:string;frame:number;before:NativeVictory;after:NativeVictory;input:VictoryInput;auto:{playerX:number;axe:boolean};camera:number}[]};
for(const level of [...new Set(fixture.events.map(e=>e.level))])test(`${level}: native victory control, bridge gravity, scroll and message transitions`,()=>{
 let state:NativeVictory|undefined,last=-2;
 for(const e of fixture.events.filter(e=>e.level===level)){
  if(!state||e.frame!==last+1)state=structuredClone(e.before);
  // The enemy core owns these slot bytes outside BridgeCollapse.
  if(e.before.task!==0){state.boss=structuredClone(e.before.boss);state.bossState=e.before.bossState;}
  const result=stepNativeVictory(state,{...e.input,autoControl:()=>e.auto});last=e.frame;
  // KillAllEnemies clears flags/state; position/velocity bytes retain their last values.
  if(result.kill)state.bossState=0;
  // Enemy processing runs after victory tasks1..4 and may reuse the erased boss slot for the retainer.
  const {boss,bossState,...control}=state,{boss:expectedBoss,bossState:expectedBossState,...expectedControl}=e.after;
  assert.deepEqual(control,expectedControl,`control frame ${e.frame}`);
  if(e.before.task===0){assert.deepEqual(boss,expectedBoss,`bridge gravity ${e.frame}`);assert.equal(bossState,expectedBossState,`boss state ${e.frame}`);}
  assert.equal(result.camera,e.camera,`camera ${e.frame}`);
 }
});

test('message counters follow source world8 branch and six interval ticks, without fitted hold durations',()=>{
 const n:NativeVictory={task:3,destination:9,walk:0,scrollFraction:0,primary:0,secondary:0,endTimer:0,feet:4,controls:0,bridge:15,bossState:0,boss:{y:225,speed:2,force:0,fraction:0,timer:0}};
 const input={world:8,camera:2304,playerX:2430,bossPresent:false,intervalTick:false},messages:number[]=[];
 for(let frame=0;n.task===3;frame++){const result=stepNativeVictory(n,input);if(result.message>=0)messages.push(result.message);assert.ok(frame<500);}
 assert.deepEqual(messages,[0,3,4,5,6]);assert.equal(n.primary,7);assert.equal(n.endTimer,6);
 for(let tick=0;tick<6;tick++)assert.equal(stepNativeVictory(n,{...input,intervalTick:true}).advance,false,'world8 waits for B after timer expiry');
 assert.equal(n.endTimer,0);assert.equal(stepNativeVictory(n,{...input,world:7}).advance,true);
});
