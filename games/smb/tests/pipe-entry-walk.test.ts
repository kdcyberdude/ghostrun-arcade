import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Button,Level} from '../src/types.js';
import {nativeEntrySequence} from './helpers/native-entry-sequence.js';

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

// Native engine7/8 ownership is checked from authenticated PPU snapshots;
// the source load-control interval is retained instead of assuming165 rows.
for(const level of ['2-2','7-2','1-2','4-2']){
 const run=nativeEntrySequence(level);
 test(`${level}: entryControlLocked follows every secondary-room native engine row`,()=>{
  let rows=0;for(const {frame,r,actual:a}of run.rows)if(a.area!==run.main&&r[0x772]===3&&[7,8].includes(r[14])){rows++;assert.equal(a.locked,r[14]===7,`frame${frame}`);assert.equal(a.x,r[0x6d]*256+r[0x86],`frame${frame} x`);assert.equal(a.y,(r[0xb5]-1)*256+r[0xce],`frame${frame} y`);}assert.ok(rows>80);
 });
}
