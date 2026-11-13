import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {playerCell} from '../src/player-cell.js';import type {Button} from '../src/types.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-victory-events.json',import.meta.url),'utf8')),buttons:Button[]=['a','b','select','start','up','down','left','right'];
const runs=fixture.runtime.filter((r:any)=>r.full);assert.deepEqual(runs.map((r:any)=>r.level),['1-4','2-4','3-4'],'retained full v2 routes must not silently disappear');
for(const run of runs)test(`${run.level}: recorded inputs reach exact victory and world-load rows without a cutscene reset`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.full.entrance);sim.inputs=[];
 for(const pad of run.full.pads)sim.step(buttons.filter((_,bit)=>pad&(1<<bit)),1);
 for(const row of run.rows){
  sim.step(buttons.filter((_,bit)=>row.pad&(1<<bit)),1);
  assert.deepEqual({x:Math.floor(sim.player.x),y:(Math.floor(sim.player.y)-32)&255,camera:sim.camera,time:sim.time,score:sim.score,coins:sim.coins,frameCounter:sim.random.frame,random:sim.random.bytes,interval:sim.intervalControl},{x:row.x,y:row.y,camera:row.camera,time:row.time,score:row.score,coins:row.coins,frameCounter:row.frameCounter,random:row.random,interval:row.interval},`native frame ${row.frame}`);
  if(row.mode===2){assert.equal(sim.nativeVictory.task,row.task);if(row.task>=1)assert.equal(sim.platformSlots.size,0,`native KillAllEnemies platform flags ${row.frame}`);assert.equal(playerCell(sim).cell,row.cell,`native pose ${row.frame}`);assert.deepEqual([sim.playerAnim.ctrl,sim.playerAnim.timer,sim.playerAnim.timerSet],row.anim,`native animation ${row.frame}`);}
  else assert.equal(sim.level.id,`${Number(run.level[0])+1}-1`);
 }
});
