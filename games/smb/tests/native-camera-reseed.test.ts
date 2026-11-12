import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeMaxX} from '../tools/native-camera.js';

// Native 7-4 free-play excerpt (explore-r3 mood1): Mario ran to x 1168 earlier, so the camera is 1056 and he stops at x 1056 pressing left.
const row=(x:number,engine=8)=>({x,engine,world:7,stage:4});
test('re-seed camera is the running max of native x over the visit, not the current x',()=>{
  const rows=[row(1160),row(1168),row(1160),row(1152),row(1144),row(1136)]; // walking left at 8 px per row after the peak
  assert.equal(nativeMaxX(rows,5),1168);
});
test('the scan stops at an area change or a row not under control',()=>{
  assert.equal(nativeMaxX([row(2000),row(100),row(110)],2),110);
  assert.equal(nativeMaxX([row(2000,0),row(100),row(110)],2),110);
});
