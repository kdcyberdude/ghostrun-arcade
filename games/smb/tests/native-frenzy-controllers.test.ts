import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFrenzyControllers,retainNativeFrenzyController,seedNativeFrenzyControllers,seedNativePageControllers} from '../src/native-frenzy-controllers.js';

test('native hard-only frenzy records share ROM columns and offsets between the repeated ground areas',()=>{
 assert.deepEqual(nativeFrenzyControllers('1-3','main'),nativeFrenzyControllers('5-3','main'));
 assert.deepEqual(nativeFrenzyControllers('5-3','main').map(c=>[c.id,c.column,c.offset,c.hardOnly]),[[23,288,0,true],[23,1312,14,true]]);
});

test('InitEnemyFrenzy retains a flagged no-run controller only when the timer or a live frenzy Bullet inhibits firing',()=>{
 assert.equal(retainNativeFrenzyController(0,false),false);
 assert.equal(retainNativeFrenzyController(1,false),true);
 assert.equal(retainNativeFrenzyController(0,true),true);
});

test('entrance enemy-data offset consumes transformed controllers and reconstructs retained native slots',()=>{
 const records=nativeFrenzyControllers('5-3','main');
 seedNativeFrenzyControllers(records,16,[{flag:1,id:8,x:275},{flag:0,id:0,x:0},{flag:0,id:0,x:0},{flag:1,id:23,x:1312.5}]);
 assert.equal(records[0].lost,true);assert.equal(records[0].slot,undefined);
 assert.equal(records[1].slot,3);assert.equal(records[1].x,1312.5);
});

test('native WarpZone stream records use the ordinary source offset and slot owner',()=>{
 assert.deepEqual(nativeFrenzyControllers('1-2','area-2').map(c=>[c.id,c.offset,c.column,c.y]),[[52,42,2592,112]]);
});


test('mid-page scene initialization keeps persistent records crossed since the native entrance page right edge',()=>{
 const records=nativeFrenzyControllers('1-2','area-2');
 seedNativePageControllers(records,2457,0);assert.equal(records[0].slot,0);
 const pageBoundary=nativeFrenzyControllers('1-2','area-2');
 seedNativePageControllers(pageBoundary,2304,0);assert.equal(pageBoundary[0].slot,undefined);
 // Actual RAM is authoritative over scene reconstruction, including a stream
 // that has not consumed this record or one whose controller was erased.
 seedNativeFrenzyControllers(records,0,[]);assert.equal(records[0].slot,undefined);assert.equal(records[0].lost,undefined);
 seedNativePageControllers(records,2457,0);seedNativeFrenzyControllers(records,44,[]);assert.equal(records[0].slot,undefined);assert.equal(records[0].lost,true);
});
