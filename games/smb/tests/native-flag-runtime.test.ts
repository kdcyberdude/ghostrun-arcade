import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import fixture from './fixtures/native-flag-runtime.json';import {auditFlagBuffers} from '../tools/harness/native-flag-audit.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('continuous source flag control matches11 native entrances through the actual next-level dispatch',()=>{
 assert.equal(fixture.cases.length,11);let rows=0;
 for(const c of fixture.cases){const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(sha(initial),c.initialSha256);assert.equal(sha(pads),c.padSha256);assert.equal(sha(ram),c.ramSha256);assert.equal(pads.length,c.frames);
  const audit=auditFlagBuffers(initial,pads,ram,c.receipt,c.level);assert.equal(audit.status,'pass',JSON.stringify(audit));assert.ok(audit.rows>0);rows+=audit.rows;
 }
 assert.equal(rows,7329);
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
