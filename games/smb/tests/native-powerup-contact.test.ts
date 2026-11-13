import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {nativePowerupContact} from '../src/native-powerup.js';import type {NativeBox} from '../src/native-misc.js';
import {Simulation} from '../src/simulation.js';import {decodeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-powerup-contact.json';

test('source even-frame bbox3 powerup collision matches every retained and mood eligible native row',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.rows,9277);assert.deepEqual(fixture.diagnostics,[]);
 let count=0;
 for(const [x,y,camera,frame,playerY,l,t,r,b,pickup,n]of fixture.events){
  const box:NativeBox=[l,t,r,b];assert.equal(nativePowerupContact(x,y,camera,frame,playerY,box),Boolean(pickup));count+=n;
  const context={player:{y:playerY+32},camera,lakituScroll:0,random:{frame},phase:'play',hammerPlayerBox:box};
  assert.equal((Simulation.prototype as any).nativePowerupCollision.call(context,{x,y:y+8}),Boolean(pickup));
 }
 assert.equal(count,fixture.rows);assert.equal(fixture.pickups.length,4);
});

test('native mushroom FloateyNumber awards points on the timer43 pass, five rows after collection',()=>{
 const p=Simulation.prototype as any;
 for(const e of fixture.pickups){
  assert.equal(e.kind,0);assert.equal(e.award[0].control,6);assert.equal(e.award[0].timer,47);
  const context:any={player:{size:0},pendingScore:[],score:e.award[0].score,awardPopup(){},emit(){},floateyScore:p.floateyScore};
  p.collectItem.call(context,{kind:'mushroom',nativePowerState:192,x:e.x,y:e.y+8});
  assert.equal(context.score,e.award[0].score);
  for(let i=1;i<6;i++){p.payFloateyScore.call(context);assert.equal(context.score,e.award[i].score,`${e.id} row${e.row+i}`);}
 }
});

test('clean mood2-1 prefix keeps all strict fields exact through mushroom collection and growth',()=>{
 const e=fixture.replay!,unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),initial=unpack(e.initialRam),ram=unpack(e.ram),pads=unpack(e.pads),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
 assert.equal(sha(initial),e.initialRamSha256);assert.equal(sha(ram),e.ramSha256);assert.equal(pads.length,970);
 const result=strictCompare(decodeEntrance(initial,e.receipt),pads,ram,e.level);assert.equal(result.coverage.frames,970);
 for(const [field,first]of Object.entries(result.fields))assert.equal(first,null,field);
});
