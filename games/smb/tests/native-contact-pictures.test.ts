import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import {captureEnemyPicture,enemyPicture} from '../src/enemy-picture.js';
import type {Enemy} from '../src/types.js';
import fixture from './fixtures/native-contact-pictures.json';

test('a native contact row still draws the enemy before shell conversion, wing removal or death',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 assert.ok(fixture.events.length>20);
 for(const observed of fixture.events){
  const enemy={...observed.before,age:1,dead:0,shell:false} as Enemy;
  captureEnemyPicture(enemy);
  Object.assign(enemy,observed.after,{x:enemy.x+5,y:enemy.y+5});
  const tiles:number[]=[],positions:{x:number,y:number}[]=[];
  renderer.spriteTile=(tile:number,x:number,y:number)=>{tiles.push(tile);positions.push({x,y});};
  renderer.enemy(enemy,{camera:observed.camera,player:{x:0},level:{id:'fixture'},area:{id:'main'},random:{frame:observed.counter}});
  // FloateyNumbersRoutine can reuse the enemy's top OAM row for the score. The two body rows still show the pre-contact enemy.
  const body=tiles.filter((tile,i)=>positions[i].y>=observed.oamY+1&&tile!==252);
  assert.deepEqual(body.sort((a,b)=>a-b),observed.tiles.slice(2).filter(t=>t!==252).sort((a,b)=>a-b),`${observed.level} native frame ${observed.frame}: original body graphics`);
  assert.equal(Math.min(...positions.map(p=>p.x)),observed.oamX);
  assert.equal(positions.filter(p=>p.y===observed.oamY+1).length,2);
  assert.equal(enemyPicture(enemy).kind,observed.before.kind);
  assert.equal(enemy.kind,observed.after.kind,'rendering preserves the new simulation state');
  captureEnemyPicture(enemy);assert.equal(enemyPicture(enemy).kind,observed.after.kind,'next frame draws the converted state');
  assert.equal('graphics' in enemy.graphics!,false,'pictures never retain a chain of previous frames');
 }
});
