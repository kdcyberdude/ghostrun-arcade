import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import fixture from './fixtures/native-hammer-hold.json';
const signed=(v:number)=>v<<24>>24;

test('every native held hammer preserves motion/state while RunHSubs updates its bounding box',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.heldObjects,2732);assert.equal(fixture.midLoopObjects,3);assert.equal(fixture.events.length,13);assert.deepEqual(fixture.diagnostics,[]);
 for(const e of fixture.events){
  const sim:any=new Simulation(observedLevels());sim.reset(true);sim.powerChange={from:0,to:1,kind:'grow',remaining:e.examples[0].afterControl};sim.random.frame=e.examples[0].frame;sim.camera=e.camera;sim.lakituScroll=0;sim.miscOffscreen=255;
  if(e.slot<4)sim.nativeBlocks[e.slot].x=e.checkX;else sim.miscPositions[e.slot-4].x=e.checkX;
  const before=e.before,owner={x:e.owner.x,y:e.owner.y,nativeDir:e.owner.dir,hbro:{state:e.owner.state}},i:any={kind:'hammer',x:before.x,y:before.y,vx:before.vx,vy:0,life:999,age:0,owner,nativeHammer:{slot:e.slot,state:before.state,speed:before.speed,force:before.force,fraction:before.fraction,collision:before.collision,box:before.box}};
  sim.moveNativeHammer(i);const n=i.nativeHammer;
  assert.deepEqual([i.life>0?n.state:0,i.x,i.y,i.vx,n.speed,n.force,n.fraction,n.collision,n.box],[e.after.state,e.after.x,e.after.y,e.after.vx,e.after.speed,e.after.force,e.after.fraction,e.after.collision,e.after.box],JSON.stringify(e.examples));
  assert.equal(owner.hbro.state,e.owner.state,'held release state cannot clear the owner throwing bit');
  if(e.offscreen!==null)assert.equal(sim.miscOffscreen,e.offscreen,'RunHSubs still updates the native shared offscreen byte');
 }
});

test('an actual native hammer contact holds only subsequent lower misc slots in the same pass',()=>{
 assert.ok(fixture.passes.length>0);
 for(const pass of fixture.passes){
  const p=new Uint8Array(zlib.gunzipSync(Buffer.from(pass.beforeRam,'base64'))),r=new Uint8Array(zlib.gunzipSync(Buffer.from(pass.afterRam,'base64'))),sim:any=new Simulation(observedLevels());sim.reset(true);
  sim.random.frame=r[9];sim.lakituScroll=r[0x775];sim.camera=r[0x71a]*256+r[0x71c]-sim.lakituScroll;sim.miscOffscreen=p[0x3d6];sim.hammerPlayerBox=Array.from(r.subarray(0x4ac,0x4b0));
  Object.assign(sim.player,{x:r[0x6d]*256+r[0x86],y:(r[0xb5]-1)*256+r[0xce]+32,size:p[0x756],invincible:Math.max(0,p[0x79e]-1),star:r[0x79f]});
  for(let slot=0;slot<4;slot++)sim.nativeBlocks[slot].x=r[0x76+slot]*256+r[0x8f+slot];
  for(let slot=0;slot<9;slot++)sim.miscPositions[slot]={x:p[0x7a+slot]*256+p[0x93+slot],y:(p[0xc2+slot]-1)*256+p[0xdb+slot]};
  const owners=Array.from({length:6},(_,slot)=>({kind:r[22+slot]===45?'bowser':'hammerBro',x:r[0x6e+slot]*256+r[0x87+slot],y:(r[0xb6+slot]-1)*256+r[0xcf+slot]+24,nativeDir:r[0x46+slot]===1?1:-1,hbro:r[22+slot]===5?{state:r[0x1e+slot]}:undefined,nativeBowser:r[22+slot]===45?{x:r[0x6e+slot]*256+r[0x87+slot],y:(r[0xb6+slot]-1)*256+r[0xcf+slot]}:undefined}));
  const items:any[]=[];
  for(let slot=8;slot>=0;slot--)if(p[0x2a+slot]){
   const n={slot,state:p[0x2a+slot],speed:signed(p[0xac+slot]),force:p[0x440+slot],fraction:p[0x423+slot],collision:Boolean(p[0x6be+slot]),box:Array.from(p.subarray(0x4d0+slot*4,0x4d4+slot*4))},hammer=Boolean(n.state&128),i:any={kind:hammer?'hammer':'coin',x:p[0x7a+slot]*256+p[0x93+slot]+p[0x40d+slot]/256,y:(p[0xc2+slot]-1)*256+p[0xdb+slot],vx:hammer?signed(p[0x64+slot])/16:0,vy:0,life:999,age:0,owner:owners[p[0x6ae+slot]],...(hammer?{nativeHammer:n}:{nativeCoin:n})};items.push(i);
  }
  for(const i of items){if(i.nativeHammer)sim.moveNativeHammer(i);else sim.moveNativeCoin(i);}
  assert.equal(sim.nativeTimersStopped,true,`${pass.id} row${pass.row} must raise TimerControl`);
  for(const i of items.filter(i=>i.nativeHammer)){
   const n=i.nativeHammer,s=n.slot,at=`${pass.id} row${pass.row} slot${s}`;
   assert.deepEqual([i.life>0?n.state:0,Math.floor(i.x),i.y,i.vx,n.speed,n.force,n.fraction,Number(n.collision),n.box],[r[0x2a+s],r[0x7a+s]*256+r[0x93+s],(r[0xc2+s]-1)*256+r[0xdb+s],signed(r[0x64+s])/16,signed(r[0xac+s]),r[0x440+s],r[0x423+s],r[0x6be+s],Array.from(r.subarray(0x4d0+s*4,0x4d4+s*4))],at);
  }
 }
});
