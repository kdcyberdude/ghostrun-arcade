import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,nativeImposeGravity} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {simEntities} from '../tools/harness/native-entities.js';
import events from './fixtures/native-bullet-defeat-events.json';

test('every native Bullet Bill stomp and defeated frame matches its handler-specific fixed-point gravity',()=>{
 assert.equal(events.filter(e=>e.stomp).length,2);assert.ok(events.length>90);assert.equal(events.filter(e=>e.erased).length,2);
 assert.deepEqual([...new Set(events.map(e=>e.id))].sort((a,b)=>a-b),[8,51]);
 for(const event of events){
  const n={...event.before,timer:0};
  if(event.stomp){n.y-=2;n.speed=0;n.force=0;if(event.id===51)n.x+=event.priorXSpeed/16;}
  if(!event.held&&(!event.stomp||event.id===8)&&(!event.erased||event.id!==8))nativeImposeGravity(n,event.id===8?0x1c:0x3d,3);
  const {timer,...actual}=n;assert.deepEqual(actual,event.after,`${event.level} row${event.frame}`);assert.equal(event.xSpeed,0);
 }
});

test('the legacy entity comparison includes retained defeated Bullet Bills until native erasure',()=>{
 const bullet={kind:'bullet',active:true,dead:1,slotFreed:false,x:1862.5,y:142};
 assert.deepEqual(simEntities({enemies:[bullet]}),[{kind:'bullet',x:1862,y:118}]);
 assert.deepEqual(simEntities({enemies:[{...bullet,dead:100,slotFreed:true}]}),[]);
});


test('an erased Bullet corpse cannot write gravity or erasure into a reused native slot',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.items=[];sim.area.platforms=[];sim.area.firebars=[];sim.area.generators=[];
 const old=sim.makeEnemy({kind:'bullet',x:-100.5,y:282,direction:-1});
 Object.assign(old,{active:true,enemySlot:0,slotFreed:true,dead:100,frenzy:true,pod:{y:282,speed:3,force:56,fraction:212,timer:0}});
 sim.enemies=[old];sim.slotVertical[0]={speed:-1,force:99,fraction:77};sim.slotReleaseFrame[0]=-1;
 sim.updateEnemies(sim.player.y);
 assert.deepEqual(sim.slotVertical[0],{speed:-1,force:99,fraction:77});assert.equal(sim.slotReleaseFrame[0],-1);sim.eraseOffscreenEnemies();assert.equal(old.goneFrame,undefined);
});
