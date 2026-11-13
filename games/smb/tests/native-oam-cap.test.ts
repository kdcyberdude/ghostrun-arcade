import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {nativeOamScanlines} from '../src/native-oam.js';import {nativeOamPicture} from '../src/native-oam-picture.js';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-oam-capability.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('first-eight fetches include transparent, behind-background and horizontally hidden pieces',()=>{
 const oam=new Uint8Array(256);for(let a=0;a<256;a+=4)oam[a]=248;
 for(let n=0;n<9;n++)oam.set([32,252,32,255],n*4);
 const cap=nativeOamScanlines(oam);assert.deepEqual(cap.rows.slice(0,9),[255,255,255,255,255,255,255,255,0]);assert.equal(cap.dropped[8],255);
 oam[0]=248;const overwritten=nativeOamScanlines(oam);assert.equal(overwritten.rows[8],255,'selection uses final ownership, not an earlier writer');assert.equal(overwritten.rows[0],0);
 const tall=nativeOamScanlines(oam,16);assert.equal(tall.rows[8],65535);
});
test('every reconstructed source OAM byte matches native on supported ground and underground frames',()=>{
 let supported=0,checked=0;const buttons=['a','b','select','start','up','down','left','right'];
 for(const c of fixture.cases){const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(c.initial),c.entrance));sim.step([],0);sim.inputs=[];const pads=unpack(c.pads),ram=unpack(c.ram);let count=0,bytes=0;
  for(let f=0;f<c.frames;f++){sim.step(buttons.filter((_,i)=>pads[f]&(1<<i)),1);const picture=nativeOamPicture(sim);if(!picture.supported)continue;count++;const native=ram.subarray(f*2048+512,f*2048+768);
   for(let a=0;a<256;a++)if(a%4===0||picture.written[a>>2]){bytes++;assert.equal(picture.oam[a],native[a],`${c.level} frame${f} OAMbyte${a}`);}
   assert.deepEqual(nativeOamScanlines(picture.oam),nativeOamScanlines(native));
  }
  assert.equal(count,c.supported);assert.equal(bytes,c.checkedBytes);supported+=count;checked+=bytes;
 }
 assert.equal(supported,1505);assert.equal(checked,167249);
});
test('unknown writers refuse the whole cap rather than disappear from its sprite count',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.phase='play';sim.items=[];sim.popups=[];sim.vines=[];sim.blockGraphics=[];sim.frenzyControllers=[];sim.nativeCastleFlag=undefined;sim.specialSlot5.flag=0;sim.area={...sim.area,platforms:[],firebars:[],springs:[]};sim.enemies=[];Object.assign(sim.player,{x:112,y:208,dead:false,size:0,star:0});sim.camera=0;
 assert.equal(nativeOamPicture(sim).supported,true);
 sim.items=[{kind:'coin'}];assert.ok(nativeOamPicture(sim).reasons.includes('other-writer'));sim.items=[];
 sim.enemies=[{active:true,dead:0,kind:'koopa',enemySlot:0}];assert.ok(nativeOamPicture(sim).reasons.includes('enemy-writer'));sim.enemies=[];
 sim.area.platforms=[{}];assert.ok(nativeOamPicture(sim).reasons.includes('area-writer'));sim.area.platforms=[];
 sim.paused=true;assert.ok(nativeOamPicture(sim).reasons.includes('control-owner'));
});
