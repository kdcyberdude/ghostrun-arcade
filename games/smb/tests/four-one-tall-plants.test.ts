import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 4-1 tall pipes contain both observed Piranhas',()=>{
 const area=observedLevels().find(l=>l.id==='4-1')!.areas.find(a=>a.id==='main')!;
 const plants=area.enemies.filter(e=>e.kind==='piranha'&&(e.x===1864||e.x===2120));
 assert.deepEqual(plants.map(e=>[e.x,e.y]),[[1864,168],[2120,168]]);
});
