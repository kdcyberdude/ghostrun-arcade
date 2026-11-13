import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import fixture from './fixtures/native-flag-runtime.json';import approach from './fixtures/native-flag-five-one-approach.json';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {compareRun} from '../tools/harness/native-divergence.js';import {auditFlagBuffers} from '../tools/harness/native-flag-audit.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('continuous source flag control matches10 native entrances through the actual next-level dispatch',()=>{
 assert.equal(fixture.cases.length,11);let rows=0;
 for(const c of fixture.cases.filter(c=>c.level!=='5-1')){const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(sha(initial),c.initialSha256);assert.equal(sha(pads),c.padSha256);assert.equal(sha(ram),c.ramSha256);assert.equal(pads.length,c.frames);
  const audit=auditFlagBuffers(initial,pads,ram,c.receipt,c.level);assert.equal(audit.status,'pass',JSON.stringify(audit));assert.ok(audit.rows>0);rows+=audit.rows;
 }
 assert.equal(rows,6697);
});
test('5-1 full entrance replay remains explicit when flag state follows an earlier native motion divergence',()=>{
 const c=fixture.cases.find(c=>c.level==='5-1')!,initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram),audit=auditFlagBuffers(initial,pads,ram,c.receipt,c.level);
 assert.equal(sha(initial),c.initialSha256);assert.equal(sha(pads),c.padSha256);assert.equal(sha(ram),c.ramSha256);assert.equal(audit.rows,632);
 if(audit.status==='pass')return;
 const legacy=compareRun(decodeEntrance(initial,c.receipt),pads,f=>ram.subarray(f*2048,(f+1)*2048),c.level,true),first=Math.min(...Object.values(audit.fields).filter((v):v is number=>v!==null));
 assert.ok(legacy.first!==null&&legacy.first<first,JSON.stringify({legacy,audit}));
 assert.ok(['dead','cam','x','y'].some(k=>{const f=legacy.fields[k];return f!==null&&f<first;}),'a flag discrepancy requires an earlier actual Mario/camera/death discrepancy, not an unrelated score/enemy difference');
 console.log('5-1 full replay remains downstream of earlier native motion: '+JSON.stringify({legacy:legacy.fields,flag:audit.fields}));
});
test('one authenticated5-1 approach seed proves all632 ID49 rows without repairing the full replay',()=>{
 const c=fixture.cases.find(c=>c.level==='5-1')!,sourceRam=unpack(c.ram),sourcePads=unpack(c.pads),initial=unpack(approach.initial),pads=unpack(approach.pads),ram=unpack(approach.ram);
 assert.equal(approach.sourceRamSha256,c.ramSha256);assert.equal(approach.sourcePadSha256,c.padSha256);assert.equal(approach.seedFrame+1,approach.nativeBirthFrame);
 assert.deepEqual(initial,sourceRam.subarray(approach.seedFrame*2048,(approach.seedFrame+1)*2048));assert.deepEqual(pads,sourcePads.subarray(approach.nativeBirthFrame));assert.deepEqual(ram,sourceRam.subarray(approach.nativeBirthFrame*2048));
 assert.equal(sha(initial),approach.initialSha256);assert.equal(sha(pads),approach.padSha256);assert.equal(sha(ram),approach.ramSha256);
 const audit=auditFlagBuffers(initial,pads,ram,approach.receipt,approach.level);assert.equal(audit.firstBorn,0);assert.equal(audit.rows,632);assert.equal(audit.status,'pass',JSON.stringify(audit));
});
test('strict native48/49/22 adapters retain actual slot/coordinates and do not claim stale state ownership',()=>{
 const r=new Uint8Array(2048);for(const [slot,id,x,y]of [[5,48,3144,49],[0,49,3264,113],[1,22,3216,96]]){r[0xf+slot]=1;r[0x16+slot]=id;r[0x6e+slot]=x>>8;r[0x87+slot]=x&255;r[0xb6+slot]=1;r[0xcf+slot]=y;}
 r[0xbb]=0; // FlagpoleObject leaves Y_HighPos untouched; its handler uses rawlowY.
 const sim:any={phase:'flag',flagTop:49,specialSlot5:{flag:1,id:48,x:3144,y:48},nativeCastleFlag:{slot:0,x:3264,y:113,task:0,state:0},nativeFireworks:[{slot:1,x:3216,y:96,active:true}],enemies:[],items:[]};
 r[0x1e]=77;const native=strictNativeEntities(r);assert.deepEqual(native.gaps,[]);assert.equal(native.entities.length,3);assert.deepEqual(strictEntityDifferences(native,strictSimEntities(sim)).mismatches,[]);
 sim.nativeCastleFlag.task=2;assert.ok(strictEntityDifferences(native,strictSimEntities(sim)).mismatches.some(m=>m.code==='state'));
 sim.nativeCastleFlag.x++;assert.ok(strictEntityDifferences(native,strictSimEntities(sim)).mismatches.some(m=>m.code==='position'));
});

test('source fireworks never overwrite the occupied sixth-slot flag when all normal slots are full',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.phase='flag';sim.time=0;
 sim.nativeCastleFlag={slot:0,x:3264,y:113,task:3,state:0,interval:0,draw:false};sim.nativeFireworksCounter=1;sim.nativeFrenzyTimer=0;sim.specialSlot5.flag=1;sim.specialSlot5.id=48;
 sim.enemies=[1,2,3,4].map(enemySlot=>({kind:'goomba',enemySlot,active:true,dead:0,slotFreed:false}));
 sim.runNativeFlagActors();assert.equal(sim.nativeFireworks.length,0);assert.equal(sim.nativeFireworksCounter,1);assert.equal(sim.specialSlot5.id,48);
 sim.enemies[3].active=false;sim.runNativeFlagActors();assert.equal(sim.nativeFireworks.length,1);assert.equal(sim.nativeFireworks[0].slot,4);assert.equal(sim.nativeFireworksCounter,0);
});
