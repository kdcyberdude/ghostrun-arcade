import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceNativeSpring,nativeSpring} from '../src/native-spring.js';
import events from './fixtures/native-spring-events.json';

test('every native spring handler row matches control, timer, force, artwork compression and Mario movement',()=>{
 assert.ok(events.length>=60);
 for(const event of events){
  const n={...event.before},step=advanceNativeSpring(n,event.edgeA,!event.born);
  assert.deepEqual(n,event.after,`${event.level} row${event.frame}`);
  assert.equal((event.yBefore+step.dy)&255,event.yAfter,`${event.level} row${event.frame} Mario Y`);
  assert.equal(step.launch?n.force:0,event.speedAfter,`${event.level} row${event.frame} Mario speed`);
 }
});

test('an A edge can increase launch force only from the second compression cell onward',()=>{
 const early=nativeSpring();advanceNativeSpring(early,true,false);assert.equal(early.force,-7);
 const later=nativeSpring();later.control=2;advanceNativeSpring(later,true);assert.equal(later.force,-12);
});

test('holding A without a new edge retains the native low spring launch',()=>{
 const n=nativeSpring();let launches=0;
 for(let i=0;i<13;i++){const step=advanceNativeSpring(n,false,i!==0);if(step.launch){launches++;assert.equal(n.force,-7);}}
 assert.equal(launches,1);assert.equal(n.control,0);
});
