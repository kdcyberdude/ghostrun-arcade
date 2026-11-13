import {test} from 'node:test';
import assert from 'node:assert/strict';
import {landNativeWalker} from '../src/native-walker-motion.js';
import events from './fixtures/native-walker-landings.json';

test('all native ordinary-walker landings snap and clear gravity, keep fraction, and face Mario before movement',()=>{
 assert.ok(events.length>30);
 for(const event of events){
  const n={...event.before};landNativeWalker(n,event.goomba,event.marioX);n.x+=n.vx;
  assert.deepEqual(n,event.after,`${event.level} row${event.row}`);
 }
});
