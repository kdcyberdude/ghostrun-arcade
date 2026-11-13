import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import fixture from '../fixtures/native-corner-branches.json';import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import {decodeEntrance,initializeEntrance} from '../../tools/harness/native-entrance.mjs';import type {Button} from '../../src/types.js';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),keys:Button[]=['a','b','select','start','up','down','left','right'];
export function assertNativeCornerCase(name:string){
 const c=fixture.cases.find(c=>c.name===name);assert.ok(c,`missing source case ${name}`);
 const initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(sha(initial),c.initialSha256);assert.equal(sha(ram),c.windowRamSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.entrance));sim.inputs=[];
 for(let f=0;f<pads.length;f++){sim.step(keys.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048);assert.deepEqual([Math.floor(sim.player.x),Math.floor(sim.player.y),Math.floor(sim.camera)],[r[0x6d]*256+r[0x86],(r[0xb5]-1)*256+r[0xce]+32,r[0x71a]*256+r[0x71c]],`${c.name} sourcePPU${c.prefixFrames+f}`);}
 assert.equal(sim.phase,'play');assert.equal(sim.lives,initial[0x75a]+1);
}
