import {test} from 'node:test';import assert from 'node:assert/strict';import {NativeEnemyStream,type NativeEnemyInit} from '../src/native-enemy-stream.js';import {nativeEnemyBytes} from '../src/native-enemy-catalog.js';import data from './fixtures/native-enemy-cursor-instructions.json';
test('observed CPU parser attempts retain exact cursor and initializer dispatch across actor families',()=>{
 let checked=0;
 for(const row of data.rows){
  const stream=new NativeEnemyStream(nativeEnemyBytes(row.pointer)!,row.before[0],row.before[1],Boolean(row.before[2]));let called:NativeEnemyInit|undefined;
  stream.attempt({camera:row.camera,hard:Boolean(row.hard),primaryHard:Boolean(row.primaryHard),slot:row.slot,frenzy:row.frenzy,vine:row.vine,queue:row.queue},event=>{called=event;return row.flag;});
  const label=`${row.source} frame${row.frame} slot${row.slot}`;assert.deepEqual([stream.offset,stream.page,Number(stream.selected)],row.after,label);
  if(called){if(called.source!=='group'){assert.ok(row.init.length>0,label);assert.deepEqual([called.slot,called.id,called.flag],row.init[0].slice(0,3),label);if(called.source==='placed')assert.deepEqual([called.x,called.y],row.init[0].slice(3),label);}}
  else assert.equal(row.init.length,0,label);
  checked+=row.count;
 }
 assert.equal(checked,data.checked);assert.equal(checked,207747);
});
