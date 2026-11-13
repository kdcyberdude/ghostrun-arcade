import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativePodobooState} from '../src/simulation.js';import fixture from './fixtures/native-podoboo-init.json';
test('InitPodoboo preserves actual slot fractions while setting source position, velocity and timer',()=>{
 assert.ok(fixture.attempts>200000);assert.ok(fixture.events.length>20);const fractions=new Set<number>();
 for(const event of fixture.events){
  const before=event.before,after=event.after,model=nativePodobooState(before[13]);fractions.add(before[13]);
  assert.deepEqual(model,{y:after[7]*256+after[8],speed:(after[9]<<24)>>24,force:after[12],fraction:after[13],timer:after[14]},`${event.level} row${event.frame} slot${event.slot}`);
  const expected=[...before];expected[2]=0;expected[3]=2;expected[4]=9;expected[7]=2;expected[8]=2;expected[9]=0;expected[12]=0;expected[14]=1;
  assert.deepEqual(after,expected,`native factory byte ownership ${event.level} row${event.frame}`);
 }
 assert.ok(fractions.size>1,'native reused slots include multiple retained fractions');
});
