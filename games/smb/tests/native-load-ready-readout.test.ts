import {test} from 'node:test';import assert from 'node:assert/strict';import {victoryLoadChecks} from '../tools/harness/native-victory-readout.js';import fixture from './fixtures/native-load-ready-events.json';
const ready=(r:Uint8Array,sim:any)=>victoryLoadChecks(r,sim).find(c=>c[0]==='load.ready');
test('all166 native5-4 continuation rows retain an explicit false readiness check while the load object is owned',()=>{
 assert.equal(fixture.rows.length,166);assert.deepEqual([fixture.rows[0].frame,fixture.rows.at(-1)!.frame],[2506,2671]);
 for(const row of fixture.rows){const r=new Uint8Array(2048);r[9]=row.counter;r.set(row.random,0x7a7);r[0x77f]=row.interval;r[0x772]=row.task;r[14]=row.engine;r[0x73c]=row.screen;r[0x774]=row.disable;const sim={levelLoad:{task:row.task,engine:row.engine,screen:row.screen,disable:row.disable},phase:'play',area:{autoWalk:false},entryControlLocked:false,random:{frame:row.counter,bytes:row.random},intervalControl:row.interval};
  assert.deepEqual(ready(r,sim),['load.ready',false,false],`frame${row.frame}`);for(const [field,native,model]of victoryLoadChecks(r,sim))assert.deepEqual(model,native,`${row.frame}/${field}`);
 }
});
test('retaining a load object after native PlayerRdy is a reported readiness mismatch',()=>{const r=new Uint8Array(2048);r[0x772]=3;r[14]=8;assert.deepEqual(ready(r,{levelLoad:{},phase:'play',area:{},entryControlLocked:false,random:{frame:0,bytes:[]},intervalControl:0}),['load.ready',true,false]);});
test('both early release and the actual ready row remain compared',()=>{const r=new Uint8Array(2048),sim={phase:'play',area:{},entryControlLocked:false,random:{frame:0,bytes:[]},intervalControl:0};assert.deepEqual(ready(r,sim),['load.ready',false,true]);r[0x772]=3;r[14]=8;assert.deepEqual(ready(r,sim),['load.ready',true,true]);});
