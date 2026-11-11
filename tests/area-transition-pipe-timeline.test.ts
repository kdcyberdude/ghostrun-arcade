import {test} from 'node:test';
import assert from 'node:assert/strict';
import timeline from '../data/pipe-exit-timeline.json';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Button,Level,PipeSpec} from '../src/types.js';

// Native row counts (data/pipe-exit-timeline.json): the same in all eight observed area-changing pipes of each kind.
// entering animation (engine 2/3) + load/black rows + first playable row + 96-row locked rise out of the destination pipe.
const nativeGap=(direction:string)=>timeline.entryFrames[direction==='down'?'down':'right']+timeline.loadFrames+timeline.rise.frames;

function pipeOf(levelId:string,from:string,to:string):PipeSpec{
 const level=observedLevels().find(l=>l.id===levelId)!;
 return level.areas.find(a=>a.id===from)!.pipes!.find(p=>p.to===to)!;
}

// Place Mario next to a pipe, hold the entry button and report how the remake plays the transition frame by frame.
function run(levelId:string,from:string,spawn:[number,number],buttons:Button[],frames:number){
 const level:Level=structuredClone(observedLevels().find(l=>l.id===levelId)!);level.main=from;
 const area=level.areas.find(a=>a.id===from)!;area.spawn=spawn;area.camera=Math.max(0,spawn[0]-112);area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim=new Simulation([level]);sim.reset(true);
 const log:{phase:string;area:string;y:number;x:number;rising:boolean}[]=[];
 for(let i=0;i<frames;i++){sim.step(i<24?buttons:[],1);log.push({phase:sim.phase,area:sim.area.id,x:sim.player.x,y:sim.player.y,rising:sim.pipeRising});}
 return log;
}

test('compiled pipes carry the native entering+load frames, rise length and side-pipe trigger column',()=>{
 for(const row of timeline.pipes){
  const pipe=pipeOf(row.level,row.from,row.to);
  assert.equal(pipe.transitionFrames,timeline.entryFrames[pipe.direction==='down'?'down':'right']+timeline.loadFrames,`${row.level} ${row.from}->${row.to}`);
  assert.equal(pipe.riseFrames,timeline.rise.frames,`${row.level} ${row.from}->${row.to}`);
  assert.equal(pipe.entryTriggerX,'entryTriggerX' in row?row.entryTriggerX:undefined,`${row.level} ${row.from}->${row.to}`);
 }
 assert.equal(nativeGap('right'),174);assert.equal(nativeGap('down'),170);
});

for(const [name,levelId,from,to,spawn,buttons,direction] of [
 ['4-2 side pipe','4-2','area-3','area-4',[2994,160],['right'],'right'],
 ['8-4 down pipe','8-4','main','area-2',[1304,128],['down'],'down'],
] as [string,string,string,string,[number,number],Button[],string][]){
 test(`${name}: control returns exactly the native number of rows after the last control row`,()=>{
  const log=run(levelId,from,spawn,buttons,260);
  const start=log.findIndex(r=>r.phase==='pipe'),change=log.findIndex(r=>r.area===to);
  assert.ok(start>=0&&change>start,'pipe animation then area change');
  // The area changes after the entering animation + load rows ...
  assert.equal(change-start,timeline.entryFrames[direction==='down'?'down':'right']+timeline.loadFrames);
  // ... Mario then starts 96 px below his spawn feet and rises out of the pipe one pixel per frame, locked.
  const spawnFeet=pipeOf(levelId,from,to).spawn[1];
  assert.equal(log[change].y,spawnFeet+timeline.rise.frames);assert.equal(log[change].rising,true);
  const control=log.findIndex((r,i)=>i>change&&!r.rising);
  assert.equal(control-change,timeline.rise.frames);assert.equal(log[control].y,spawnFeet);
  assert.equal(control-start,nativeGap(direction));
  for(let i=change;i<control;i++){
   assert.equal(log[i].y,spawnFeet+timeline.rise.frames-(i-change),`rise row ${i-change}`);
   assert.equal(log[i].x,log[change].x,'x is locked while rising');
  }
 });
}

test('the rise ignores movement and jump input and Mario is not killed or hurt by the rise',()=>{
 const level:Level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';
 const area=level.areas.find(a=>a.id==='area-3')!;area.spawn=[2994,160];area.camera=2882;area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim=new Simulation([level]);sim.reset(true);
 for(let i=0;i<200&&!sim.pipeRising;i++)sim.step(i<8?['right']:[],1);
 assert.equal(sim.pipeRising,true);const x=sim.player.x,lives=sim.lives;
 sim.step(['right','a','b'],40);
 assert.equal(sim.player.x,x);assert.equal(sim.player.y,sim.area.spawn[1]+timeline.rise.frames-40);assert.equal(sim.lives,lives);
 sim.step(['right','a','b'],timeline.rise.frames-40);
 assert.equal(sim.pipeRising,false);assert.equal(sim.player.y,sim.area.spawn[1]);assert.equal(sim.player.grounded,true);
});
