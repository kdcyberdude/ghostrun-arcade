import {test} from 'node:test';
import assert from 'node:assert/strict';
import {excerptReplay,type Excerpt} from '../tools/harness/native-excerpt.js';
import run from '../evidence/native-runs/4-4.v2.json';

// Native 4-4 v2 row11398 is a firebar death on a due game-timer row: engine8->11, digits stay292.
// RunGameTimer runs after the enemy loop and returns on engine11; this full replay also verifies both preceding deaths and castle loopbacks.
test('4-4 v2: death on a due game-timer row leaves every compared frame and field native-exact',()=>{
 const result=excerptReplay(run as Excerpt);
 assert.equal(result.first,null,JSON.stringify(result.fields));
});
