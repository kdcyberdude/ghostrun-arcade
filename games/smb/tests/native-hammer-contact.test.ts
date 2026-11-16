import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativeHammerBroContact,nativeHammerBroBox} from '../src/hammer-bro.js';import type {NativeBox} from '../src/native-misc.js';
import fixture from './fixtures/native-hammer-contact.json';

test('native ID5 contact boundaries and latch match all controlled native Hammer Bro branches',()=>{
 assert.equal(fixture.rows.length,427);
 for(const r of fixture.rows){
  const enemy=nativeHammerBroBox(160,96,0);assert.deepEqual(enemy,r.enemyBox);
  const n={collision:Boolean(r.initialLatch)},action=nativeHammerBroContact(n,{frame:r.frame,blocked:false,player:r.playerBox as NativeBox,enemy,star:Boolean(r.initialStar),injury:Boolean(r.initialInjury),playerSpeed:r.initialSpeed,stompTimer:r.stompTimer});
  assert.deepEqual([action,Number(n.collision)],[r.after.action,r.after.latch],JSON.stringify([r.size,r.dx,r.dy,r.initialSpeed,r.initialLatch,r.initialStar,r.initialInjury,r.frame]));
 }
});

test('runtime Hammer Bro contact precedes throwing and movement for every native boundary branch',async()=>{
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js');
 for(const r of fixture.rows){
  const sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);sim.reset(true);
  const e=sim.makeEnemy({kind:'hammerBro',x:160,y:120});Object.assign(e,{active:true,enemySlot:2,age:2,hbro:{state:0,jumpTimer:100,throwTimer:100,frameTimer:32,interval:128,speed:0,force:0,fraction:73,y:96,collision:Boolean(r.initialLatch)}});sim.enemies=[e];
  Object.assign(sim.player,{x:160+r.dx,y:r.playerY+32,vy:r.initialSpeed,size:r.size,star:r.initialStar,invincible:r.initialInjury});sim.camera=0;sim.lakituScroll=0;sim.hammerPlayerBox=r.playerBox;sim.random.frame=r.frame;sim.nativeStompTimer=r.stompTimer;
  sim.updateNativeHammerBro(e);
  const at=JSON.stringify([r.size,r.dx,r.dy,r.initialSpeed,r.initialLatch,r.initialStar,r.initialInjury,r.frame]);
  assert.deepEqual([Math.floor(e.x),Math.round((e.x-Math.floor(e.x))*256),e.hbro.y,e.hbro.speed&255,e.hbro.force,e.hbro.fraction,e.hbro.state,Number(e.hbro.collision)],[r.after.x,r.after.xFraction,r.after.enemyY,r.after.enemySpeed,r.after.force,r.after.fraction,r.after.state,r.after.latch],at);
  if(['stomp','star'].includes(r.after.action)){assert.equal(sim.awardedScore,1000,at);assert.equal(sim.player.vy&255,r.after.playerSpeed,at);}
  else if(r.after.action==='hurt')assert.equal(Boolean(sim.player.dead||sim.powerChange),true,at);
 }
});

test('native Hammer Bro stomp and star defeat retain fractions and horizontal speed until erasure',async()=>{
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js');
 assert.deepEqual(fixture.defeats.map(t=>t.action),['stomp','star']);
 for(const trajectory of fixture.defeats){
  const first=trajectory.rows[0],sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);sim.reset(true);
  const e=sim.makeEnemy({kind:'hammerBro',x:first.x+first.xFraction/256,y:first.y+24});Object.assign(e,{active:true,enemySlot:2,dead:1,vx:(first.xSpeed<<24>>24)/16,hbro:{state:trajectory.action==='stomp'?32:34,jumpTimer:100,throwTimer:100,frameTimer:31,interval:128,speed:first.speed<<24>>24,force:first.force,fraction:first.fraction,y:first.y}});
  for(const row of trajectory.rows.slice(1)){
   sim.moveDefeatedHammerBro(e);assert.equal(e.active,Boolean(row.flag),`${trajectory.action} row${row.frame}`);
   if(row.flag)assert.deepEqual([e.x,e.hbro.y,e.hbro.speed&255,e.hbro.force,e.hbro.fraction],[row.x+row.xFraction/256,row.y,row.speed,row.force,row.fraction],`${trajectory.action} row${row.frame}`);
  }
 }
});

test('recorded native prefixes retain every actor and contact/defeat row without source-slot gaps',async()=>{
 const {default:eightThree}=await import('./fixtures/native-hammer-stomp-prefix.json'),{default:threeOne}=await import('./fixtures/native-hammer-three-one-prefix.json'),{default:zlib}=await import('node:zlib'),{createHash}=await import('node:crypto'),{decodeEntrance,initializeEntrance}=await import('../tools/harness/native-entrance.mjs'),{strictCompare}=await import('../tools/harness/native-strict.js');
 const {Simulation}=await import('../src/simulation.js'),{observedLevels}=await import('../src/levels.js'),{nativeEntities,simEntities,unmatchedEntity}=await import('../tools/harness/native-entities.js');
 const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),buttons=['a','b','select','start','up','down','left','right'] as const;
 for(const [level,fixture]of [['8-3',eightThree],['3-1',threeOne]] as const){
  const initial=unpack(fixture.initialRam),ram=unpack(fixture.ram),pads=unpack(fixture.pads);
  assert.equal(createHash('sha256').update(initial).digest('hex'),fixture.initialRamSha256);assert.equal(createHash('sha256').update(ram).digest('hex'),fixture.ramSha256);
  const audit=strictCompare(decodeEntrance(initial,fixture.receipt),pads,ram,level);assert.equal(audit.coverage.frames,fixture.frames);
  assert.deepEqual(audit.fields,({level:null,area:null,dead:null,time:null,score:null,coins:null,cam:null,x:null,y:null,missing:null,extra:null,kind:null,position:null,state:null,'firebar.id':null,'firebar.high':null,'firebar.low':null,'firebar.speed':null,'firebar.direction':null,'alias.owner':null,'vine.count':null,'vine.height':null,'vine.startY':null,'vine.slots':null,'sound.queues':null,'sound.ram':null})); // Every native actor slot is now compared without gaps.
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,fixture.receipt));sim.step([],0);sim.inputs=[];
  for(let f=0;f<pads.length;f++){sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const r=ram.subarray(f*2048,(f+1)*2048);assert.equal(unmatchedEntity(nativeEntities(r,f?ram.subarray((f-1)*2048,f*2048):undefined),simEntities(sim)),undefined,`${level} legacy actor row${f}`);}
 }
});
