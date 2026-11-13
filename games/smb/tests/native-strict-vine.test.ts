import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {NativeSpecialSlot} from '../src/native-special-slot.js';
import {nativeVineControl,simVineControl} from '../tools/harness/native-strict-vines.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage} from '../tools/harness/native-strict-entities.js';
import fixture from './fixtures/native-strict-vines.json';
const bytes=gunzipSync(Buffer.from(fixture.gzipBase64,'base64')),samples=JSON.parse(bytes.toString()) as {case:string;row:number;phase:string;ram:string;actors:{slot:number;x:number;y:number;state:number}[];control:ReturnType<typeof nativeVineControl>}[];
const model=(n=new NativeSpecialSlot())=>({enemies:[],items:[],area:{vines:[{}]},vines:[],specialSlot5:n});
test('controlled native vine captures retain primary/secondary enemy slots and actual raw anchors',()=>{
 assert.equal(createHash('sha256').update(bytes).digest('hex'),fixture.sha256);assert.equal(samples.length,128);assert.equal(samples.length,fixture.samples);
 let active=0,inactive=0,secondary=0;
 for(const s of samples){const r=new Uint8Array(Buffer.from(s.ram,'base64')),n=strictNativeEntities(r),actors=n.entities.filter(e=>e.kind==='vine');assert.deepEqual(actors.map(({slot,x,y,state})=>({slot,x,y,state})),s.actors);assert.deepEqual(nativeVineControl(r),s.control);assert.ok(!n.gaps.some(g=>g.id===47));
  if(actors.length)active++;else inactive++;
  for(const a of actors)if(a.slot!==5){secondary++;assert.equal(a.y,-256,'retained Y-high0 is raw RAM, never slot5 draw Y+48');}
 }
 assert.ok(active>0&&inactive>0&&secondary>0);
});
test('primary vine readout compares raw full-page anchor and controller bytes without mutating state',()=>{
 for(const s of samples){const r=new Uint8Array(Buffer.from(s.ram,'base64')),primary=s.actors.find(e=>e.slot===5);if(!primary)continue;
  const n=new NativeSpecialSlot();Object.assign(n,{flag:r[0x14],id:47,x:primary.x,y:r[0xd4],yHigh:r[0xbb],vineCount:s.control.count,vineHeight:s.control.height,vineStartY:s.control.startY,vineSlots:s.control.slots});
  const sim=model(n),before=JSON.stringify(n),actors=strictSimEntities(sim),native=strictNativeEntities(r);native.entities=native.entities.filter(e=>e.kind==='vine'&&e.slot===5);
  assert.deepEqual(strictEntityDifferences(native,actors).mismatches,[]);assert.equal(JSON.stringify(n),before);
  assert.deepEqual(simVineControl(n),s.control);assert.ok(strictSimCoverage(sim).some(g=>g.code==='unsupported-sim-vine-state'));
  for(const key of ['count','height','startY','slots'] as const){const wrong=structuredClone(actors);if(key==='slots')wrong[0].vine!.slots=[4];else wrong[0].vine![key]++;assert.ok(strictEntityDifferences(native,wrong).mismatches.some(m=>m.code===`vine.${key}`));}
  const wrong=structuredClone(actors);wrong[0].y++;assert.ok(strictEntityDifferences(native,wrong).mismatches.some(m=>m.code==='position'));
 }
});
test('inactive declarations need no fictional actor; unsupported active secondary state stays explicit',()=>{
 const sim=model();assert.deepEqual(strictSimEntities(sim),[]);assert.deepEqual(strictSimCoverage(sim),[]);
 sim.specialSlot5.yHigh=1;sim.specialSlot5.claimVine(128,144);sim.specialSlot5.addVineSegment(0);
 assert.deepEqual(strictSimCoverage(sim).map(g=>g.code),['unsupported-sim-vine-state','unsupported-sim-vine-segment']);
 const native=strictNativeEntities(new Uint8Array(Buffer.from(samples.find(s=>s.actors.length===2)!.ram,'base64')));
 assert.ok(strictEntityDifferences(native,strictSimEntities(sim)).mismatches.some(m=>m.code==='missing'&&m.native?.slot===0));
 sim.specialSlot5.claimPowerup(160,120);assert.equal(strictSimEntities(sim).some(e=>e.kind==='vine'),false,'slot5 replacement is not a vine');
 const visible={...model(),vines:[{height:8,growing:true}]};assert.equal(strictSimCoverage(visible)[0].code,'unsupported-sim-vine-activation');
 assert.equal(strictSimCoverage({area:{vines:[{}]},items:[]})[0].code,'unsupported-sim-object-family');
});
