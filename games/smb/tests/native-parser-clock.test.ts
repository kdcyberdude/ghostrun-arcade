import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeParserClock} from '../src/native-parser-clock.js';
import {nativeParserVramBusy} from '../tools/harness/native-parser-clock-events.js';
import evidence from '../data/native-parser-clock.json';

test('native parser task/scroll bytes match every completed GameEngine pass in all 32 traces',()=>{
 let checked=0;
 for(const event of evidence.events){
  const clock=new NativeParserClock(event.before[0],event.before[1]);
  clock.advance(event.input.scroll,event.input.busy);
  assert.deepEqual([clock.task,clock.scroll],event.after,`${event.example.level} rows ${event.example.frame}..${event.example.lastFrame}`);checked+=event.count;
 }
 assert.equal(Object.keys(evidence.levels).length,32);assert.equal(checked,Object.values(evidence.levels).reduce((a,b)=>a+b,0));
});
test('the 4-3 coin packet delays parser start and leaves the next native red-Koopa birth unblocked',()=>{
 const clock=new NativeParserClock(evidence.windows[0].before[0],evidence.windows[0].before[1]);
 for(const row of evidence.windows){
  if(row.frame===203){assert.equal(clock.blocked,false);assert.deepEqual(row.births,[{slot:3,id:3,x:624}]);}
  if(row.frame===204)assert.equal(clock.blocked,true);
  clock.advance(row.input.scroll,row.input.busy);assert.deepEqual([clock.task,clock.scroll],row.after,`4-3 row ${row.frame}`);
 }
});
test('coin/axe buffer2 packets block the parser; its own graphics/attribute packets do not',()=>{
 let busy=0,parserOutput=0;
 for(const event of evidence.events){
  const ram=new Uint8Array(2048);ram[0x773]=event.example.controller;ram.set(event.example.buffer2,0x341);
  assert.equal(nativeParserVramBusy(ram),event.input.busy);
  if(event.input.busy)busy+=event.count;else if(event.example.controller===6)parserOutput+=event.count;
 }
 assert.ok(busy>0);assert.ok(parserOutput>0);
 // A buffer1 block write does not select buffer2, even if its metatile packet is otherwise identical.
 const ram=new Uint8Array(2048);ram.set([0x20,0x80,2,0x24,0x24,0x20,0xa0,2,0x24,0x24,0],0x301);
 assert.equal(nativeParserVramBusy(ram),false);
});
test('a busy frame accumulates scroll and holds an existing task, including the enemy-loader block',()=>{
 const clock=new NativeParserClock(7,31);assert.equal(clock.blocked,true);
 assert.equal(clock.advance(3,true),undefined);assert.deepEqual([clock.task,clock.scroll],[7,34]);assert.equal(clock.blocked,true);
 assert.equal(clock.advance(0,false),6);assert.deepEqual([clock.task,clock.scroll],[6,34]);assert.equal(clock.blocked,false);
});
test('parser tasks follow the native jump-table order and consume a 32-pixel scroll unit only at startup',()=>{
 const clock=new NativeParserClock(0,31);assert.equal(clock.blocked,false);const tasks=[];
 for(let frame=0;frame<8;frame++)tasks.push(clock.advance(frame===0?1:0,false));
 assert.deepEqual(tasks,[7,6,5,4,3,2,1,0]);assert.deepEqual([clock.task,clock.scroll],[0,0]);
 assert.equal(clock.advance(0,false),undefined);
});
test('the byte accumulator and CMP/BMI sign check retain native edge behavior',()=>{
 const wrap=new NativeParserClock(0,255);assert.equal(wrap.advance(3,false),undefined);assert.equal(wrap.scroll,2);
 const positive=new NativeParserClock(0,159);assert.equal(positive.advance(0,false),7);assert.equal(positive.scroll,127);
 const negative=new NativeParserClock(0,160);assert.equal(negative.advance(0,false),undefined);assert.deepEqual([negative.task,negative.scroll],[0,160]);
});
test('the native 5-2 parser pass spanning two PPU samples stays explicit rather than becoming a fitted frame exception',()=>{
 assert.equal(evidence.partialPasses.length,1);const partial=evidence.partialPasses[0];
 assert.equal(partial.level,'5-2');assert.deepEqual(partial.samples.map(s=>[s.frame,s.counter,s.task,s.scroll,s.cam,s.x]),[[2178,161,8,2,1922,2034],[2179,161,7,2,1922,2034]]);
 const clock=new NativeParserClock(partial.before[0],partial.before[1]);clock.advance(partial.input.scroll,partial.input.busy);
 assert.deepEqual([clock.task,clock.scroll],partial.after);assert.equal(clock.task,partial.samples.at(-1)!.task);
 const passes=evidence.events.reduce((sum,e)=>sum+e.count,0),ppu=evidence.events.reduce((sum,e)=>sum+e.ppuFrames,0);
 assert.equal(ppu-passes,evidence.partialPasses.reduce((sum,e)=>sum+e.samples.length-1,0));
});
