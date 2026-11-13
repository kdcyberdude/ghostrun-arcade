import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import source from './fixtures/native-pipe-load-runtime.json';
import type {Level} from '../src/types.js';

test('6-2 optional water entry runs the native header-driven swimming entrance on every row',()=>{
 const original=observedLevels().find(l=>l.id==='6-2')!,main=structuredClone(original.areas.find(a=>a.id==='main')!);
 const pipe=main.pipes!.find(p=>p.to==='optional-water')!;main.spawn=[pipe.x-8,pipe.y];main.enemies=[];
 const level:Level={...original,main:'main',areas:[main,...original.areas.filter(a=>a.id!=='main')]};
 const sim=new Simulation([level]);sim.reset(true);
 for(let frame=0;frame<200&&(sim.area.id==='main'||sim.phase!=='play');frame++)sim.step(['down'],1);
 assert.equal(sim.area.id,'optional-water');assert.equal(sim.phase,'play');
 // The former image-only test guessed the loader origin. Compare the shared
 // ROM water entrance against an unreset native engine7 prefix instead.
 const run=source.runs.find(run=>run.level==='2-2')!,first=run.rows.findIndex(row=>row.state.task===3&&row.state.engine===7);
 for(const [i,row]of run.rows.slice(first).entries()){
  if(i)sim.step([],1);assert.equal(Math.floor(sim.player.y)-32,row.y,`native entrance row${i}`);assert.equal(sim.player.x,24);
 }
 assert.equal(sim.lives,3);assert.equal(sim.entryTimerHidden,false);
});
