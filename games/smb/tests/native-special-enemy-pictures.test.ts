import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import fixture from './fixtures/native-special-enemy-pictures.json';

test('native Blooper and Lakitu pictures use interval/frenzy timers and pre-movement coordinates',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(fixture.checked>8000);
 for(const observed of fixture.cases)for(const [frame,counter,timer,t0,t1,t2,t3,t4,t5,x,y,camera,oamX,oamY]of observed.rows){
  const tiles:number[]=[],positions:{x:number;y:number}[]=[];
  renderer.spriteTile=(tile:number,x:number,y:number)=>{tiles.push(tile);positions.push({x,y});};
  renderer.enemy({kind:observed.kind,x,y,age:1,dead:0,vx:-0.5,graphicsFrenzyTimer:timer,bloop:observed.kind==='blooper'?{timer}:undefined},{camera,level:{id:'fixture'},area:{id:'main'},random:{frame:counter}});
  assert.deepEqual(tiles.sort((a,b)=>a-b),[t0,t1,t2,t3,t4,t5].sort((a,b)=>a-b),`${observed.level} native frame ${frame}: ${observed.kind}`);
  assert.equal(Math.min(...positions.map(p=>p.x)),oamX);
  assert.equal(positions[2].y,oamY+1);
 }
});

test('querying the lowest slot for graphics never allocates enemy or platform slots',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 sim.enemies=sim.enemies.slice(0,2);for(const e of sim.enemies){e.active=true;delete e.enemySlot;}
 const motor=structuredClone(sim.platformMotion);
 const platforms=[...sim.platformSlots],query=sim.freeNativeSlot(false,true);
 assert.ok(sim.enemies.every((e:any)=>e.enemySlot===undefined));assert.deepEqual([...sim.platformSlots],platforms);assert.deepEqual(structuredClone(sim.platformMotion),motor);
 assert.equal(sim.freeNativeSlot(),query,'the read-only query predicts the actual allocator');
});
