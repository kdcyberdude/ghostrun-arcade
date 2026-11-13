import {test} from 'node:test';import assert from 'node:assert/strict';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage} from '../tools/harness/native-strict-entities.js';
import {advanceNativeSpring} from '../src/native-spring.js';
import fixture from './fixtures/native-strict-springs.json';import motion from './fixtures/native-spring-events.json';
test('strict spring readout retains native slots, fixed anchors, every compression and erasure row',()=>{
 assert.equal(fixture.events.length,3777);let live=0,erased=0;const poses=new Set<number>();
 for(const event of fixture.events){
  const [level,frame,slot,flag,id,xLow,xPage,yLow,yPage,state,fixedY]=event as [string,number,number,number,number,number,number,number,number,number,number],r=new Uint8Array(2048);
  for(const [address,value]of [[15,flag],[22,id],[135,xLow],[110,xPage],[207,yLow],[182,yPage],[30,state],[88,fixedY]])r[address+slot]=value;
  const spring={x:xPage*256+xLow-256,y:fixedY+24,nativeColumn:xPage*256+xLow-256,nativeOffset:0},active=flag&&id===50,compression=active?(yLow-fixedY)/8:0;
  const sim={enemies:[],items:[],area:{springs:[spring]},springSlots:new Map(active?[[spring,slot]]:[]),springCompression:()=>compression},native=strictNativeEntities(r,-256);
  assert.deepEqual(strictEntityDifferences(native,strictSimEntities(sim)),{mismatches:[],gaps:[]},`${level} row${frame}`);assert.deepEqual(strictSimCoverage(sim),[]);
  if(active){live++;poses.add(compression);assert.equal(yPage,1);assert.equal(native.entities[0].source,'spring');}else erased++;
 }
 assert.equal(live,3766);assert.equal(erased,11);assert.deepEqual([...poses].sort(),[0,1,2]);
});
test('the source spring motor provides the independent compression input used by the readout',()=>{
 for(const event of motion){const n={...event.before};advanceNativeSpring(n,event.edgeA,!event.born);
  const spring={x:400,y:200},sim={enemies:[],items:[],springSlots:new Map([[spring,event.slot]]),springCompression:()=>n.control===0?0:n.compression};
  const actor=strictSimEntities(sim)[0];assert.equal(actor.y,176+event.after.compression*8,`${event.level} row${event.frame}`);
 }
});
test('spring position, slot and lifetime mismatches remain failures; unowned retained Enemy_State is not invented',()=>{
 const r=new Uint8Array(2048);r[15+5]=1;r[22+5]=50;r[135+5]=144;r[110+5]=1;r[207+5]=192;r[182+5]=1;r[30+5]=7;
 const spring={x:400,y:200},sim={enemies:[],items:[],springSlots:new Map([[spring,5]]),springCompression:()=>2},actor=strictSimEntities(sim)[0],native=strictNativeEntities(r);
 assert.equal(actor.state,undefined,'terrain Jumpspring does not initialize or consume Enemy_State');assert.deepEqual(strictEntityDifferences(native,[actor]).mismatches,[]);
 assert.equal(strictEntityDifferences(native,[{...actor,y:191}]).mismatches[0].code,'position');assert.deepEqual(strictEntityDifferences(native,[{...actor,slot:4}]).mismatches.map(m=>m.code),['missing','extra']);
 assert.equal(strictEntityDifferences(strictNativeEntities(new Uint8Array(2048)),[actor]).mismatches[0].code,'extra');
 assert.ok(strictSimCoverage({area:{springs:[spring]},items:[]}).some(g=>g.detail.startsWith('spring')),'missing parser/slot/compression ownership is explicit');
 assert.deepEqual(strictSimEntities({enemies:[],items:[],springSlots:new Map([[spring,0]])}),[],'missing compression readout cannot be silently replaced with idle');
});
