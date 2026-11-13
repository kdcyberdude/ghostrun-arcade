import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,SpringSpec} from '../src/types.js';
import {observedLevels} from '../src/levels.js';
import layout from '../data/native-spring-layout.json';
import events from './fixtures/native-spring-slot-events.json';
import {applyNativeSprings} from '../tools/native-springs.mjs';

function fixture(column:number,y=200){
 const spring:SpringSpec={x:column,y,nativeColumn:column,nativeOffset:0};
 const level:Level={id:'fixture',time:400,main:'main',areas:[{id:'main',width:8192,palette:0,theme:'ground',tiles:[],enemies:[],springs:[spring],spawn:[40,208],evidence:'Native terrain Spring slot fixture'}],evidence:'Native Jumpspring/FindEmptyEnemySlot'};
 const sim:any=new Simulation([level]);sim.reset(true);return {sim,spring:sim.area.springs[0] as SpringSpec};
}

test('all seven native Spring source declarations enrich the compiled scene without fitted trigger thresholds',()=>{
 assert.equal(layout.springs.length,7);
 for(const record of layout.springs){
  const spring=observedLevels().find(l=>l.id===record.level)!.areas.find(a=>a.id===record.area)!.springs!.find(s=>s.x===record.column&&s.y===record.y)!;
  assert.ok(spring);assert.equal(spring.nativeColumn,record.column);assert.equal(spring.nativeOffset,record.offset);
 }
 const levels=structuredClone(observedLevels()),before=JSON.stringify(levels);applyNativeSprings(levels,layout.springs);assert.equal(JSON.stringify(levels),before);
});

test('every native Spring birth uses its actual parser column and lowest free slot, retaining motion bytes',()=>{
 assert.equal(events.births.length,12);
 for(const event of events.births){
  const {sim,spring}=fixture(event.after.x,event.after.y);sim.camera=event.camera;sim.parserColumnX=event.column[0];
  sim.parserClock.task=event.clockBefore[0];sim.parserClock.scroll=event.clockBefore[1];sim.slotSub=[...event.beforeSub];sim.slotVertical=structuredClone(event.beforeVertical);
  for(let slot=0;slot<5;slot++)if(slot!==event.slot&&event.flags[slot])sim.enemies.push({...sim.makeEnemy({kind:'goomba',x:0,y:208}),active:true,enemySlot:slot});
  if(event.preload){sim.springLoadColumns=1;sim.renderInitialSpringColumns();}
  else sim.advanceNativeAreaParser(event.scroll);
  assert.equal(sim.springSlots.get(spring),event.slot,`${event.level} row${event.frame}`);assert.equal(sim.parserColumnX,event.column[1]);
  assert.deepEqual([sim.parserClock.task,sim.parserClock.scroll],event.clockAfter,`${event.level} row${event.frame} clock`);
  assert.equal(sim.slotSub[event.slot],event.after.sub);assert.deepEqual(sim.slotVertical[event.slot],{speed:event.after.speed,force:event.after.force,fraction:event.after.fraction});
  assert.equal(spring.y-24,event.fixedY);
 }
});

test('a Spring uses reserved slot5 when all five ordinary slots are full, as FindEmptyEnemySlot returns',()=>{
 const {sim,spring}=fixture(608);for(let slot=0;slot<5;slot++)sim.enemies.push({...sim.makeEnemy({kind:'goomba',x:0,y:208}),active:true,enemySlot:slot});
 sim.specialSlot5.flag=1;sim.specialSlot5.id=46;sim.createNativeSpring(spring);
 assert.equal(sim.springSlots.get(spring),5);assert.equal(sim.specialSlot5.flag,2);assert.equal(sim.specialSlot5.id,50);assert.equal(sim.specialSlot5.y,176);
});

test('all native normal Spring erasures use the post-scroll left bound and retain their slot bytes',()=>{
 assert.equal(events.erasures.length,7);
 for(const event of events.erasures){
  const {sim,spring}=fixture(event.before.x,event.before.y);sim.camera=event.camera;sim.springSlots.set(spring,event.slot);sim.slotSub[event.slot]=event.before.sub;
  sim.slotVertical[event.slot]={speed:event.before.speed,force:event.before.force,fraction:event.before.fraction};sim.releaseNativeSprings();
  assert.equal(sim.springSlots.has(spring),false,`${event.level} row${event.frame}`);assert.equal(sim.slotSub[event.slot],event.after.sub);
  assert.deepEqual(sim.slotVertical[event.slot],{speed:event.after.speed,force:event.after.force,fraction:event.after.fraction});
 }
});
