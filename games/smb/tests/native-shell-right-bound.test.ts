import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import window from './fixtures/native-shell-right-window.json';

test('native right-bound erasure releases a moving shell before subsequent slot births',()=>{
 const unpack=(data:string)=>new Uint8Array(gunzipSync(Buffer.from(data,'base64'))),pads=unpack(window.pads),sim:any=new Simulation(observedLevels());
 sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(window.initialRam),window.receipt));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 for(let frame=0;frame<pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>pads[frame]&(1<<bit)),1);const row=window.rows.find(row=>row.frame===frame);if(!row)continue;
  assert.equal(sim.score,row.score,`score row${frame}`);
  const actual=sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&!e.dead&&['koopa','redKoopa','beetle'].includes(e.kind)).map((e:any)=>({slot:e.enemySlot,x:e.x,y:e.y})).sort((a:any,b:any)=>a.slot-b.slot);
  assert.deepEqual(actual,row.actors.map(e=>({slot:e.slot,x:e.x,y:e.y})),`cardinality/position row${frame}`);
 }
});

test('the native right-bound carry uses the physical area page, including projected rooms',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=0;
 for(const [offset,x,erased]of [[0,326,false],[0,327,true],[-1792,327,false],[-1792,328,true]] as const){
  const enemy=sim.makeEnemy({kind:'koopa',x,y:208});Object.assign(enemy,{active:true,enemySlot:0});sim.enemies=[enemy];sim.nativeAreaOffset=offset;sim.eraseOffscreenEnemies();
  assert.equal(enemy.dead>=100,erased,`offset${offset} x${x}`);
 }
});
