import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeVisitOffset} from '../tools/harness/native-visit.js';

const row=(x:number,y:number,engine=7)=>({x,y,engine});
test('native main-area pipe returns keep level coordinates',()=>{
 // Unmodified native excerpts: explore-r7/6-2/mood2 rows500-501 and /8-1/mood3 rows1262-1263.
 for(const x of [568,1848]){
  assert.equal(nativeVisitOffset(row(x,240),row(x,239),[x]),0);
  // campaign-compare unwraps the first y byte before normalizing x.
  assert.equal(nativeVisitOffset(row(x,-16),row(x,-17),[x]),0);
 }
});
test('other area loads still subtract their native page',()=>{
 // 6-2 bonus entry rows277-278: a held entry-fall row, not the rising main return.
 assert.equal(nativeVisitOffset(row(2072,32),row(2072,32),[568]),2048);
 assert.equal(nativeVisitOffset(row(568,240),row(568,239),[]),512);
 assert.equal(nativeVisitOffset(row(568,32),row(568,32),[568]),512);
 assert.equal(nativeVisitOffset(row(1576,176),row(1576,176,8),[],true),0);
});
