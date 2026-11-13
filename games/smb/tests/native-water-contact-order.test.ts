import {test} from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {nativePlayerBox} from '../src/native-misc.js';
import {nativeAreaBindings} from '../tools/harness/native-area-identity.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {decodeNativeWater,initializeNativeWater} from '../tools/harness/native-water-seed.mjs';
import cases from './fixtures/native-water-contact-cases.json';
const unpack=(s:string)=>zlib.gunzipSync(Buffer.from(s,'base64')),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const c of cases)test(`native pre-BG water contact ${c.sha.slice(0,8)} preserves the injury row and later slots`,()=>{
 const initial=unpack(c.initial),ram=unpack(c.ram),pads=unpack(c.pads),levels=observedLevels(),sim:any=new Simulation(levels);sim.reset(true);
 assert.equal(hash(initial),c.initialSha256);assert.equal(hash(ram),c.windowSha256);
 const binding=nativeAreaBindings(levels.find(l=>l.id==='2-2')!).bindings.find(b=>b.area==='area-2')!,start=decodeEntrance(initial,{level:'2-2'},binding);
 // Water reuses the cannon RAM table for whirlpool extents.
 assert.equal(start.cannons,undefined);initializeEntrance(sim,{...start,nativeWater:undefined,engine:8});initializeNativeWater(sim,decodeNativeWater(initial,binding.offset));sim.step([],0);sim.inputs=[];
 const names=['a','b','select','start','up','down','left','right'];
 for(let i=0;i<pads.length;i++){
  const r=ram.subarray(i*2048,(i+1)*2048);sim.step(names.filter((_,bit)=>pads[i]&(1<<bit)),1);
  assert.equal(sim.phase==='dying',r[14]===11,`engine source ${c.row+i+1}`);
  assert.deepEqual([Math.floor(sim.player.x),(Math.floor(sim.player.y)-32)&255],[r[0x6d]*256+r[0x86],r[0xce]],`Mario source ${c.row+i+1}`);
  const native=[];for(let slot=0;slot<5;slot++)if(r[15+slot]&&[7,10,11].includes(r[22+slot]))native.push([slot,r[0x6e+slot]*256+r[0x87+slot],r[0xcf+slot]]);
  const actual=sim.enemies.filter((e:any)=>e.active&&!e.dead&&!e.slotFreed&&(e.bloop||e.nativeSwim)).map((e:any)=>[e.enemySlot,Math.floor(e.x),Math.floor(e.y)-24]).sort((a:number[],b:number[])=>a[0]-b[0]);assert.deepEqual(actual,native,`actors source ${c.row+i+1}`);
  if(sim.phase==='play')assert.deepEqual(nativePlayerBox(sim.waterCollisionPose.x,sim.waterCollisionPose.y+32,sim.player.size,sim.player.duck,sim.camera),Array.from(r.subarray(0x4ac,0x4b0)),`cached box source ${c.row+i+1}`);
 }
});
