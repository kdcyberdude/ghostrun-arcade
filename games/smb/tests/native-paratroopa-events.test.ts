import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {advanceNativeGreenParatroopa,type NativeGreenMotion} from '../src/native-paratroopa.js';
import fixture from './fixtures/native-paratroopa-events.json';
const events=JSON.parse(zlib.gunzipSync(Buffer.from(fixture.rows,'base64')).toString('utf8')) as {level:string;row:number;slot:number;before:NativeGreenMotion;after:NativeGreenMotion;cells:{x:number;y:number;value:number}[]}[];

test('jumping Paratroopa floor/side probes and byte movement match every supported native row',()=>{
 assert.ok(events.length>5000);
 for(const event of events){
  const n={...event.before};
  advanceNativeGreenParatroopa(n,(x,y)=>{
   const cell=event.cells.find(c=>c.x===x&&c.y===y);assert.ok(cell,`${event.level} row${event.row}: ${x},${y}`);
   return ![0,0x26,0xc2,0xc3,0x5f,0x60].includes(cell.value);
  });
  assert.deepEqual(n,event.after,`${event.level} row${event.row} slot${event.slot}`);
 }
});
