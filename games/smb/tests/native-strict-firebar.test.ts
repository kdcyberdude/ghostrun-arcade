import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {gunzipSync} from 'node:zlib';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage,type StrictEntity} from '../tools/harness/native-strict-entities.js';import {FirebarSlots} from '../src/firebar-slots.js';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-strict-firebar-events.json';
const samples=JSON.parse(gunzipSync(Buffer.from(fixture.gzipBase64,'base64')).toString()) as {level:string;frame:number;ram:string;actors:{slot:number;kind:string;x:number;y:number;state?:number;owner?:number;firebar?:{id:number;high:number;low:number;speed:number;direction:number}}[]}[];
const isFirebar=(n:StrictEntity)=>n.kind==='firebar'||n.kind==='firebar-alias';
test('genuine RAM/OAM samples from every original castle expose raw pivots, phase bytes and alias ownership',()=>{
 assert.equal(samples.length,fixture.samples);assert.ok(samples.length>700);assert.deepEqual(fixture.levels.map(l=>l.level),['1-4','2-4','3-4','4-4','5-4','6-4','7-4','8-4']);
 for(const event of samples){const r=new Uint8Array(Buffer.from(event.ram,'base64')),actual=strictNativeEntities(r).entities.filter(isFirebar).map(({bank,source,...n})=>n);assert.equal(r.length,2048);assert.deepEqual(actual,event.actors,`${event.level} row${event.frame}`);}
 for(const p of fixture.pivots){const sample=p.quad;assert.equal(sample[0],p.y);assert.equal(sample[3],p.x-p.camera);assert.ok([0x64,0x65].includes(sample[1]));assert.deepEqual({x:sample[3]+p.camera+4,y:sample[0]+5},{x:p.x+4,y:p.y+5},'native sprite quad centers use raw anchor+4/+5');}
 assert.equal(fixture.pivots.length,6);assert.ok(fixture.levels.filter(l=>l.level==='7-4'||l.level==='8-4').every(l=>l.procCalls===0&&l.activeFrames===0),'unvisited firebar scenes are explicitly zero-active examples');
});

test('strict readout preserves raw A0 and vertical pages instead of masking spin bytes or picture offsets',()=>{
 const r=new Uint8Array(2048);r[15+2]=1;r[22+2]=29;r[110+2]=3;r[135+2]=20;r[182+2]=2;r[207+2]=10;r[160+2]=255;r[88+2]=248;r[0x388+2]=40;r[0x34+2]=16;
 const n=strictNativeEntities(r,-256).entities[0];assert.deepEqual([n.x,n.y,n.firebar],[532,266,{id:29,high:255,low:248,speed:40,direction:16}]);
 r[22+2]=32;assert.ok(strictNativeEntities(r).gaps.some(g=>g.code==='unverified-native-firebar-id'));r[22+2]=35;assert.ok(strictNativeEntities(r).gaps.some(g=>g.code==='unsupported-native-object'));
});

test('phase, identity and alias ownership mismatches remain failures despite equal pivot positions',()=>{
 const bar={x:376,y:120,length:12,speed:0.03},slots=new FirebarSlots([bar]);slots.managed=true;slots.busy=s=>s<2;slots.initializeNative(bar,2,{id:31,high:7,low:88,speed:40,direction:0});
 const sim={enemies:[],items:[],area:{firebars:[bar]},firebarSlots:slots},actors=strictSimEntities(sim),native={entities:actors,live:2,reserved:new Set(['enemy:2','enemy:3']),gaps:[]};
 assert.equal(strictEntityDifferences(native,actors).mismatches.length,0);
 for(const key of ['id','high','low','speed','direction'] as const){const changed=structuredClone(actors);changed.find(n=>n.kind==='firebar')!.firebar![key]++;assert.ok(strictEntityDifferences(native,changed).mismatches.some(m=>m.code===`firebar.${key}`),key);}
 const changed=structuredClone(actors);changed.find(n=>n.kind==='firebar-alias')!.owner=1;assert.ok(strictEntityDifferences(native,changed).mismatches.some(m=>m.code==='alias.owner'));
 assert.ok(strictEntityDifferences(native,[]).mismatches.every(m=>m.code==='missing'));assert.equal(strictEntityDifferences({entities:[],live:0,reserved:new Set(),gaps:[]},actors).mismatches.length,2);
 const snapshot=JSON.stringify(slots);for(let n=0;n<8;n++)strictSimEntities(sim);assert.equal(JSON.stringify(slots),snapshot);
 assert.equal(strictSimCoverage(sim).length,0);assert.ok(strictSimCoverage({...sim,firebarSlots:undefined}).some(g=>g.detail.includes('firebar')));
 const noPhase=structuredClone(actors);delete noPhase[0].firebar;assert.ok(strictEntityDifferences(native,noPhase).gaps.some(g=>g.code==='unsupported-sim-firebar-phase'));
});

test('actual castle prefixes compare pivots and phase while exposing the retained partial-clear speed gap',()=>{
 const buttons=['a','b','select','start','up','down','left','right'] as const;
 for(const [level,through]of [['1-4',541],['2-4',670],['5-4',804]] as const){
  const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),pads=unpack(run.pads),initial=unpack(run.initialRam);
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{level}));sim.step([],0);sim.inputs=[];
  // The legacy excerpt omits phase/OAM addresses. Genuine complete rows are
  // retained above; closed runtime phase coverage also lives in native-firebar.test.
  for(let frame=0;frame<=through;frame++){
   sim.step(buttons.filter((_,b)=>pads[frame]&(1<<b)),1);
   const sample=samples.find(e=>e.level===level&&e.frame===frame);if(!sample)continue;
   const r=new Uint8Array(Buffer.from(sample.ram,'base64')),native=strictNativeEntities(r);native.entities=native.entities.filter(isFirebar);
   const differences=strictEntityDifferences(native,strictSimEntities(sim).filter(isFirebar));
   for(const mismatch of differences.mismatches){
    // The new audit deliberately exposes this existing InitializeArea gap;
    // its failure remains in the all-frame strict report until runtime owns it.
    assert.equal(mismatch.code,'firebar.speed',`${level} row${frame}`);assert.equal(mismatch.native?.firebar?.speed,0);assert.equal(r[0x772],0);assert.equal(r[0x73c],0);
   }
  }
 }
});
