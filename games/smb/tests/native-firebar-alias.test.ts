import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {FirebarSlots} from '../src/firebar-slots.js';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-firebar-alias-events.json';

test('long firebar duplicate reserves the lowest free slot and retains its pre-initializer raw anchor',()=>{
 const bar={x:376,y:120,length:12,speed:0.03},slots=new FirebarSlots([bar]);slots.managed=true;slots.busy=s=>s===0||s===1;
 slots.initializeNative(bar,2,{id:31,high:7,low:0,speed:40,direction:0});assert.deepEqual(slots.aliasStates(),[{slot:3,flag:130,owner:2,x:368,y:112}]);assert.deepEqual([...slots.held()],[2,3]);
 const raw=slots.nativeBytes(bar);assert.equal(slots.visitAlias(3),'held');assert.deepEqual(slots.nativeBytes(bar),raw,'alias runs no motor');
 slots.turn(2,500);assert.equal(slots.nativeBytes(bar),undefined);assert.equal(slots.held().has(3),true,'alias retains its flag until its own turn');assert.equal(slots.visitAlias(3),'cleared');assert.equal(slots.held().has(3),false);
});

test('a lower alias waits until next turn after its owner erases; KillAllEnemies preserves slot5 aliases',()=>{
 const bar={x:376,y:120,length:12,speed:0.03},slots=new FirebarSlots([bar]);slots.managed=true;
 slots.initializeNative(bar,3,{id:31,high:0,low:0,speed:40,direction:0});assert.equal(slots.aliasStates()[0].slot,0);assert.equal(slots.visitAlias(0),'held');slots.turn(3,500);assert.equal(slots.held().has(0),true);assert.equal(slots.visitAlias(0),'cleared');
 slots.busy=s=>s<4;slots.initializeNative(bar,4,{id:31,high:0,low:0,speed:40,direction:0});assert.equal(slots.aliasStates()[0].slot,5);slots.eraseAll();assert.equal(slots.held().has(5),true);assert.equal(slots.visitAlias(5),'cleared');
});

test('complete original long-firebar alias lifetime and raw copied positions match the native bank',()=>{
 const buttons=['a','b','select','start','up','down','left','right'] as const;assert.ok(fixture.runs.length>0);
 for(const source of fixture.runs){const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${source.level}.v2.json`,import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),pads=unpack(run.pads);
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(run.initialRam),{level:source.level}));sim.step([],0);sim.inputs=[];
  for(const row of source.rows){sim.step(buttons.filter((_,b)=>pads[row.frame]&(1<<b)),1);assert.deepEqual(sim.firebarSlots?.aliasStates()??[],row.aliases,`${source.level} row${row.frame}`);}
 }
});
