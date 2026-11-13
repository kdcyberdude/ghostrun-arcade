import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-load-pole-cases.json';import controls from '../data/native-area-controls.json';import {nativeAreaBindings} from '../src/native-area-catalog.js';import {NativeAreaControls} from '../src/native-area-controls.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const c of fixture.cases)test(`${c.level}/${c.area}: initial rendering creates the native pole in slot5 on its exact parser-column row`,()=>{
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(hash(initial),c.initialSha256);assert.equal(hash(pads),c.padsSha256);assert.equal(hash(ram),c.ramSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level:c.level},c.binding));sim.step([],0);sim.inputs=[];let births=0,previous=initial[0x14],previousScreen=initial[0x73c];
 for(let f=0;f<pads.length;f++){
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048),s=sim.specialSlot5;
  assert.equal(s.flag,r[0x14],`source${c.sourceFrameOffset+f} flag`);if(r[0x14]){assert.equal(r[0x1b],48);assert.deepEqual([s.id,s.x,s.y,sim.flagNumber.y],[48,r[0x73]*256+r[0x8c]+c.binding.offset,r[0xd4],r[0x10d]],`source${c.sourceFrameOffset+f}`);}
  assert.equal(sim.parserColumnX,r[0x725]*256+r[0x726]*16+c.binding.offset,`source${c.sourceFrameOffset+f} column`);
  if(!previous&&r[0x14]){births++;assert.equal(previousScreen,8,'birth belongs to RenderingAreaGraphics');assert.equal(r[14],0,'first gameplay routine has not run');}previous=r[0x14];previousScreen=r[0x73c];
 }
 assert.equal(births,1);
});

test('every static native scene binding supplies its parser stream and whole-page origin, including unvisited rooms',()=>{
 let count=0;for(const level of observedLevels())for(const binding of nativeAreaBindings(level).bindings){const actual=(controls.bindings as Record<string,{stream:string;origin:number}>)[`${level.id}/${binding.area}`];assert.deepEqual(actual,{stream:binding.data.toString(16),origin:binding.offset===0?0:-binding.offset/16});
  const parser=new NativeAreaControls(level.id,binding.area);parser.seedNative(binding.entryPage*16,false);assert.equal(parser.column*16,binding.entryPage*256+binding.offset,`${level.id}/${binding.area}`);count++;
 }assert.ok(count>60);
});
