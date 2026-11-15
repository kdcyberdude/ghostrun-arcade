import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {playerCell,playerVisible} from '../src/player-cell.js';
import {PlayerAnim} from '../src/player-anim.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-player-pose.json';
import type {Button} from '../src/types.js';

const names:Button[]=['a','b','select','start','up','down','left','right'];
for(const observed of fixture.cases)test(`native player graphics offset, facing and palette phase on every retained v2 frame: ${observed.level}`,()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,observed.entrance);sim.step([],0);(sim as any).inputs=[];
 const rows=new Map(observed.rows.map(row=>[row[0],row]));let compared=0;
 for(let f=0;f<observed.pads.length;f++){
  sim.step(names.filter((_,b)=>observed.pads[f]&(1<<b)),1);
  const row=rows.get(f);if(!row||sim.phase!=='play')continue;
  const {cell,facing}=playerCell(sim);
  assert.deepEqual([cell,facing],row.slice(1,3),`${observed.level} native frame ${f}`);
  assert.equal(sim.colorRotations%6,row[3],`${observed.level} native frame ${f}: ColorRotateOffset`);compared++;
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

test('injury flicker follows native FrameCounter through a shrink freeze and across the global clock phase',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 sim.player.size=1;sim.hurt();assert.equal(sim.powerChange?.kind,'shrink');
 sim.frame=0;sim.random.frame=255;assert.equal(playerVisible(sim),false,'odd native frame hides Mario during shrink');
 sim.frame=4;sim.random.frame=0;assert.equal(playerVisible(sim),true,'native counter wrap draws even when global frame/4 is odd');
 sim.powerChange=undefined;sim.frame=8;sim.random.frame=1;assert.equal(playerVisible(sim),false,'injury continues hiding odd rows after shrink');
 sim.player.invincible=0;assert.equal(playerVisible(sim),true,'without InjuryTimer every counter phase draws');
 sim.flagInside=true;assert.equal(playerVisible(sim),false,'castle entry still hides Mario');
});

test('the shrink freeze keeps the big pose for 16 rows, then HandleChangeSize draws a swim frame 1',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);sim.player.size=1;sim.playerAnim.fresh=false;sim.hurt();
 for(const age of [0,1,2,15]){sim.powerChange!.remaining=55-age;assert.equal(playerCell(sim).cell,25,`native shrink freeze row ${age}`);}
 for(const age of [16,30]){sim.powerChange!.remaining=55-age;assert.ok([5,17].includes(playerCell(sim).cell),`native shrink freeze row ${age}`);}
 sim.powerChange!.remaining=1;assert.equal(playerCell(sim).cell,23,'the last shrink row draws the small ordinary pose (371fe2fe 2-1 RAM 18288)');
 assert.equal(sim.player.size,1,'the renderer selects a small cell while the physical size change still waits for the end of the freeze');
});
