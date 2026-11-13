import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceNativeHorizontalFlight} from '../src/horizontal-paratroopa.js';
import events from './fixtures/native-horizontal-paratroopa-events.json';
test('native horizontal Paratroopa byte counters, subpixel x and y sway match every retained motion row',()=>{
 assert.ok(events.length>100);
 for(const event of events){const n={...event.before};advanceNativeHorizontalFlight(n,event.counter);assert.deepEqual(n,event.after,`${event.level} row${event.frame}`);}
});
