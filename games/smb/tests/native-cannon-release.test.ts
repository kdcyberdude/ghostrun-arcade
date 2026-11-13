import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-cannon-release.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),signed=(n:number)=>n<<24>>24;
function seed(sim:any,e:any,bytes:number[]){const slot=e.enemySlot;sim.slotSub[slot]=bytes[5];sim.castleSlotXSpeed[slot]=bytes[6];sim.slotVertical[slot]={speed:signed(bytes[7]),force:bytes[8],fraction:bytes[9]};sim.slotYSpeed[slot]=bytes[7];sim.slotYFraction[slot]=bytes[9];sim.slotFrameTimers[slot]=e.cannonFrameTimer=bytes[10];sim.graphicsScratch.seed(bytes[11]);}
test('actual Cannon EraseEnemyObject entries release ownership while retaining native motion bytes',()=>{
 assert.equal(fixture.events.length,26);assert.equal(fixture.receipts.reduce((sum,r)=>sum+r.frames,0),14336);
 for(const event of fixture.events){const sim:any=new Simulation(observedLevels());sim.reset(true);const b=event.eraseBefore,slot=event.slot,e=sim.makeEnemy({kind:'bullet',x:b[3]*256+b[4]+b[5]/256,y:192,direction:-1});Object.assign(e,{active:true,nativeShot:true,enemySlot:slot});seed(sim,e,b);sim.eraseBulletObject(e);
  assert.equal(e.slotFreed,true);assert.equal(e.dead,100);assert.equal(sim.slotReleaseFrame[slot],sim.frame);assert.equal(e.goneFrame,sim.frame);
  const actual=[Number(!e.slotFreed),0,0,Math.floor(e.x/256),Math.floor(e.x)&255,sim.slotSub[slot],sim.castleSlotXSpeed[slot],sim.slotYSpeed[slot],sim.slotVertical[slot].force,sim.slotYFraction[slot],sim.slotFrameTimers[slot],sim.graphicsScratch.value];
  assert.deepEqual(actual,event.after,`${event.level} row${event.frame} slot${slot}`);
 }
});
test('native KillBB retains its occupied pass but frees the bank for the following turn',()=>{
 const event=fixture.events.find(e=>e.level==='8-2'&&e.frame===1449)!;assert.equal(event.before[2],0,'this is a fresh rejection, not a defeated bullet');const sim:any=new Simulation(observedLevels());sim.reset(true);sim.camera=event.camera;sim.player.x=event.mario;sim.area.cannons=[{native:true,x:1680,y:176}];sim.area.platforms=[];sim.area.firebars=[];sim.area.springs=[];sim.frenzyControllers=[];sim.specialSlot5.flag=0;
 const b=event.before,e=sim.makeEnemy({kind:'bullet',x:b[3]*256+b[4]+b[5]/256,y:192,direction:-1});Object.assign(e,{active:true,nativeShot:true,enemySlot:2,bbCheck:true,age:1});seed(sim,e,b);
 sim.enemies=[...Array.from({length:2},(_,slot)=>Object.assign(sim.makeEnemy({kind:'goomba',x:event.camera+100,y:208}),{active:true,enemySlot:slot})),e];sim.cannonTable=[{cannon:sim.area.cannons[0],timer:0}];sim.random.bytes=[0,0,0,0,0,0,0];sim.updateNativeCannons();sim.passNativeCannons();
 assert.equal(e.slotFreed,true);assert.equal(sim.slotSub[2],128);assert.equal(sim.castleSlotXSpeed[2],8);assert.equal(sim.slotVertical[2].fraction,104);assert.equal(sim.cannonTable[0].timer,0,'the erased slot cannot fire again during its same pass');assert.equal(sim.enemies.filter((e:any)=>e.nativeShot&&!e.dead).length,0);
 sim.frame++;sim.updateNativeCannons();sim.passNativeCannons();assert.equal(sim.cannonTable[0].timer,14);assert.equal(sim.enemies.filter((e:any)=>e.nativeShot&&!e.dead&&e.enemySlot===2).length,1,'the next pass can use that slot');
});
test('original8-2 gives the next source Piranha its native slot after the1449 rejection',()=>{
 const p=fixture.prefix,sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(p.initial),p.entrance));sim.step([],0);sim.inputs=[];const pads=unpack(p.pads),ram=unpack(p.ram),buttons=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<p.frames;f++){sim.step(buttons.filter((_,i)=>pads[f]&(1<<i)),1);if(f<1448)continue;const r=ram.subarray(f*2048,(f+1)*2048),owners=sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.enemySlot===2&&e.dead<100);
  if(r[17]){assert.equal(owners.length,1);assert.equal(owners[0].kind,r[24]===51?'bullet':'piranha');assert.equal(Math.floor(owners[0].x),r[0x70]*256+r[0x89]);}else assert.equal(owners.length,0);
  assert.equal(sim.slotSub[2],r[0x403],'the successor retains native X fraction');
 }
});
