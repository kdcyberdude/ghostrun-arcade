import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {FirebarSlots} from '../src/firebar-slots.js';import data from './fixtures/native-victory-kill-bank.json';
for(const event of data.events)test(`${event.level}: native KillAllEnemies releases held platform slots and retains movement-byte residue`,()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id===event.level)!]);sim.reset(true);const platform=sim.area.platforms[0];assert.ok(platform);
 const slot=event.before.ids.findIndex(id=>id===40);assert.ok(slot>=0);sim.platformSlots.set(platform,slot);
 sim.enemies=event.before.flags.flatMap((flag,enemySlot)=>flag&&event.before.ids[enemySlot]!==40?[{kind:'podoboo',active:true,dead:0,enemySlot}]:[]);
 sim.slotYSpeed=[...event.before.speed];sim.slotSub=[...event.before.xFraction];sim.slotYFraction=[...event.before.yFraction];
 sim.clearVictoryEnemyBank();assert.equal(sim.platformSlots.size,0);assert.equal(sim.platformMotion.lost.has(platform),true);assert.equal(sim.enemies.length,0);
 assert.deepEqual(sim.slotYSpeed,event.after.speed);assert.deepEqual(sim.slotSub,event.after.xFraction);assert.deepEqual(sim.slotYFraction,event.after.yFraction);
 assert.deepEqual(event.after.flags,[0,0,0,0,0]);assert.deepEqual(event.after.ids,[0,0,0,0,0]);
});
test('native erase clears controller/firebar/vine occupancy while preserving slot5 and source byte lists',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='1-4')!]);sim.reset(true);sim.area.platforms=[];
 const bar={x:100,y:100,length:6,speed:1};sim.firebarSlots=new FirebarSlots([bar]);sim.firebarSlots.step(0);assert.equal(sim.firebarSlots.held().size,1);
 sim.frenzyControllers=[{id:23,offset:0,column:0,y:0,hardOnly:false,slot:1}];sim.specialSlot5.vineSlots=[5,2];sim.specialSlot5.flag=1;sim.specialSlot5.id=46;sim.specialSlot5.frenzyBuffer=21;
 sim.enemies=[{active:true,dead:0,enemySlot:5,kind:'bullet'}];sim.items=[{kind:'flame',nativeFlame:{slot:3},life:Infinity},{kind:'hammer',life:Infinity},{kind:'flame',nativeFlame:{slot:5},life:Infinity}];
 sim.clearVictoryEnemyBank();assert.equal(sim.firebarSlots.held().size,0);assert.equal(sim.frenzyControllers[0].slot,undefined);assert.equal(sim.frenzyControllers[0].lost,true);
 assert.deepEqual(sim.specialSlot5.vineSlots,[5,2]);assert.equal(sim.specialSlot5.flag,1);assert.equal(sim.specialSlot5.id,46);assert.equal(sim.specialSlot5.frenzyBuffer,0);
 assert.deepEqual([...sim.objectSlots(new Set([5]))],[5]);assert.equal(sim.enemies[0].enemySlot,5);assert.deepEqual(sim.items.map((i:any)=>i.kind),['hammer','flame']);
});


test('native enemy-bank erase retains a slot5 Spring and clears ordinary Spring flags',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='1-4')!]);sim.reset(true);const ordinary={x:100,y:200},reserved={x:200,y:200};
 sim.springSlots=new Map([[ordinary,0],[reserved,5]]);sim.springTimers=new Map([[ordinary,{timer:3}],[reserved,{timer:4}]]);Object.assign(sim.specialSlot5,{flag:1,id:50,x:200,y:176});
 sim.clearVictoryEnemyBank();assert.deepEqual([...sim.springSlots],[[reserved,5]]);assert.deepEqual([...sim.springTimers],[[reserved,{timer:4}]]);assert.equal(sim.specialSlot5.flag,1);assert.equal(sim.specialSlot5.id,50);
});
