import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import fixture from './fixtures/native-enemy-animation.json';

test('ordinary live enemy animation chooses native graphics from FrameCounter, independent of spawn age',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 assert.ok(fixture.checked>50000);
 for(const observed of fixture.cases)for(const [frame,counter,t0,t1,t2,t3,t4,t5,priorX,priorY,camera,oamX,oamY] of observed.rows){
  const tiles:number[]=[],positions:{x:number,y:number}[]=[];renderer.spriteTile=(tile:number,x:number,y:number)=>{tiles.push(tile);positions.push({x,y});};
  renderer.enemy({kind:observed.kind,x:priorX+5,y:priorY+5,graphicsX:priorX,graphicsY:priorY,age:1,dead:0,vx:-0.5,shell:false},{camera,player:{x:0},level:{id:'fixture'},area:{id:'main'},random:{frame:counter}});
  const nativeTiles=[t0,t1,t2,t3,t4,t5];
  assert.deepEqual(tiles.sort((a,b)=>a-b),nativeTiles.sort((a,b)=>a-b),`${observed.level} native frame ${frame} ${observed.kind}`);
  assert.equal(Math.min(...positions.map(p=>p.x)),oamX,`${observed.level} native frame ${frame}: sprite x before movement`);
  assert.equal(positions[2].y,oamY+1,`${observed.level} native frame ${frame}: sprite y before movement`);
 }
});
