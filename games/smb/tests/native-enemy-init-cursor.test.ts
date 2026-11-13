import {nativeEnemyBytes} from '../src/native-enemy-catalog.js';
import native from './fixtures/native-enemy-init-cursor.json';
import {test} from 'node:test';import assert from 'node:assert/strict';import {NativeEnemyStream,type NativeEnemyInit} from '../src/native-enemy-stream.js';
const context={camera:178,hard:false,primaryHard:false,slot:1,frenzy:0,vine:0,queue:0};
test('Init rejection retains the ordinary record and its applied page-control state',()=>{
 const stream=new NativeEnemyStream([0xe8,0x91,0xff]);const seen:NativeEnemyInit[]=[];
 for(let slot=0;slot<3;slot++){stream.attempt({...context,camera:178,slot},e=>{seen.push(e);return 0;});assert.deepEqual([stream.offset,stream.page,stream.selected],[0,1,true]);}
 assert.deepEqual(seen.map(e=>[e.source,e.id,e.x,e.y,e.flag]),Array(3).fill(['placed',17,480,136,1]));
 stream.attempt(context,()=>1);assert.deepEqual([stream.offset,stream.page,stream.selected],[2,1,false]);
});
test('placed flame/controller flags and frenzy fallback have separate cursor ownership',()=>{
 const stream=new NativeEnemyStream([0xe0,0x95,0xeb,12,0xff]),seen:NativeEnemyInit[]=[];
 const init=(e:NativeEnemyInit)=>{seen.push(e);return e.flag;};stream.attempt(context,init);
 assert.equal(stream.offset,2);assert.equal(seen[0].source,'placed');assert.equal(seen[0].flag,1);
 stream.attempt({...context,slot:2},init);assert.equal(stream.offset,4);assert.equal(seen[1].id,12);
 stream.attempt({...context,slot:3,frenzy:21},init);assert.equal(stream.offset,4);assert.equal(seen[2].source,'frenzy');assert.equal(seen[2].flag,0);
});
test('primary hard mode mutates the initialized Goomba without moving the raw record',()=>{
 const stream=new NativeEnemyStream([0xe6,0x86,0xff]);const event=stream.attempt({...context,primaryHard:true},e=>e.flag);assert.equal(event.init?.id,2);assert.equal(stream.offset,2);
});
test('group handling consumes the record even when no ordinary enemy remains in the parser slot',()=>{
 const stream=new NativeEnemyStream([0xe0,0xb7,0xff]);const event=stream.attempt(context,()=>0);assert.equal(event.init?.source,'group');assert.equal(stream.offset,2);
});

test('queued frenzy initializes a flagged slot without touching the placed cursor',()=>{
 const stream=new NativeEnemyStream([0xe0,0x95,255]),n={...context,queue:18};
 const event=stream.attempt(n,e=>e.flag);assert.equal(event.init?.source,'queue');assert.equal(event.init.flag,1);assert.equal(n.queue,0);assert.equal(stream.offset,0);assert.equal(stream.page,0);
});

test('native accepted/rejected initializers retain exact cursor and page-control ownership across free slots',()=>{
 let checked=0;
 for(const row of native.rows){
  const bytes=nativeEnemyBytes(row.pointer)!,stream=new NativeEnemyStream(bytes,row.before[0],row.before[1],Boolean(row.before[2]));
  const n={camera:row.camera,hard:row.hard,primaryHard:row.primaryHard,slot:0,frenzy:row.frenzy,vine:row.vine,queue:row.queue};let lakitu=0;
  if(row.task!==7)for(let slot=0;slot<6;slot++){
   if(row.flags[slot])continue;n.slot=slot;
   stream.attempt(n,event=>{if(event.id===17){lakitu++;return n.frenzy?0:1;}return event.flag;});
  }
  assert.ok(lakitu>0,`${row.level} row${row.row}: native initializer visited`);
  assert.deepEqual([stream.offset,stream.page,Number(stream.selected)],row.after,`${row.level} row${row.row}`);checked++;
 }
 assert.equal(checked,193);
});
