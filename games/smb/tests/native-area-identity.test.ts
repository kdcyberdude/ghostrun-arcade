import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import catalog from '../data/native-area-catalog.json';
import {nativeWorldStages,nativeAreaBindings,nativeAreaLoads,selectNativeAreaBinding} from '../tools/harness/native-area-identity.js';

const level=(id:string)=>observedLevels().find(l=>l.id===id)!;
const physical=(code:number)=>(catalog.areas as Record<number,{data:number}>)[code];
function rows(id:string,frames:{code?:number,ptr?:number,task:number,page:number,destination?:number,entrance?:number,x?:number}[]){
 const [world,stage]=id.split('-').map(Number),ram=new Uint8Array(frames.length*2048);
 frames.forEach((f,index)=>{const r=ram.subarray(index*2048,(index+1)*2048),ptr=f.ptr??physical(f.code!).data;
  r[0x770]=1;r[0x75f]=world-1;r[0x75c]=stage-1;r[0x772]=f.task;r[0x71a]=f.page;r[0xe7]=ptr&255;r[0xe8]=ptr>>8;
  r[0x750]=f.destination??f.code??0;r[0x751]=f.entrance??f.page;r[0x86]=f.x??40;
 });return ram;
}
test('native ROM catalog identifies all 34 physical areas and four stages in every world',()=>{
 assert.equal(Object.keys(catalog.areas).length,34);
 for(let world=0;world<8;world++)assert.equal(nativeWorldStages(world).length,4);
 assert.deepEqual(nativeWorldStages(0),[[0x25],[0x29,0x40],[0x26],[0x60]]);
 assert.equal(catalog.source.sha256,'f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de');
});
test('unmapped native worlds return no route and synthetic levels report the missing binding',()=>{
 for(const world of [NaN,-1,8])assert.deepEqual(nativeWorldStages(world),[]);
 for(const id of ['water','fixture','9-1'])assert.deepEqual(nativeAreaBindings({...level('1-1'),id}),{bindings:[],diagnostics:['level has no native world-route entry']});
});
test('all static remake scenes bind to native world routes or ROM portal destinations',()=>{
 for(const l of observedLevels()){
  const result=nativeAreaBindings(l);assert.deepEqual(result.diagnostics,[],l.id);
  assert.equal(new Set(result.bindings.map(b=>b.area)).size,l.areas.length,l.id);
  assert.ok(result.bindings.every(b=>b.offset%256===0),l.id);
 }
});
test('native exit rooms retain their native page while the remake scene starts at zero',()=>{
 const bindings=nativeAreaBindings(level('1-2')).bindings,exit=bindings.find(b=>b.area==='area-3')!;
 assert.deepEqual([exit.code,exit.entryPage,exit.offset],[0x25,11,-2816]);
 const bonus=bindings.find(b=>b.area==='bonus-coins')!;assert.deepEqual([bonus.code,bonus.entryPage,bonus.offset],[0x42,2,-512]);
});
test('8-4 uses one castle stream at native entry pages 0,7,12,16 and a separate water stream',()=>{
 assert.deepEqual(nativeAreaBindings(level('8-4')).bindings.map(b=>[b.area,b.code,b.entryPage,b.offset]),[
  ['main',0x65,0,0],['area-2',0x65,7,-1792],['area-3',0x65,12,-3072],['area-4',0x02,0,0],['area-5',0x65,16,-4096],
 ]);
});
test('look-ahead AreaPointer/EntrancePage cannot relabel the currently loaded stream',()=>{
 const ram=rows('1-2',[
  {code:0x29,task:3,page:0},{code:0x29,task:0,page:0,destination:0xc0},
  {code:0x40,task:1,page:0,destination:0xc0},{code:0x40,task:3,page:0,destination:0xc2,entrance:2,x:240},
 ]);
 const loads=nativeAreaLoads(level('1-2'),ram).loads;
 assert.deepEqual(loads.map(l=>[l.frame,l.area,l.offset]),[[0,'main',0],[2,'area-2',0]]);
});
test('same-pointer pipe loads are recognized by InitializeArea mode task and native start page',()=>{
 const ram=rows('8-4',[
  {code:0x65,task:3,page:0},{code:0x65,task:0,page:0,destination:0xe5,entrance:7},
  {code:0x65,task:1,page:7,destination:0xe5,entrance:7},{code:0x65,task:2,page:7},{code:0x65,task:3,page:7,destination:2,entrance:0},
 ]);
 assert.deepEqual(nativeAreaLoads(level('8-4'),ram).loads.map(l=>[l.frame,l.area,l.offset]),[[0,'main',0],[2,'area-2',-1792]]);
});
test('a native water checkpoint uses the loaded water stream even when the saved EntrancePage targets a ground exit',()=>{
 const ram=rows('7-2',[{code:0x29,task:3,page:0},{code:1,task:1,page:5,destination:1,entrance:11}]);
 assert.equal(nativeAreaLoads(level('7-2'),ram).loads[1].area,'area-4');
});
test('unknown loaded pointers and duplicate static scene bindings remain explicit',()=>{
 const loads=nativeAreaLoads(level('1-1'),rows('1-1',[{ptr:0x8123,task:3,page:0}])).loads;
 assert.equal(loads[0].area,undefined);assert.ok(loads[0].diagnostic?.includes('not in native ROM'));
 const l=level('1-1'),b=nativeAreaBindings(l).bindings[0];l.areas.push({...l.areas[0],id:'duplicate'});
 assert.equal(selectNativeAreaBinding(l,[b,{...b,area:'duplicate'}],b.data,0).length,2);
});
