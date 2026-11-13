import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import fixture from './fixtures/native-strict-victory.json';import events from './fixtures/native-victory-events.json';
import {strictCompare} from '../tools/harness/native-strict.js';import {compareRun} from '../tools/harness/native-divergence.js';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {victoryChecks} from '../tools/harness/native-victory-readout.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences} from '../tools/harness/native-strict-entities.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('continuous strict audit includes every native victory row without erasing the earlier gameplay divergence',()=>{
 const initial=unpack(fixture.initial),pads=unpack(fixture.pads),ram=unpack(fixture.ram),start=decodeEntrance(initial,{level:fixture.level});
 // Deliberately perturb the one-time entrance, so preservation remains tested after real runtime fixes.
 start.score+=10;
 const legacy=compareRun(start,pads,f=>ram.subarray(f*2048,(f+1)*2048),fixture.level),prefix=strictCompare(start,pads.subarray(0,fixture.victoryFirst),ram.subarray(0,fixture.victoryFirst*2048),fixture.level),audit=strictCompare(start,pads,ram,fixture.level);
 assert.equal(audit.coverage.frames,fixture.frames);assert.equal(audit.coverage.victoryFrames,fixture.victoryFrames);assert.equal(audit.coverage.continuationFrames,fixture.frames-fixture.levelChange);assert.equal(audit.coverage.uncomparedSameLevelFrames,0);
 assert.equal(legacy.fields.score,0);for(const [field,first]of Object.entries(prefix.fields))if(first!==null)assert.equal(audit.fields[field],first,`earlier ${field} divergence remains visible`);assert.ok(audit.first!<fixture.victoryFirst);
 assert.ok(Object.keys(audit.fields).some(k=>k.startsWith('victory.')));assert.ok(!audit.diagnostics.some(d=>d.code==='unsupported-native-mode'&&d.detail.includes('mode=2')));
 assert.equal(audit.coverage.complete,true,'every retained actor family now has an owned readout');assert.deepEqual(audit.diagnostics,[]);assert.notEqual(audit.status,'pass');
});
test('victory RAM aliases are compared only once the source routines own them',()=>{
 const r=Buffer.from(events.runtime[0].ram,'base64'),sim:any={phase:'castle',nativeVictory:{task:2,destination:12,walk:0},random:{frame:r[9],bytes:Array.from(r.subarray(0x7a7,0x7ae))},intervalControl:r[0x77f]};
 r[0x772]=1;r[0x34]=77;r[0x35]=16;let fields=victoryChecks(r,sim,false,false);assert.ok(!fields.some(([k])=>k==='destination'||k==='walk'||k==='cell'));
 r[0x772]=2;r[0x34]=10;fields=victoryChecks(r,sim,false,false,512);assert.deepEqual(fields.find(([k])=>k==='destination'),['destination',12,12]);assert.ok(!fields.some(([k])=>k==='walk'));
 fields=victoryChecks(r,sim,true,false,512);assert.deepEqual(fields.find(([k])=>k==='walk'),['walk',16,0]);
 r[0xf+r[0x368]]=0;sim.victoryBoss=undefined;assert.ok(!victoryChecks(r,sim,true,false).some(([k])=>k==='bossState'||k.startsWith('boss.')),'dead slot reuse does not own Bowser bytes');
});
test('native Bowser rear alias keeps its own slot and coordinates, while invalid aliases remain incomplete',()=>{
 const r=Buffer.from(events.runtime[0].ram,'base64'),front=r[0x368],rear=[0,1,2,3,4,5].find(s=>(r[0xf+s]&128)&&r[0x16+s]===45)!;
 assert.notEqual(rear,undefined);const bowser={active:true,dead:0,enemySlot:front,kind:'bowser',x:r[0x6e+front]*256+r[0x87+front],y:r[0xcf+front]+32,nativeBowser:{x:r[0x6e+front]*256+r[0x87+front],y:r[0xcf+front],direction:r[0x46+front],rearSlot:rear}};
 const native=strictNativeEntities(r),sim=strictSimEntities({enemies:[bowser],items:[]});const selected={...native,entities:native.entities.filter(e=>e.kind==='bowser'||e.kind==='bowser-rear')};
 assert.equal(selected.entities.length,2);assert.deepEqual(strictEntityDifferences(selected,sim).mismatches,[]);assert.ok(!native.gaps.some(g=>g.code==='native-alias'&&g.slot===rear));
 r[0xf+front]=0;assert.ok(strictNativeEntities(r).gaps.some(g=>g.code==='native-alias'&&g.slot===rear));
});

test('BowserGfxHandler rear offsets wrap coordinate bytes without changing the duplicate page',()=>{
 const sim={enemies:[{active:true,dead:0,enemySlot:0,kind:'bowser',x:770,y:282,nativeBowser:{x:770,y:250,direction:1,rearSlot:1}}],items:[]};
 const rear=strictSimEntities(sim).find(e=>e.kind==='bowser-rear')!;assert.deepEqual([rear.x,rear.y],[1010,2]);
});
