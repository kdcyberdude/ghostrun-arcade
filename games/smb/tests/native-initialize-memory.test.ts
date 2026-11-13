import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {stepNativeInitializeMemory,type NativeMemoryInitCpu} from '../src/native-initialize-memory.js';import fixture from './fixtures/native-initialize-memory.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('InitializeMemory reproduces every native instruction, write and stack return',()=>{
 assert.equal(fixture.cases.length,24);let instructions=0;
 for(const c of fixture.cases){const ram=unpack(c.ramBefore),s:NativeMemoryInitCpu={...c.before,ram,cycles:0},trace=JSON.parse(Buffer.from(unpack(c.trace)).toString()) as number[][];
  for(let i=0;i<trace.length;i++){const r=stepNativeInitializeMemory(s);assert.deepEqual([r.pc,s.pc,r.cycles,s.a,s.x,s.y,s.p,s.sp,r.write?.[0]??-1,r.write?.[1]??-1],trace[i],`${c.kind} Y${c.before.y} pattern${c.pattern} instruction${i}`);assert.equal(r.done,i===trace.length-1);instructions++;}
  assert.equal(s.cycles,c.cycles);assert.deepEqual(s.ram,unpack(c.ramAfter));assert.deepEqual({pc:s.pc,a:s.a,x:s.x,y:s.y,p:s.p,sp:s.sp},c.after);
 }
 assert.equal(instructions,fixture.instructions);
});
test('source loop costs include conditional stack skips and callerJSR separately',()=>{
 const genuine=fixture.cases.filter(c=>c.kind==='genuine');assert.deepEqual(genuine.map(c=>c.before.y),[254,111,75]);assert.equal(genuine[1].cycles+6,34314);assert.equal(genuine[2].cycles+6,33666);
});
test('a partial InitializeMemory call does not apply future page writes',()=>{
 const c=fixture.cases.find(c=>c.kind==='controlled'&&c.before.y===111&&c.pattern===0)!,ram=unpack(c.ramBefore),s:NativeMemoryInitCpu={...c.before,ram,cycles:0};let r;
 do{r=stepNativeInitializeMemory(s);}while(r.write?.[0]!==0x76f);
 assert.equal(s.ram[0x76f],0);assert.equal(s.ram[0x76e],255);assert.equal(s.ram[0x770],255);
 while(!r.done)r=stepNativeInitializeMemory(s);
 assert.ok(s.ram.subarray(0x160,0x200).every(v=>v===255),'native stack-protected bytes survive');
});
