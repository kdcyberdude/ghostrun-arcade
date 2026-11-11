import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 8-1 retains the winged actor without a duplicate post-stomp Koopa',()=>{
 const area=observedLevels().find(l=>l.id==='8-1')!.areas.find(a=>a.id==='main')!;
 assert.equal(area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===2832&&e.y===208).length,1);
 assert.equal(area.enemies.filter(e=>e.kind==='koopa'&&e.x===2816&&e.y===192).length,0);
});
