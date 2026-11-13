import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-one-one-misc-death.json';
const buttons:Button[]=['a','b','select','start','up','down','left','right'],hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const run of fixture.runs)test(`${run.sha256.slice(0,8)} entry${run.entry}: every native coin row continues through injury TimerControl`,()=>{
 const initial=Buffer.from(run.initial,'base64'),pads=Buffer.from(run.pads,'base64'),sim:any=new Simulation(observedLevels());
 assert.equal(hash(initial),run.initialSha256);assert.equal(hash(pads),run.inputSha256);assert.equal(run.receipt.level,'1-1');
 sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,run.receipt));sim.inputs=[];
 const rows=new Map(run.rows.map(r=>[r.frame,r]));let held=0,erased=0;
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);const row=rows.get(frame);if(!row)continue;
  const actual=sim.items.filter((i:any)=>i.life>0&&i.nativeCoin).map((i:any)=>[i.nativeCoin.slot,i.nativeCoin.state,Math.floor(i.x),Math.floor(i.y),i.nativeCoin.speed,i.nativeCoin.force,i.nativeCoin.fraction]).sort((a:number[],b:number[])=>b[0]-a[0]);
  assert.deepEqual(actual,row.coins,`native misc bank local${frame}/source${run.sourceFrameOffset+frame} engine${row.engine} master${row.master}`);
  if(row.engine===11&&row.master>1&&row.coins.length)held++;if(!row.coins.length&&frame>0)erased++;
 }
 assert.ok(held>0,'includes active native coins during held death');assert.ok(erased>0,'includes native misc erasure');
});
