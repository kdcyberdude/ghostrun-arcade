import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 5-1 elevated Piranha aligns with the observed pipe',()=>{
 const area=observedLevels().find(l=>l.id==='5-1')!.areas.find(a=>a.id==='main')!;
 const plants=area.enemies.filter(e=>e.kind==='piranha'&&e.x>=2490&&e.x<=2510);
 assert.equal(plants.length,1);
 assert.equal(plants[0].x,2504); // native object x 2504 (id 13, route rows 39300-39700) = pipe left 2496 + 8; was the screenshot-era 2502
});
