import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeLakituBox,nativeLakituContact} from '../src/lakitu-contact.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import cases from './fixtures/native-lakitu-contact.json';
import type {NativeBox} from '../src/native-misc.js';

test('normal and reappearing Lakitu rectangles and contact state match native boundary branches',()=>{
 assert.equal(cases.rows.length,847);
 for(const r of cases.rows){
  const at=JSON.stringify([r.box,r.size,r.dx,r.dy,r.initialSpeed,r.initialLatch,r.initialStar,r.initialInjury,r.frame]);
  const box=nativeLakituBox(160,96,r.box as 3|8,0);assert.deepEqual(box,r.enemyBox,at);
  const n={collision:Boolean(r.initialLatch)},action=nativeLakituContact(n,{frame:r.frame,blocked:false,player:r.playerBox as NativeBox,enemy:box,star:Boolean(r.initialStar),injury:Boolean(r.initialInjury),playerY:r.playerY,enemyY:96,playerSpeed:r.initialSpeed,stompTimer:r.stompTimer});
  assert.deepEqual([action,Number(n.collision)],[r.after.action,r.after.latch],at);
 }
});

test('respawn Lakitu runtime uses its small rectangle, native scores/bounce, latch and defeat bytes',()=>{
 for(const r of cases.rows.filter(r=>r.box===8)){
  const sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);sim.reset(true);
  const e=sim.makeEnemy({kind:'lakitu',x:160,y:112});Object.assign(e,{active:true,enemySlot:2,lak:{dir:0,speed:0,box:8,collision:Boolean(r.initialLatch)}});sim.enemies=[e];
  sim.slotVertical[2].fraction=73;sim.player.x=160+r.dx;sim.player.y=r.playerY+32;sim.player.vy=r.initialSpeed;sim.player.size=r.size;sim.player.star=r.initialStar;sim.player.invincible=r.initialInjury;sim.broClock=r.frame;sim.nativeStompTimer=r.stompTimer;sim.camera=0;sim.hammerPlayerBox=r.playerBox;
  sim.contactRespawnLakitu(e,160,112);
  assert.equal(Number(e.lak.collision),r.after.latch);
  if(r.after.action==='stomp'||r.after.action==='star'){
   assert.deepEqual([e.y-16,e.pod.speed&255,e.pod.force,e.pod.fraction],[r.after.enemyY,r.after.enemySpeed,r.after.force,r.after.fraction]);
   assert.equal(sim.awardedScore,r.after.action==='stomp'?800:200);
   assert.equal(sim.player.vy&255,r.after.playerSpeed);
  }else if(r.after.action==='hurt')assert.equal(r.size?Boolean(sim.powerChange):sim.player.dead,true);
  else assert.equal(Boolean(e.dead||sim.player.dead||sim.powerChange),false);
 }
});

test('Lakitu contact retains latch on skipped rows and clears it only on a tested non-overlap',()=>{
 const n={collision:true},base={frame:2,blocked:false,player:[0,0,10,10] as NativeBox,enemy:[30,30,40,40] as NativeBox,star:false,injury:false,playerY:0,enemyY:30,playerSpeed:0,stompTimer:0};
 assert.equal(nativeLakituContact(n,{...base,frame:3}),'none');assert.equal(n.collision,true);
 nativeLakituContact(n,{...base,blocked:true});assert.equal(n.collision,true);
 nativeLakituContact(n,base);assert.equal(n.collision,false);
});

test('respawn Lakitu defeat motor and vertical erasure match native until its slot is cleared',()=>{
 for(const trajectory of cases.defeats){
  const first=trajectory.rows[0],sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-2')!)]);sim.reset(true);
  const e=sim.makeEnemy({kind:'lakitu',x:160,y:first.y+16});Object.assign(e,{active:true,enemySlot:2,dead:1,lak:{dir:0,speed:0,box:8},pod:{y:first.y+16,speed:first.speed>127?first.speed-256:first.speed,force:first.force,fraction:first.fraction,timer:0}});
  for(const row of trajectory.rows.slice(1)){
   sim.moveDefeatedRespawnLakitu(e);
   assert.equal(e.active,Boolean(row.flag),`${trajectory.action} row${row.frame}`);
   if(row.flag)assert.deepEqual([e.y-16,e.pod.speed&255,e.pod.force,e.pod.fraction],[row.y,row.speed,row.force,row.fraction],`${trajectory.action} row${row.frame}`);
  }
  assert.equal(e.slotFreed,true);assert.equal(e.slotLost,true);
 }
});
