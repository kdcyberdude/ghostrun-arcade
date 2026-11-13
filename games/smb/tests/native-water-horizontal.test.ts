import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeWaterHorizontal} from '../src/native-water-horizontal.js';
import fixture from './fixtures/native-water-horizontal-cases.json';

test('source water horizontal routines match every recorded native transition before later body byte resets',()=>{
 let checked=0;
 for(const c of fixture.cases){
  const [speed,facing,moving,absolute,collision,running,grounded,buttons,stroke]=c.input as [number,number,number,number,number,number,boolean,number,boolean];
  const got=nativeWaterHorizontal({speed,facing,moving,absolute,collision,running,grounded},buttons,stroke);
  // ImpedePlayerMove and screen bounds run after this unit and clear only
  // the speed byte. The source force and all other outputs remain comparable.
  const result=[c.reset?got.speed&255:got.speed,got.facing,got.moving,got.absolute,got.running,got.friction];
  assert.deepEqual(result,c.expected,`${fixture.sources[c.source]} row${c.frame} (${c.reset??'no later byte reset'})`);
  checked+=c.count;
 }
 assert.equal(checked,fixture.transitions);assert.ok(checked>=493438);
});
