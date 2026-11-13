import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {nativePowerupEmergence} from '../src/native-powerup.js';
import {Simulation} from '../src/simulation.js';
import {decodeEntrance} from '../tools/harness/native-entrance.mjs';
import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-powerup-emergence.json';

test('GrowThePowerUp precedes TimerControl: all surviving native emergence rows across368 recordings',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.rows,6229);assert.equal(fixture.frozenRows,57);assert.deepEqual(fixture.diagnostics,[]);
 assert.equal(fixture.transitions.reduce((n,e)=>n+e.count,0),fixture.rows);
 const proto=Simulation.prototype as any;
 for(const e of fixture.transitions){
  const result=nativePowerupEmergence(e.before.state,e.before.y,e.frame);
  assert.deepEqual({state:result.state,y:result.y},e.after,JSON.stringify(e.examples));
  const item={life:2000,nativePowerState:e.before.state,y:e.before.y+8},context={items:[item],random:{frame:e.frame},updateNativePowerup:proto.updateNativePowerup,syncSpecialPowerup(){}};
  proto.emergeFrozenNativePowerups.call(context);assert.deepEqual([item.nativePowerState,item.y-8],[e.after.state,e.after.y]);
 }
});

test('mood1-4 mushroom keeps emerging during the death engine; all strict fields match before respawn',()=>{
 const e=fixture.replay!,unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),initial=unpack(e.initialRam),ram=unpack(e.ram),pads=unpack(e.pads),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 assert.equal(sha(initial),e.initialRamSha256);assert.equal(sha(ram),e.ramSha256);assert.equal(pads.length,e.frames);assert.equal(e.frames,637);
 const result=strictCompare(decodeEntrance(initial,e.receipt),pads,ram,e.level);
 assert.equal(result.coverage.frames,637);for(const [field,first]of Object.entries(result.fields))assert.equal(first,null,field);
});
