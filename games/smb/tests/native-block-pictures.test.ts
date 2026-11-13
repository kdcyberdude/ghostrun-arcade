import {test} from 'node:test';import assert from 'node:assert/strict';import {nativeBlockSprites} from '../src/native-block-picture.js';import data from './fixtures/native-block-pictures.json';
test('bouncing blocks draw the native four OAM pieces, palette and flips',()=>{
 assert.ok(data.checked>10);for(const e of data.events)assert.deepEqual(nativeBlockSprites(e,e.ground,e.camera),e.sprites,`${e.level}:${e.frame}`);
});
