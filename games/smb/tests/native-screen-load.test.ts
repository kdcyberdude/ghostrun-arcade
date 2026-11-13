import {test} from 'node:test';import assert from 'node:assert/strict';import {stepNativeLevelLoad,type NativeLevelLoad} from '../src/native-level-load.js';import data from './fixtures/native-screen-load-events.json';
test('native area initialization and screen tasks follow every original32 source transition',()=>{
 for(const row of data.events){
  const [level,frame,before,flags,tick,after]=row as [string,number,number[],number,number,number[]];
  const n=Object.fromEntries(data.fields.map((field,index)=>[field,before[index]])) as unknown as NativeLevelLoad;n.timeUp=Boolean(flags&1);n.skipIntermediate=Boolean(flags&2);
  stepNativeLevelLoad(n,Boolean(tick));assert.deepEqual(data.fields.map(field=>n[field as keyof NativeLevelLoad]),after,`${level} frame${frame}`);
 }
});
