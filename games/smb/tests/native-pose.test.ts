import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {playerCell} from '../src/player-cell.js';
import {PlayerAnim} from '../src/player-anim.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-player-pose.json';
import type {Button} from '../src/types.js';

const names:Button[]=['a','b','select','start','up','down','left','right'];
for(const observed of fixture.cases)test(`native player graphics offset and facing on every retained v2 frame: ${observed.level}`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,observed.entrance);sim.step([],0);(sim as any).inputs=[];
 const rows=new Map(observed.rows.map(row=>[row[0],row]));let compared=0;
 for(let f=0;f<observed.pads.length;f++){
  sim.step(names.filter((_,b)=>observed.pads[f]&(1<<b)),1);
  const row=rows.get(f);if(!row||sim.phase!=='play')continue;
  const {cell,facing}=playerCell(sim);
  assert.deepEqual([cell,facing],row.slice(1),`${observed.level} native frame ${f}`);compared++;
 }
 assert.ok(compared>0);
});

test('native animation displays the current frame before advancing and preserves its timer through nonanimated actions',()=>{
 const anim=new PlayerAnim();anim.reset(2,0,4,false);
 assert.equal(anim.animate(3),2);assert.equal(anim.ctrl,0);assert.equal(anim.timer,4);
 anim.tick();assert.equal(anim.still(),0);assert.equal(anim.timer,3);
 anim.setSpeed(0x1c);assert.equal(anim.timerSet,2);assert.equal(anim.timer,3);
 anim.tick();assert.equal(anim.hold(),0);assert.equal(anim.timer,2);
 anim.reset(1,0,7,false);assert.equal(anim.animate(2),1);assert.equal(anim.ctrl,0);
});
