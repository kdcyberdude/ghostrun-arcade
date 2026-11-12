import {test} from 'node:test';
import assert from 'node:assert/strict';
import timeline from '../data/pipe-exit-timeline.json';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Button,Level,PipeSpec} from '../src/types.js';

// Native side pipes (data/pipe-exit-timeline.json) start the entering animation when a grounded Mario moving right reaches
// the column wall-29; the old window |x+14-pipe.x|<3 started it up to 46 px late. In all five measured pipes the trigger is
// bracketed by the last engine-8 row and the first engine-2 row, one or two pixels apart.
const sidePipes=timeline.pipes.filter(p=>'entryTriggerX' in p) as {level:string;from:string;to:string;entryTriggerX:number}[];

function sim(row:{level:string;from:string},spawn:[number,number],mutate?:(s:Simulation)=>void){
 const level:Level=structuredClone(observedLevels().find(l=>l.id===row.level)!);level.main=row.from;
 const area=level.areas.find(a=>a.id===row.from)!;area.spawn=spawn;area.camera=Math.max(0,spawn[0]-112);area.entryFall=undefined;area.spawnVelocity=[0,0];
 const s=new Simulation([level]);s.reset(true);mutate?.(s);return s;
}
const pipeOf=(row:{level:string;from:string;to:string}):PipeSpec=>observedLevels().find(l=>l.id===row.level)!.areas.find(a=>a.id===row.from)!.pipes!.find(p=>p.to===row.to)!;
// Mario's feet row while he walks up to the pipe equals the pipe spec y (the water-room pipes of 2-2/7-2 sit on a raised ledge).
const floorY=(row:{level:string;from:string;to:string})=>pipeOf(row).y;

test('walking right into a side pipe starts the entering animation at the native trigger column',()=>{
 for(const row of sidePipes){
  const s=sim(row,[row.entryTriggerX-12,floorY(row)]);
  let started=-1;
  for(let i=0;i<200&&started<0;i++){s.step(['right'],1);if(s.phase==='pipe')started=Math.floor(s.player.x);}
  assert.ok(started>=0,`${row.level} ${row.from}: pipe entered`);
  // x is sampled after the starting frame has also advanced Mario by his current speed (< 2 px/frame at walking pace).
  // Water-room pipes (2-2, 7-2, 8-4) put the trigger column at the pipe wall itself (wall - 13). The native swim motor keeps Mario's
  // integer x one pixel below it while he presses on the wall (native x holds the same value for 14 rows before the engine switches),
  // so the remake starts the animation on the first blocked step at trigger - 1 there.
  // The 4-2 mouth is a solid rect since the geometry correction (native rows hold Mario at x 2978-2979 flush with a wall at 2992), the same case.
  const area=observedLevels().find(l=>l.id===row.level)!.areas.find(a=>a.id===row.from)!;
  const wallLimited=pipeOf(row).x-13===row.entryTriggerX||(area.solidRects??[]).some(r=>r.x-13===row.entryTriggerX);
  assert.ok(started>=row.entryTriggerX-(wallLimited?1:0)&&started<=row.entryTriggerX+2,`${row.level} ${row.from}: started at ${started}, native trigger ${row.entryTriggerX}`);
 }
});

test('a side pipe is not entered while airborne at the trigger column',()=>{
 for(const row of sidePipes){
  const s=sim(row,[row.entryTriggerX+2,floorY(row)-64]);
  for(let i=0;i<10;i++){
   s.step(['right'],1);
   if(!s.player.grounded)assert.notEqual(s.phase,'pipe',`${row.level} ${row.from}: airborne frame ${i}`);
  }
 }
});

test('a side pipe is not entered without moving right at the trigger column',()=>{
 for(const row of sidePipes){
  const s=sim(row,[row.entryTriggerX-6,floorY(row)]);
  s.step(['down'],30);
  assert.equal(s.phase,'play',`${row.level} ${row.from}: standing still`);
 }
});

test('8-4 water pipe starts from momentum alone at its trigger column (native trigger with only Down held)',()=>{
 const row=sidePipes.find(r=>r.level==='8-4')!;
 const s=sim(row,[row.entryTriggerX-12,floorY(row)],g=>{g.player.vx=1.5;});
 let entered=false;
 for(let i=0;i<30&&!entered;i++){s.step(['down' as Button],1);entered=s.phase==='pipe';}
 assert.ok(entered,'coasting Mario enters when he reaches the trigger column');
});
