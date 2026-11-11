import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 8-2 opening keeps the observed winged Koopa without a duplicate post-stomp actor',()=>{
 const area=observedLevels().find(l=>l.id==='8-2')!.areas.find(a=>a.id==='main')!;
 assert.equal(area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===288).length,1);
 assert.equal(area.enemies.filter(e=>e.kind==='koopa'&&e.x===240&&e.y===176).length,0);
});
