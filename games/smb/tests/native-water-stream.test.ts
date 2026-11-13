import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeWaterStream} from '../src/native-water-stream.js';
import streams from '../data/native-water-streams.json';
import events from './fixtures/native-water-stream-events.json';

test('water enemy cursor matches every native free-slot parser pass including hard-only barriers',()=>{
 let checked=0;
 for(const [name,row,before,flags,task,queue,camera,hard,after,count] of events as [string,number,number[],number[],number,number,number,boolean,number[],number][]){
  const stream=new NativeWaterStream(streams.streams[0].bytes,before[0],before[1],Boolean(before[2]));let pending=queue;
  if((task&7)!==7)for(let slot=0;slot<6;slot++){if(flags[slot])continue;if(pending){pending=0;continue;}stream.next(camera,hard,slot);}
  assert.deepEqual([stream.offset,stream.page,Number(stream.selected)],after,`${name} row${row}`);checked+=count;
 }
 assert.equal(checked,530698);
});
