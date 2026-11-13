import {test} from 'node:test';import assert from 'node:assert/strict';
import {nativeGoombaBlockStun} from '../src/native-block-enemy.js';import {nativeImposeGravity} from '../src/simulation.js';import fixture from './fixtures/native-block-enemy.json';
test('Goomba temporary-block stun matches496 actual PRG0 procedure calls, including low-Y and page-difference wrap',()=>{
 assert.equal(fixture.controlled.length,496);
 for(const [index,row]of fixture.controlled.entries()){
  const n={...row.before},points=nativeGoombaBlockStun(n,row.enemyX,row.marioX);
  assert.deepEqual(n,row.after,`native procedure ${index}`);assert.equal(points,100);
  assert.equal(row.pageAfter,row.pageBefore,'DEC does not borrow from Y high');assert.deepEqual(row.floatey,[1,48],'two writes leave one control1 award');
 }
});
test('the six natural World1-1 bumps stun before MoveDefeatedEnemy, preserving force/fraction and emitting one100-point control',()=>{
 assert.equal(fixture.natural.length,6);
 for(const row of fixture.natural){
  const n={...row.before};assert.equal(nativeGoombaBlockStun(n,row.enemyX,row.marioX),100);
  const vertical={y:n.y,speed:n.speed,force:n.force,fraction:n.fraction,timer:0};nativeImposeGravity(vertical,0x3d,3);
  Object.assign(n,{y:vertical.y,speed:vertical.speed,force:vertical.force,fraction:vertical.fraction});
  assert.deepEqual(n,row.after,`${row.sha256.slice(0,8)} source${row.frame}`);
  assert.equal(row.xAfter,(row.enemyX+((n.xSpeed<<24)>>24)/16)&65535);assert.equal(row.xFractionAfter,row.xFraction);
  assert.deepEqual(row.floatey,[1,47],'one native control1 after its same-row timer decrement');
 }
});
