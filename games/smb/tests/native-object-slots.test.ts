import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {EnemySpec} from '../src/types.js';

// Native objects live in five slots (docs/NATIVE_ROLES.md). Over the route and the 96 all-worlds model runs a group came up short 12 times, always with all five slots taken, and never with one free.
function fixture(levelId:string,specs:EnemySpec[],camera:number){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!),area=level.areas.find(a=>a.id===level.main)!;
 area.enemies=specs;area.cannons=[];area.generators=[];area.firebars=[];area.platforms=[];
 const sim:any=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;sim.loadArea(area.id,[camera+112,208],camera);sim.phase='play';sim.phaseFrame=0;
 return sim;
}
const goomba=(x:number,extra:Partial<EnemySpec>={}):EnemySpec=>({kind:'goomba',x,y:208,direction:-1,...extra});
const specAt=(sim:any,kind:string,x:number)=>sim.enemies.find((e:any)=>e.kind===kind&&e.originX===x);

test('1-1 group at 2048: the second member needs a free slot (route row 796: one free; model row 811: two free)',()=>{
 const follower=goomba(2072,{spawnCamera:1793,nativeSlot:'once'}),leader=goomba(2048,{spawnCamera:1793});
 const others=[1950,1970,1990,2010].map(x=>goomba(x,{spawnCamera:1700}));
 const route=fixture('1-1',[...others,leader,follower],1793);route.step([],1);
 assert.equal(specAt(route,'goomba',2048).active,true);assert.equal(specAt(route,'goomba',2072).active,false);
 const model=fixture('1-1',[...others.slice(1),leader,follower],1793);model.step([],1);
 assert.equal(specAt(model,'goomba',2072).active,true);
});

test('8-1 plant at 2248 is lost with five Koopas in the slots (route) and built with one slot free (model row 1129)',()=>{
 const plant:EnemySpec={kind:'piranha',x:2248,y:184,direction:-1},koopa=(x:number):EnemySpec=>({kind:'koopa',x,y:208,direction:-1,spawnCamera:1800});
 const full=fixture('8-1',[...[1896,1957,1981,2067,2092].map(koopa),plant],1893);full.step([],1);
 assert.equal(specAt(full,'piranha',2248).slotLost,true);
 const free=fixture('8-1',[...[1896,1957,1981,2067].map(koopa),plant],1893);free.step([],1);
 assert.equal(specAt(free,'piranha',2248).slotHeld,true);
});

test('a lone list object waits off screen for a slot and is lost once on screen',()=>{
 const others=[540,560,580,600,620].map(x=>goomba(x,{spawnCamera:300})),para:EnemySpec={kind:'paratroopa',x:688,y:208,direction:-1,spawnCamera:385,nativeSlot:'wait'};
 const sim=fixture('6-2',[...others,para],385);sim.step([],1);
 const e=specAt(sim,'paratroopa',688);assert.equal(e.active,false);assert.equal(e.slotLost,undefined);
 sim.camera=440;sim.step([],1);assert.equal(e.slotLost,true);
});

test('a squashed Goomba frees its slot after the native minimum of 22 rows (3-1 plant at 1656, route row 21478)',()=>{
 const others=[1440,1460,1480,1500].map(x=>goomba(x,{spawnCamera:1250})),squashed=goomba(1327,{spawnCamera:1250}),plant:EnemySpec={kind:'piranha',x:1656,y:184,direction:-1};
 const sim=fixture('3-1',[...others,squashed,plant],1300);
 const s=specAt(sim,'goomba',1327);s.active=true;s.squashed=true;s.dead=30;sim.step([],1);
 assert.equal(specAt(sim,'piranha',1656).slotHeld,true);
});

test('native inventory: objects the route never had room for exist; a Koopa born of a stomp does not',()=>{
 const enemies=(id:string)=>{const l=observedLevels().find(l=>l.id===id)!;return l.areas.find(a=>a.id===l.main)!.enemies;};
 for(const [id,kind,x,y] of [['1-1','goomba',2072,208],['5-1','goomba',504,208],['5-1','goomba',528,208],['8-1','goomba',524,208],['8-1','piranha',2248,184],['2-1','piranha',1192,168],['6-2','paratroopa',688,208]] as const)
  assert.ok(enemies(id).some(e=>e.kind===kind&&e.x===x&&e.y===y),`${id} ${kind} ${x}`);
 assert.equal(enemies('3-1').some(e=>e.kind==='koopa'&&e.x===419),false); // route row 21011: slot 1 turns id 14 -> id 0 in place
 assert.equal(enemies('5-1').some(e=>e.kind==='koopa'&&e.x===2897),false);
});

test('a respawn camera past a slot-gated walker (x <= camera - 32): it is never made, so it holds no slot and the plant ahead is built (native 3-1 f1298: 13@1656 alone at camera 1536)',()=>{
 const behind=[1336,1360,1400,1450,1500].map(x=>goomba(x,{nativeSlot:'once'}));
 const sim=fixture('3-1',[...behind,{kind:'piranha',x:1656,y:184,direction:-1}],1536);sim.step([],1);
 assert.equal(specAt(sim,'piranha',1656).slotLost,undefined);assert.equal(specAt(sim,'piranha',1656).slotHeld,true);
 assert.equal(specAt(sim,'goomba',1336).slotHeld,undefined);
});
