import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {NativeMotor} from '../src/native-motor.js';
import {observedLevels} from '../src/levels.js';
import native from '../evidence/entry-timeline-native-rows-20261109.json';
import winningInputs from '../data/observed-winning-inputs.json';
import type {Button} from '../src/types.js';

// Native rows (tools/fidelity-lab/native-trace.mjs, recorded winning route): row i is the state after i+1 frames. Timeline state (phase,
// automatic walk, pipe entry, entry fall) pairs remake step f with native row f; input-driven state pairs it with row f-1 because the
// remake has one more frame of input latency (a two-step input queue against the native single frame).
const keys:Button[]=['up','down','left','right','a','b'];
const frameInputs:Button[][]=[];
for(const [mask,frames] of winningInputs.actions as number[][])for(let f=0;f<frames;f++)frameInputs.push(keys.filter((_,bit)=>mask&(1<<bit)));

interface Snapshot{phase:string;area:string;x:number;y:number;vx:number;falling:boolean;timerHidden:boolean;time:number;enemyX:number|undefined}
function run(levelId:string,previousLevelId:string,steps:number):Snapshot[]{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 const row=native.levels.find(l=>l.id===levelId)!;
 sim.levelIndex=observedLevels().findIndex(l=>l.id===previousLevelId);sim.nextLevel();
 const out:Snapshot[]=[];
 const snapshot=():Snapshot=>({phase:sim.phase,area:sim.area.id,x:sim.player.x,y:sim.player.y,vx:Math.round(sim.player.vx*4096),falling:sim.entryFalling,timerHidden:sim.entryTimerHidden,time:sim.time,enemyX:sim.enemies[0]?.x});
 out.push(snapshot());
 for(let t=1;t<=steps;t++){sim.step(frameInputs[row.appearRow-165+t]??[],1);out.push(snapshot());}
 return out;
}
const nativeAt=(level:typeof native.levels[number],field:'x'|'y'|'vx',row:number)=>level[field][row-level.fromRow];

// 2-2 and 7-2 share the intro, walk and pipe timeline but enter a water room, whose fall is not part of this timeline model.
const cases=[
 {id:'1-2',previous:'1-1',entryArea:'area-2',fall:true},{id:'4-2',previous:'4-1',entryArea:'area-3',fall:true},
 {id:'2-2',previous:'2-1',entryArea:'area-2',fall:false},{id:'7-2',previous:'7-1',entryArea:'area-4',fall:false},
];
for(const c of cases){
 const level=native.levels.find(l=>l.id===c.id)!;
 const first=level.appearRow-165,appear=level.appearRow,area=level.appearRow+360;
 const snaps=run(c.id,c.previous,area+70-first);
 const at=(row:number)=>snaps[row-first];

 test(`${c.id}: the level intro lasts 165 frames, then the automatic walk, pipe entry and room load follow native rows`,()=>{
  assert.ok(Math.abs(appear-level.firstRow-165)<=1,"native intro length is 164..166 frames; the remake uses 165");
  for(let row=first+1;row<appear;row++)assert.equal(at(row).phase,'intro',`row ${row}`);
  assert.equal(at(appear).phase,'play');assert.equal(at(appear).x,40);assert.equal(at(appear).vx,0);
  // The pipe trigger (floor(x)+13>=160) fires on native row 2293-equivalent: 153 frames after the player appears.
  assert.equal(at(appear+152).phase,'play');assert.equal(at(appear+153).phase,'pipe');
  assert.equal(at(area-1).phase,'pipe');assert.equal(at(area).phase,'play');assert.equal(at(area).area,c.entryArea);assert.equal(at(area).falling,c.fall);
 });

 test(`${c.id}: the automatic walk is the walk motor capped at byte 12 and the pipe entry follows the 2312/-104/+152 pattern`,()=>{
  for(let row=appear+1;row<=appear+176;row++){
   // The remake's pipe trigger clears vx on the trigger row (native keeps the last walk speed one more row); it is not used afterwards.
   if(row!==appear+153)assert.equal(at(row).vx,nativeAt(level,'vx',row),`row ${row}: speed`);
   assert.equal(Math.floor(at(row).x),nativeAt(level,'x',row),`row ${row}: x`);
  }
  for(let row=appear+177;row<=appear+333;row++)assert.equal(Math.floor(at(row).x),160,`row ${row}: x holds at the pipe mouth`);
 });

 if(c.fall)test(`${c.id}: the underground entry fall matches native y on every row and the control-start speeds exactly`,()=>{
  for(let row=area;row<=area+51;row++){
   const y=Math.floor(at(row).y)-32;
   assert.equal(y,nativeAt(level,'y',row),`row ${row}: y`);
  }
  assert.equal(at(area+51).falling,false,'lands on the native row 51 after the load; the row after it still takes the air step (+152) and then the run step (+228)');
  // Control starts at row +17; the first speed appears one row later (input-driven pairing: row f-1) and runs in the air at the walk step.
  for(let row=area+18;row<=area+66;row++){
   assert.equal(at(row+1).vx,nativeAt(level,'vx',row),`row ${row}: speed`);
   assert.equal(Math.floor(at(row+1).x),nativeAt(level,'x',row),`row ${row}: x`);
  }
 });

 if(c.fall)test(`${c.id}: TIME appears at control start and ticks every 24 frames; the first Goomba starts moving on row +3`,()=>{
  for(let row=area;row<area+17;row++)assert.equal(at(row).timerHidden,true,`row ${row}`);
  for(let row=area+17;row<area+41;row++){assert.equal(at(row).timerHidden,false,`row ${row}`);assert.equal(at(row).time,400,`row ${row}`);}
  assert.equal(at(area+41).time,399);assert.equal(at(area+64).time,399);assert.equal(at(area+65).time,398);
  // 1-2 only: its first actor is a Goomba whose native slot starts moving on row +3 (RAM 0x87: 0xff->0xfe).
  if(c.id==='1-2'){assert.equal(at(area+2).enemyX,at(area).enemyX);assert.notEqual(at(area+3).enemyX,at(area+2).enemyX);}
 });
}

test('the walk motor with the automatic-walk cap reproduces the native speed bytes from rest',()=>{
 const level=native.levels.find(l=>l.id==='1-2')!;
 const motor=new NativeMotor();motor.capByte=12;
 for(let row=level.appearRow+1;row<=level.appearRow+60;row++){
  assert.equal(motor.speed=motor.groundPress(1,false),nativeAt(level,'vx',row),`row ${row}`);
 }
});

test('an airborne wall contact holds the camera for the measured side-collision timer span (first-level probe)',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 const camera=native.camera11;
 for(let n=1;n<=camera.firstRow+camera.camera.length+2;n++){
  sim.step(frameInputs[n-1]??[],1);
  // The camera drawn after N frames is the native RAM camera of row N-2 (the scroll register trails the RAM value by a frame).
  const row=n-2;if(row>=camera.firstRow&&row<camera.firstRow+camera.camera.length)assert.equal(sim.camera,camera.camera[row-camera.firstRow],`frame ${n}: camera`);
 }
});
