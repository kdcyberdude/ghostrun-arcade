import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/native-star-clock.json';
import {nativeIntervalStep,nativeStarMusic,NATIVE_STAR_PICKUP} from '../src/native-interval.js';

test('native Star collision initializes $079F to $23 without a timer freeze',()=>{
 assert.equal(data.pickup[0][2],0);assert.equal(data.pickup[1][2],NATIVE_STAR_PICKUP);assert.equal(data.pickup[1][0],0);
});
test('all native NMI pause/master-control/interval/Star boundary transitions match',()=>{
 assert.equal(data.transitions.length,1008);
 for(const [b,a] of data.transitions){
  const n=nativeIntervalStep(b[1],b[2],b[0],Boolean(b[4]&1));
  assert.deepEqual([n.control,n.interval,n.star],[a[0],a[1],a[2]],JSON.stringify(b));
  assert.equal(a[3],b[4]&1?b[3]:(b[3]+1)&255,'$09 freezes only for pause');
 }
});
test('native Star lifecycle and music restore match every row, including the interval phase at pickup',()=>{
 const rows=data.lifecycle;assert.equal(rows.findIndex(r=>r[2]===0),725);
 for(let f=1;f<rows.length;f++){
  const b=rows[f-1],a=rows[f],n=nativeIntervalStep(b[1],b[2],b[0],Boolean(b[4]&1));
  assert.deepEqual([n.control,n.interval,n.star],a.slice(0,3),`row ${f}`);
  assert.equal(nativeStarMusic(a[2],a[1]),a[5]===1,`area music row ${f}`);
 }
 assert.equal(nativeStarMusic(4,0,2),false,'GameEngine skips music when below screen');
});
