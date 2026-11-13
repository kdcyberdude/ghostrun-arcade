import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativePlatformSpawnCamera,type NativePlatformObject} from '../src/platform-motion.js';
import events from './fixtures/native-platform-birth-events.json';
test('native platform initialization recovers its source column from common, balance and wrap X offsets',()=>{
 assert.ok(events.length>60);
 for(const e of events){
  const kind=e.id===36?'balance':e.id===37?'lift':e.id===40||e.id===42?'horizontal':e.id===41?'drop':'wrap';
  const n={kind,x:e.x} as NativePlatformObject,threshold=nativePlatformSpawnCamera(n),column=threshold+303;
  assert.equal(column&15,0,`${e.level} row${e.frame} source column`);
  assert.equal(e.x-column,kind==='balance'?e.x&8:kind==='wrap'?12:0,`${e.level} row${e.frame} native init offset`);
  assert.ok(e.camera>=threshold,`${e.level} row${e.frame}: column beyond source right boundary`);
  assert.ok(column>=e.camera+255,`${e.level} row${e.frame}: column already left of source right boundary`);
 }
});
