import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {playerCell} from '../src/player-cell.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import data from './fixtures/native-vertical-pipe-pose.json';
test('native vertical pipe entry keeps PlayerAnim and drawn cells running with the retained speed',()=>{
 for(const c of data.cases){
  assert.ok(c.rows.length>40);const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,c.entrance);s.step([],0);(s as any).inputs=[];
  const names:Button[]=['a','b','select','start','up','down','left','right'],rows=new Map(c.rows.map(r=>[r[0],r]));
  for(let f=0;f<c.pads.length;f++){s.step(names.filter((_,b)=>c.pads[f]&(1<<b)),1);const row=rows.get(f);if(!row)continue;const p=playerCell(s);assert.deepEqual([p.cell,p.facing],row.slice(1,3),`native ${c.level} engine3 row ${f}`);assert.deepEqual([s.playerAnim.ctrl,s.playerAnim.timer,s.playerAnim.timerSet],row.slice(4,7),`native animation timers ${c.level}:${f}`);}
 }
});
