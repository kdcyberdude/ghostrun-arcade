import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
import fixture from './fixtures/native-pipe-rise-input.json';
const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),sha=(r:Uint8Array)=>createHash('sha256').update(r).digest('hex'),signed=(b:number)=>(b<<24)>>24;
for(const c of fixture.cases)test(`continuous cold pipe return preserves ignored AB and first control ${c.sha256.slice(0,12)}`,()=>{
 const pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(sha(pads),c.sha256);assert.equal(sha(ram),c.windowSha256);assert.equal(pads.length,c.inputFrames);assert.equal(ram.length,(c.to-c.from+1)*2048);
 const sim:any=new Simulation(observedLevels());sim.reset();let checked=0,jumps=0;
 for(let f=0;f<pads.length;f++){
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,i)=>pads[f]&(1<<i)),1);if(f<c.from||f>c.to)continue;checked++;
  const r=ram.subarray((f-c.from)*2048,(f-c.from+1)*2048),x=r[0x6d]*256+r[0x86]+r[0x400]/256,y=(r[0xb5]-1)*256+r[0xce]+r[0x416]/256;
  assert.equal(sim.player.x,x,`source${f} X`);assert.equal(sim.player.y-32,y,`source${f} Y`);assert.equal(sim.player.vy,signed(r[0x9f])+r[0x433]/256,`source${f} vertical motor`);assert.equal(Math.round(sim.player.vx*4096),signed(r[0x57])*256+r[0x705],`source${f} horizontal motor`);
  assert.equal(sim.pipeRising,r[14]===7,`source${f} entry ownership`);assert.equal(sim.nativePlayerAB,r[0xa],`source${f} consumed AB`);
  if(r[14]===7)assert.equal(r[0xd],0);if(r[0x9f]===252&&r[0x433]===32)jumps++;
 }
 assert.equal(checked,c.to-c.from+1);if(c.sha256.startsWith('1ec0'))assert.equal(jumps,1,'native first control accepts A held through the ignored rise');
});
