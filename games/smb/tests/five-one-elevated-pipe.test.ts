import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 5-1 elevated pipe uses the observed six cells, now native grid tiles',()=>{
 const area=observedLevels().find(l=>l.id==='5-1')!.areas.find(a=>a.id==='main')!;
 // Native rows moved this from the screenshot cells 2494/2510: the collision map has the pipe in columns 156-157 (x 2496..2527), side contacts stop at x 2484 (x+13 = 2497) and the plant object is at 2504 = left + 8.
 // The native block buffer (tools/harness/native-level-map.ts) has these cells in its columns 156-157, so they are grid tiles.
 assert.deepEqual(area.tiles.filter(([x,y])=>x>=156&&x<=157&&y>=7&&y<=9).map(([x,y,id])=>[x*16,y*16,id]).sort((p,q)=>p[0]-q[0]||p[1]-q[1]),
  [[2496,112,16],[2496,128,20],[2496,144,97],[2512,112,17],[2512,128,21],[2512,144,97]]);
});
