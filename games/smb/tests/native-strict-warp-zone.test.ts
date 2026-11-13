import {test} from 'node:test';import assert from 'node:assert/strict';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';
import fixture from './fixtures/native-strict-warp-zone.json';
test('strict ID52 readout compares source slot, raw coordinates and zero state through native birth and erasure',()=>{
 assert.equal(fixture.events.length,135);assert.deepEqual(fixture.sources.map(s=>s.level),['1-2','4-2']);let live=0,erased=0;
 for(const event of fixture.events){
  const [level,frame,slot,flag,id,xLow,xPage,yLow,yPage,state]=event as [string,number,number,number,number,number,number,number,number,number],r=new Uint8Array(2048);
  for(const [address,value]of [[15,flag],[22,id],[135,xLow],[110,xPage],[207,yLow],[182,yPage],[30,state]])r[address+slot]=value;
  const native=strictNativeEntities(r,-256),sim={enemies:[],items:[],frenzyControllers:flag&&id===52?[{id:52,slot,x:xPage*256+xLow-256,y:yLow,column:0}]:[]},actors=strictSimEntities(sim);
  assert.equal(native.gaps.length,0,`${level} row${frame}`);assert.deepEqual(strictEntityDifferences(native,actors),{mismatches:[],gaps:[]},`${level} row${frame}`);
  if(flag&&id===52){live++;assert.equal(yPage,1,'source birth initializes YHigh');assert.equal(state,0,'NoInitCode controller never changes initialized state');assert.equal(native.entities[0].source,'controller');}
  else{erased++;assert.equal(actors.length,0);}
 }
 assert.equal(erased,2);assert.equal(live,133);
});
test('wrong warp controller position, slot, state or lifetime cannot pass strict comparison',()=>{
 const r=new Uint8Array(2048);r[15+2]=1;r[22+2]=52;r[110+2]=10;r[135+2]=32;r[207+2]=112;r[182+2]=1;
 const sim={enemies:[],items:[],frenzyControllers:[{id:52,slot:2,column:2592,y:112}]},native=strictNativeEntities(r),actor=strictSimEntities(sim)[0];
 assert.deepEqual(strictEntityDifferences(native,[actor]).mismatches,[]);
 for(const patch of [{x:2593},{y:111},{state:1}])assert.ok(strictEntityDifferences(native,[{...actor,...patch}]).mismatches.length);
 assert.deepEqual(strictEntityDifferences(native,[{...actor,slot:1}]).mismatches.map(m=>m.code),['missing','extra']);
 assert.equal(strictEntityDifferences(strictNativeEntities(new Uint8Array(2048)),[actor]).mismatches[0].code,'extra');
 assert.deepEqual(strictSimEntities({...sim,frenzyControllers:[{id:52,column:2592,y:112}]}),[],'unborn source record is not a live slot');
 assert.deepEqual(strictSimEntities({...sim,frenzyControllers:[{...sim.frenzyControllers[0],lost:true}]}),[],'released controller no longer occupies its slot');
 r[22+2]=23;assert.ok(strictNativeEntities(r).gaps.some(g=>g.code==='unsupported-native-object'),'other controller IDs remain explicit unsupported');
});
