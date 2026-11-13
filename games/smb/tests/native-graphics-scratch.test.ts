import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {NativeGraphicsScratch} from '../src/native-graphics-scratch.js';import fixture from './fixtures/native-graphics-scratch.json';
const payload=gunzipSync(Buffer.from(fixture.gzipBase64,'base64')),events=JSON.parse(payload.toString()) as {handler?:string;sequence:number[];index:number;slot:number;before:string;after:string}[];
test('actual ordered native EnemyGfxHandler calls author or preserve sharedEF',()=>{
 assert.equal(createHash('sha256').update(payload).digest('hex'),fixture.sha256);assert.equal(events.length,360);assert.equal(events.length,fixture.samples);let preserved=0,written=0;
 const n=new NativeGraphicsScratch();let previous:Uint8Array|undefined,lastIndex=99;
 for(const e of events.filter(e=>e.handler!=='firebar')){const before=new Uint8Array(Buffer.from(e.before,'base64')),after=new Uint8Array(Buffer.from(e.after,'base64')),slot=e.slot;
  if(e.index<=lastIndex)n.seed(before[0xef]);else if(previous)assert.equal(n.value,before[0xef],'ordered scratch carries between actual CPU calls');
  n.enemy(before[0x16+slot],{piranhaSpeed:(before[0x58+slot]<<24)>>24,frameTimer:before[0x78a+slot],springControl:before[0x70e],bowser:before[0x36a]});
  assert.equal(n.value,after[0xef],`id${before[0x16+slot]} sequence${e.sequence} index${e.index}`);
  if(before[0x16+slot]===13&&(before[0x58+slot]&128)===0&&before[0x78a+slot]){assert.equal(after[0xef],before[0xef]);preserved++;}else written++;
  previous=after;lastIndex=e.index;
 }
 assert.ok(preserved>0&&written>0);
});
test('unreconstructed writers remain unknown until a source writer or memory clear runs',()=>{
 const n=new NativeGraphicsScratch();n.unknown();n.enemy(13,{piranhaSpeed:1,frameTimer:7});assert.equal(n.value,undefined);n.enemy(6);assert.equal(n.value,6);n.firebar(31,8);assert.equal(n.value,6);n.firebar(31,0);assert.equal(n.value,31);n.clear();assert.equal(n.value,0);
});

test('naturally visited vine prefix observes orderedEF across Goomba and Piranha handlers',async()=>{
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js'),{decodeEntrance,initializeEntrance}=await import('../tools/harness/native-entrance.mjs');
 const visit=(await import('./fixtures/native-vine-natural-visit.json',{with:{type:'json'}})).default,unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),initial=unpack(visit.initialRam),rows=unpack(visit.ram),pads=unpack(visit.pads),sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,visit.receipt));sim.step([],0);sim.inputs=[];const buttons=['a','b','select','start','up','down','left','right'];
 const unresolved:number[]=[];
 for(let f=0;f<pads.length;f++){sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);if(sim.graphicsScratch.value===undefined)unresolved.push(f);else assert.equal(sim.graphicsScratch.value,rows[f*2048+0xef],`native row${f} retainedEF`);}
 assert.deepEqual(unresolved,[220,451,695],'three late group picture reconstructions remain explicit unknowns, never successful EF comparisons');
 assert.equal(pads.length,774);
});

test('actual native ProcFirebar writes the corrected spin high and preservesEF when offscreen',()=>{
 let writes=0,holds=0;for(const e of events.filter(e=>e.handler==='firebar')){const before=new Uint8Array(Buffer.from(e.before,'base64')),after=new Uint8Array(Buffer.from(e.after,'base64')),n=new NativeGraphicsScratch();n.seed(before[0xef]);n.firebar(after[0xa0+e.slot],after[0x3d1]);assert.equal(n.value,after[0xef]);if(after[0x3d1]&8)holds++;else writes++;}assert.equal(writes,16);assert.equal(holds,16);
});
