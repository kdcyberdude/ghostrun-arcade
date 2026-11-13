import {test} from 'node:test';import assert from 'node:assert/strict';import {nativeFlagSprites} from '../src/native-flag-picture.js';import {nativeFlagNumberStep} from '../src/native-flagpole.js';import data from './fixtures/native-flag-pictures.json';
test('flagpole number uses its own native SBC motor, including dummy-byte borrow',()=>{
 assert.ok(data.moves.length>100);for(const e of data.moves){const n=nativeFlagNumberStep(e.before[0],e.before[1]);assert.deepEqual([n.y,n.fraction],e.after,`${e.level}:${e.frame}`);}
});
test('flag and score sprites match native owner/offscreen gating and OAM +1 coordinates',()=>{
 assert.ok(data.checked>1000);for(const e of data.events)assert.deepEqual(nativeFlagSprites(e.slot,e.number,e.camera),e.sprites,`${e.level}:${e.frame}`);
});
