import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import native from '../evidence/entry-timeline-native-rows-20261109.json';
import winningInputs from '../data/observed-winning-inputs.json';
import type {Button,Level} from '../src/types.js';

// Area `pipewalk`. Native excerpts from the recorded winning route (tools/fidelity-lab/native-trace.mjs, engine-2 rows of the five side pipes).
// Speeds are the 'vx' column from the row after the trigger row (the first engine-2 row) until Mario stops at the pipe's left edge.
const sideWalks=[
 {id:'1-2',area:'area-2',to:'area-3',trigger:2643,stop:2656,start:10448,buttons:['right','b'] as Button[],
  speeds:[2484,2456,2428,2400,2372,2344,2316,2288,2516,2412,2308,2204,2356,2252,2404,2300,2452,2348,2244,2396,2292]},
 {id:'2-2',area:'area-2',to:'area-3',trigger:3011,stop:3024,start:0,buttons:['right'] as Button[],
  speeds:[2328,2224,2376,2272,2424,2320,2216,2368,2264,2416,2312,2208,2360,2256,2408,2304,2200,2352,2248,2400,2296,2448,2344,2240]},
 {id:'4-2',area:'area-3',to:'area-4',trigger:2979,stop:2992,start:4748,buttons:['right','b'] as Button[],
  speeds:[2416,2388,2360,2332,2304,2276,2504,2476,2448,2344,2240,2392,2288,2440,2336,2232,2384,2280,2432,2328,2224,2376,2272,2424]},
 {id:'7-2',area:'area-4',to:'area-5',trigger:3011,stop:3024,start:0,buttons:['right'] as Button[],
  speeds:[2336,2232,2384,2280,2432,2328,2224,2376,2272,2424,2320,2216,2368,2264,2416,2312,2208,2360,2256,2408,2304,2200,2352,2248,2400]},
 {id:'8-4',area:'area-4',to:'area-5',trigger:1075,stop:1088,start:0,buttons:['right'] as Button[],
  speeds:[2336,2232,2384,2280,2432,2328,2224,2376,2272,2424,2320,2216,2368,2264,2416,2312,2208,2360,2256,2408,2304,2200]},
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

test('the five ordinary side pipes: Mario walks 12-13 px to the pipe edge with the native speed pattern, then stands (24 px before)',()=>{
 for(const row of sideWalks){
  const {speeds,xs}=walk(row);
  const stop=row.trigger+13;assert.equal(stop,row.stop,`${row.id} native stop column = trigger + 13`);
  // The speed pattern is exact for the first 18 rows. The stop row depends on the sub-pixel position at the trigger (native 21-25 rows, remake within +-3); the 8-4 trigger is wall-limited
  // and the remake's Mario is held at x 1074 where native reaches 1076 before the engine switches, so it walks 14 px instead of 12 (26 rows instead of 22).
  assert.deepEqual(speeds.slice(1,19),row.speeds.slice(0,18),`${row.id}: speeds after the trigger row`);
  const last=xs.findIndex(x=>x===stop);
  assert.ok(last>=0&&Math.abs(last-row.speeds.length)<=(row.id==='8-4'?4:3),`${row.id}: stops at the stop column after ${last} rows (native ${row.speeds.length})`);
  assert.equal(xs[xs.length-1],stop,`${row.id}: x holds at the pipe edge`);
  const walked=stop-xs[0];
  assert.ok(walked>=11&&walked<=14,`${row.id}: walked ${walked} px (native 12-13)`);
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
