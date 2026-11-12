import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

/** 8-3 first Paratroopa (x 480): model-play r6 (all 7 moods share the start) shows the native slot (id 14) appear at row 130 with x 480 and
 * move to 479 at row 131, when the remake camera after row 130 is 177 (route trace 73009 agrees once its capture phase is taken into account).
 * With spawnCamera 180 the remake moved it one row late, its half-pixel x phase was off by 1 px and the native stomp at dx 11 (row 190) was missed. */
test('8-3 first Paratroopa activates at the native camera 177',()=>{
 const spec=observedLevels().find(l=>l.id==='8-3')!.areas.find(a=>a.id==='main')!.enemies.find(e=>e.kind==='paratroopa'&&e.x===480)!;
 assert.equal(spec.spawnCamera,177);
});
