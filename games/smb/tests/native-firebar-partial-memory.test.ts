import {test} from 'node:test';import assert from 'node:assert/strict';import {FirebarSlots} from '../src/firebar-slots.js';import fixture from './fixtures/native-firebar-partial-memory.json';
test('partial InitializeMemory clears firebar0388 without releasing owners or changing angle aliases',()=>{
 assert.ok(fixture.events.length>=6);
 for(const event of fixture.events){const bar={x:event.x,y:event.y,length:event.before.id===31?12:6,speed:0},slots=new FirebarSlots([bar]);slots.initializeNative(bar,event.slot,event.before);const held=[...slots.held()],aliases=slots.aliasStates();slots.clearPartialMemory();assert.deepEqual(slots.nativeBytes(bar),event.after,`${event.level} row${event.frame}`);assert.deepEqual([...slots.held()],held);assert.deepEqual(slots.aliasStates(),aliases);}
});
