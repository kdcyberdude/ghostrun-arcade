import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

test('World 5-1 elevated pipe uses the observed six cells without overlapping grid tiles',()=>{
 const area=observedLevels().find(l=>l.id==='5-1')!.areas.find(a=>a.id==='main')!;
 assert.deepEqual(area.tiles.filter(([x,y])=>x>=156&&x<=157&&y>=7&&y<=9),[]);
 // Native rows moved this from the screenshot cells 2494/2510: the collision map has the pipe in columns 156-157 (x 2496..2527), side contacts stop at x 2484 (x+13 = 2497) and the plant object is at 2504 = left + 8.
 assert.deepEqual(area.freeTiles?.filter(t=>[2496,2512].includes(t.x)&&[112,128,144].includes(t.y)).map(t=>[t.x,t.y,t.id]),
  [[2496,112,16],[2496,128,20],[2496,144,97],[2512,112,17],[2512,128,21],[2512,144,97]]);
});
