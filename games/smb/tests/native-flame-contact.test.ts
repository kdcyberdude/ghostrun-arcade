import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFlameHit} from '../src/native-flame-contact.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('native 2-4 flame contact uses the small box and skips odd FrameCounter rows',()=>{
 const rows=[[74,1474,97,1483,false],[75,1475,101,1481,false],[76,1477,105,1480,true]] as const;
 for(const [counter,x,y,flameX,hit] of rows)assert.equal(nativeFlameHit({x:flameX,y:128},{x,y:y+32,size:0,duck:false},counter),hit);
});
test('native flame contact uses inclusive box edges and rejects offscreen player pages',()=>{
 const flame={x:100,y:100},p={x:93,y:104,size:0,duck:false};
 assert.equal(nativeFlameHit(flame,p,0),true);
 assert.equal(nativeFlameHit(flame,{...p,x:92},0),false);
 assert.equal(nativeFlameHit(flame,{...p,y:240},0),false);
 assert.equal(nativeFlameHit(flame,{...p,y:20},0),false);
});
test('live offscreen pit movement cannot touch a normal enemy on a different native y page',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-4')!);level.id='fixture';
 const sim:any=new Simulation([level]);sim.reset(true);
 sim.enemies=[sim.makeEnemy({kind:'goomba',x:sim.player.x,y:423,evidence:'CheckPlayerVertical fixture'})];
 Object.assign(sim.enemies[0],{active:true,enemySlot:0});Object.assign(sim.player,{y:423,vy:0,size:0,grounded:false});
 sim.updateEnemies(423);assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);
});

test('offscreen Piranha erase preserves native aliased angle state before freeing its slot (4-4 row328)',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='4-4')!]);sim.reset(true);sim.camera=666;
 const e=sim.makeEnemy({kind:'piranha',x:648,y:184,evidence:'Native 4-4 slot0 row328'});
 Object.assign(e,{active:true,enemySlot:0,pir:{y:157,speed:1,flag:1,up:136,down:160,timer:0}});sim.enemies=[e];
 sim.eraseOffscreenEnemies();assert.equal(e.slotFreed,true);
 assert.deepEqual([sim.slotYSpeed[0],sim.slotYFraction[0]],[1,136]);
});
