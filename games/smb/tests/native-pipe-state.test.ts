import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeVerticalPipe} from '../src/native-pipe.js';
import nativeEvents from './fixtures/native-pipe-events.json';
import moodEvents from './fixtures/native-pipe-mood-events.json';
const events=[...nativeEvents,...moodEvents];

test('native vertical pipe rows retain scroll inertia, move raw Y and decrement the area timer exactly',()=>{
 assert.ok(events.length>=96);assert.ok(events.some(e=>e.before.camera!==e.after.camera));
 for(const event of events){const n={...event.before};nativeVerticalPipe(n,event.screen,event.sideTimer,event.locked);assert.deepEqual(n,event.after,`${event.level} row${event.frame}`);}
});
