import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeBubbleShown} from '../src/view-rules.js';
import fixture from './fixtures/native-bubble-pictures.json';
test('native bubble rings use raw OAM coordinates and the player page/offscreen gate',()=>{
 assert.ok(fixture.checked>1000);
 for(const e of fixture.events){
  assert.equal(nativeBubbleShown(e,e.playerFeetY,e.camera),true,`${e.level}:${e.frame}`);
  assert.deepEqual({x:(Math.floor(e.x)-Math.floor(e.camera))&255,y:e.y+1},e.sprite,`${e.level}:${e.frame}`);
 }
 assert.equal(nativeBubbleShown({x:100,y:80},31,0),false);
 assert.equal(nativeBubbleShown({x:100,y:80},288,0),false);
 assert.equal(nativeBubbleShown({x:100,y:80},100,0),true);
 assert.equal(nativeBubbleShown({x:356,y:80},100,0),false);
});
