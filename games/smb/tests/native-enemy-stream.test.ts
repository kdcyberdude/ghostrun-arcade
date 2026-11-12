import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeEnemyStream} from '../tools/native-enemy-stream.mjs';
import data from '../data/native-stream-swimmers.json';

test('native page-select bit makes shared bridge stream row $0F/$8A an ordinary grey fish',()=>{
 for(const hard of [false,true]){
  const swimmers=nativeEnemyStream(data.streams[0].bytes,hard).filter(o=>o.id===10||o.id===11);
  assert.deepEqual(swimmers,[{id:10,x:2304,y:248,offset:16}]);
 }
});

test('row $0F controls the page when no second-byte page increment has selected it',()=>{
 assert.deepEqual(nativeEnemyStream([15,2,0x48,10,255]),[{id:10,x:576,y:136,offset:2}]);
 assert.deepEqual(nativeEnemyStream([0x48,0x4a,255]),[],'secondary-hard objects are skipped in ordinary mode');
 assert.deepEqual(nativeEnemyStream([0x48,0x4a,255],true),[{id:10,x:64,y:136,offset:0}]);
});
