import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 2-4 has the three reference-observed firebar pivot bases',()=>{
 const area=observedLevels().find(l=>l.id==='2-4')!.areas.find(a=>a.id==='main')!;
 for(const tile of [[49,9,196],[73,9,196],[92,10,196]])
  assert.ok(area.tiles.some(t=>t[0]===tile[0]&&t[1]===tile[1]&&t[2]===tile[2]));
});
