import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import native from '../evidence/entry-timeline-native-rows-20261109.json';
import winningInputs from '../data/observed-winning-inputs.json';
import type {Button,Level} from '../src/types.js';

// Structural side-pipe fixtures. Exact speed/fraction/motor bytes are checked
// from native RAM in native-side-pipe-state.test.ts; an approach retains its
// own fraction and running latch rather than a per-pipe first speed.
const sideWalks=[
 {id:'1-2',area:'area-2',to:'area-3',trigger:2643,stop:2656,start:10448,buttons:['right','b'] as Button[]},
 {id:'2-2',area:'area-2',to:'area-3',trigger:3011,stop:3024,start:0,buttons:['right'] as Button[]},
 {id:'4-2',area:'area-3',to:'area-4',trigger:2979,stop:2992,start:4748,buttons:['right','b'] as Button[]},
 {id:'7-2',area:'area-4',to:'area-5',trigger:3011,stop:3024,start:0,buttons:['right'] as Button[]},
 {id:'8-4',area:'area-4',to:'area-5',trigger:1075,stop:1088,start:0,buttons:['right'] as Button[]},
];

function walk(row:typeof sideWalks[number]){
 const level:Level=structuredClone(observedLevels().find(l=>l.id===row.id)!);level.main=row.area;
 const area=level.areas.find(a=>a.id===row.area)!,pipe=area.pipes!.find(p=>p.to===row.to)!;
 area.spawn=[row.trigger-12,pipe.y];area.camera=Math.max(0,row.trigger-12-112);area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim:any=new Simulation([level]);sim.reset(true);
 sim.player.vx=row.start/4096;sim.motor.speed=row.start;
 const speeds:number[]=[],xs:number[]=[];let entered=-1;
 for(let i=0;i<260;i++){
  sim.step(entered<0&&i<80?row.buttons:[],1);
  if(sim.phase==='pipe'){if(entered<0)entered=i;if(sim.player.vx!==0||speeds.length<40){speeds.push(Math.round(sim.player.vx*4096));xs.push(Math.floor(sim.player.x));}}
 }
 return {speeds,xs};
}

test('the five ordinary side pipes stop at the aligned pipe mouth while retaining their approach state',()=>{
 for(const row of sideWalks){
  const {speeds,xs}=walk(row),stop=row.stop;
  const last=xs.findIndex(x=>x===stop);
  assert.ok(last>=0,`${row.id}: reaches the pipe mouth`);
  assert.equal(stop&15,0);assert.equal(xs[xs.length-1],stop,`${row.id}: x holds at the pipe edge`);
  assert.ok(speeds.slice(last+1).every(s=>Math.floor(s/256)===0),`${row.id}: only the speed fraction remains`);
  const walked=stop-xs[0];assert.ok(walked>=11&&walked<=14,`${row.id}: walked ${walked} px`);
 }
});

// Water-room arrival (2-2 area-2, 7-2 area-4): native engine 7 holds Mario without control for 34 rows (y 0 for 7 rows, then the 1/1/2/3/4... fall to y 49),
// engine 8 starts on row 34 and the first speed (304) one row later. The remake started this 3 rows early (state pre-advanced to the screenshot-registered row 3).
const keys:Button[]=['up','down','left','right','a','b'];
const frameInputs:Button[][]=[];
for(const [mask,frames] of winningInputs.actions as number[][])for(let f=0;f<frames;f++)frameInputs.push(keys.filter((_,bit)=>mask&(1<<bit)));
for(const c of [{id:'2-2',previous:'2-1'},{id:'7-2',previous:'7-1'},{id:'1-2',previous:'1-1'},{id:'4-2',previous:'4-1'}]){
 const level=native.levels.find(l=>l.id===c.id)!;
 const first=level.appearRow-165,area=level.appearRow+360;
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 sim.levelIndex=observedLevels().findIndex(l=>l.id===c.previous);sim.nextLevel();
 const snaps:{y:number;x:number;vx:number;locked:boolean}[]=[];
 for(let t=1;t<=area+60-first;t++){sim.step(frameInputs[first+t]??[],1);snaps.push({y:Math.floor(sim.player.y)-32,x:Math.floor(sim.player.x),vx:Math.round(sim.player.vx*4096),locked:sim.entryControlLocked});}
 const at=(row:number)=>snaps[row-first-1];
 const nat=(f:'x'|'y'|'vx'|'engine',row:number)=>level[f][row-level.fromRow];
 const water=c.id==='2-2'||c.id==='7-2';
 if(water)test(`${c.id}: the water room fall follows the native rows (y, x and speed) from the room load, no input before row 34`,()=>{
  for(let row=area;row<=area+50;row++){
   assert.equal(at(row).y,nat('y',row),`row +${row-area}: y`);
   assert.equal(at(row).x,nat('x',row),`row +${row-area}: x`);
   assert.equal(at(row).vx,nat('vx',row),`row +${row-area}: speed`);
  }
 });
 test(`${c.id}: entryControlLocked is native engine 7 (no control) from the room load until engine 8 starts`,()=>{
  for(let row=area;row<=area+40;row++)assert.equal(at(row).locked,nat('engine',row)===7,`row +${row-area} native engine ${nat('engine',row)}`);
 });
}
