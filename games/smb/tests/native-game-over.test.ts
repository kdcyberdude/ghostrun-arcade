import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {decodeNativeGameOver,stepNativeGameOver,runNativeGameOver,type NativeGameOver} from '../src/native-game-over.js';import fixture from './fixtures/native-game-over-cases.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('native game-over controls match held/unheld/time-up captures and real Start exits on every retained source row',()=>{
 assert.equal(fixture.cases.length,6);assert.deepEqual(fixture.diagnostics,[]);let rows=0,exits=0;const kinds=new Set<string>();
 for(const c of fixture.cases){const initial=unpack(c.initial),ram=unpack(c.ram),pads=unpack(c.pads),state=decodeNativeGameOver(initial);assert.equal(hash(initial),c.initialSha256);assert.equal(hash(ram),c.ramSha256);assert.equal(hash(pads),c.padsSha256);kinds.add(c.branch.kind);
  for(let i=0;i<c.events.length;i++){const e=c.events[i];assert.deepEqual(state,e.before,`${c.branch.kind}/${c.branch.variant} source${e.frame} before`);const effect=stepNativeGameOver(state,e.input);assert.deepEqual(state,e.after,`${c.branch.kind}/${c.branch.variant} source${e.frame}`);if(effect.eventQueue!==undefined)assert.equal(effect.eventQueue,e.eventQueue);if(effect.leave){exits++;assert.equal(effect.leave,'title');}rows++;}
 }
 assert.deepEqual([...kinds].sort(),['held','time-up','unheld']);assert.equal(rows,1501);assert.equal(exits,6);
});
test('RunGameOver accepts a held Start immediately; its screen tasks do not accept that input early',()=>{
 const n:NativeGameOver={mode:3,task:0,engine:6,screen:12,disable:1,timer:0,master:0,timeUp:false,columns:255};
 while(n.task!==2){const out=runNativeGameOver(n,{start:true,canContinue:false});assert.equal(out.leave,undefined);}
 assert.equal(n.timer,18);const out=runNativeGameOver(n,{start:true,canContinue:false});assert.equal(out.leave,'title');assert.deepEqual([n.mode,n.task,n.timer],[0,0,0]);
});
test('TransposePlayers continuation resets the game engine/master gate without inventing another screen duration',()=>{
 const n:NativeGameOver={mode:3,task:2,engine:6,screen:6,disable:2,timer:18,master:47,timeUp:false,columns:255},out=runNativeGameOver(n,{start:true,canContinue:true});
 assert.equal(out.leave,'continue');assert.equal(out.eventQueue,128);assert.deepEqual([n.mode,n.task,n.engine,n.master,n.timer,n.disable],[1,0,0,0,18,0]);
});
