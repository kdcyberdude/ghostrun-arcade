import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeEnemiesCollision,nativeUnwingedStomp} from '../src/enemy-collision.js';
import events from './fixtures/native-walker-events.json';

test('native enemy contact bits match every supported contact transition of all 32 v2 traces',()=>{
 assert.ok(events.contacts.length>=60);
 for(const e of events.contacts){
  const bits=[...e.before];nativeEnemiesCollision(e.bodies,e.camera,e.frame,false,bits);
  assert.deepEqual(bits,e.after,`${e.level} row ${e.row}`);
 }
});

test('EnemiesCollision skips even counter rows and water, and never retriggers an unbroken contact',()=>{
 const bodies=[{slot:0,x:100,y:184,tall:true,turns:true,reacts:true},{slot:2,x:112,y:184,tall:true,turns:true,reacts:true}];
 const bits=[0,0,0,0,0];
 assert.deepEqual(nativeEnemiesCollision(bodies,0,2,false,bits),{before:[],after:[]});
 assert.deepEqual(nativeEnemiesCollision(bodies,0,3,true,bits),{before:[],after:[]});
 assert.deepEqual(nativeEnemiesCollision(bodies,0,3,false,bits),{before:[2],after:[0]});
 assert.equal(bits[0],0x20);
 assert.deepEqual(nativeEnemiesCollision(bodies,0,5,false,bits),{before:[],after:[]});
 bodies[1].x=113;nativeEnemiesCollision(bodies,0,7,false,bits);assert.equal(bits[0],0);
});

test('all native Paratroopa unwinging events hold pre-step y and fraction, reset gravity, then step away',()=>{
 assert.ok(events.unwinged.length>=27);
 for(const e of events.unwinged){
  const actual=nativeUnwingedStomp(e.before.x,e.before.y,e.before.fraction,e.mario);
  const {x,y,fraction,speed,force,vx}=e.after;
  assert.deepEqual(actual,{x,y,fraction,speed,force,vx},`${e.level} row ${e.row}`);
 }
});
