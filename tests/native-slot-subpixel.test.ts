import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {EnemySpec} from '../src/types.js';

// Native walker sub-pixel byte (RAM 0x401+slot) is inherited from the slot's last occupant (evidence/slots-findings-20261111.md, route slot probe).
function fixture(levelId:string,specs:EnemySpec[],camera:number){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!),area=level.areas.find(a=>a.id===level.main)!;
 area.enemies=specs;area.cannons=[];area.generators=[];area.firebars=[];area.platforms=[];
 const sim:any=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;sim.loadArea(area.id,[camera+112,208],camera);sim.phase='play';sim.phaseFrame=0;
 return sim;
}
const specAt=(sim:any,kind:string,x:number)=>sim.enemies.find((e:any)=>e.kind===kind&&e.originX===x);

test('1-1 route row 644: the Koopa at 1712 takes slot 1 with byte 128 left by the Goomba removed there, so it starts at 1712.5 (row 701 x 1684, not 1683)',()=>{
 const sim=fixture('1-1',[{kind:'koopa',x:1712,y:208,direction:-1,spawnCamera:1413}],1413);
 sim.slotSub=[0,128,0,0,0];sim.enemies.push({...sim.makeEnemy({kind:'goomba',x:1500,y:208,direction:-1}),active:true,enemySlot:0,dead:0});
 sim.step([],1);
 const koopa=specAt(sim,'koopa',1712);assert.equal(koopa.enemySlot,1);assert.equal(koopa.x%1,0); // 1712.5 after its first 0.5 px step (without the byte: 1711.5)
});

test('route row 304 (1-1 group 818/841): the leader keeps the inherited byte, the follower has stepped once (byte xor 128)',()=>{
 const sim=fixture('1-1',[{kind:'goomba',x:818,y:208,direction:-1,spawnCamera:563},{kind:'goomba',x:841,y:208,direction:-1,spawnCamera:563}],563);
 sim.slotSub=[0,0,0,0,0];sim.step([],1);
 assert.equal(specAt(sim,'goomba',841).x-specAt(sim,'goomba',818).x,23.5); // native spawn row: 818.0 and 841.5
});

test('route row 389: a walker the remake dropped is removed natively on the row its stepped x - camera < -74, leaving that stepped byte',()=>{
 const sim=fixture('1-1',[],700);
 const g={...sim.makeEnemy({kind:'goomba',x:700,y:208,direction:-1}),active:true,enemySlot:1,dead:100,vx:-0.5};sim.enemies.push(g);
 sim.camera=773;sim.releaseNativeSlots();assert.equal(g.slotFreed,undefined); // 699 - 773 = -74: kept (last row x - camera -73 natively)
 sim.camera=774;sim.releaseNativeSlots();assert.equal(g.slotFreed,true);assert.equal(sim.slotSub[1],128); // stepped x 699.5: byte 128
});

test('a stomped walker leaves its own frozen byte; a Piranha leaves the byte it inherited',()=>{
 const sim=fixture('1-1',[],700);
 const g={...sim.makeEnemy({kind:'goomba',x:900.5,y:208,direction:-1}),active:true,enemySlot:2,dead:22,squashed:true};
 const p={...sim.makeEnemy({kind:'piranha',x:600,y:184,direction:-1}),active:true,enemySlot:3,dead:0};
 sim.enemies.push(g,p);sim.slotSub=[0,0,0,77,0];sim.releaseNativeSlots();
 assert.equal(sim.slotSub[2],128);assert.equal(p.slotFreed,true);assert.equal(sim.slotSub[3],77);
});

test('every area load clears the slot bytes (route: 1-2 row 1976 [128,128,0,0,128] -> zeros; pipe load 1-2 row 3854)',()=>{
 const sim=fixture('1-1',[],700);sim.slotSub=[128,128,0,0,128];
 sim.loadArea(sim.area.id,[812,208],700);assert.deepEqual(sim.slotSub,[0,0,0,0,0]);
});

test('a group made on a still camera keeps the inherited byte for its followers (1-2 row 2500, 8-4 row 76099)',()=>{
 const sim=fixture('1-1',[{kind:'goomba',x:818,y:208,direction:-1,spawnCamera:563},{kind:'goomba',x:841,y:208,direction:-1,spawnCamera:563}],563);
 sim.slotCamera=563;sim.step([],1);
 assert.equal(specAt(sim,'goomba',841).x-specAt(sim,'goomba',818).x,23);
});
