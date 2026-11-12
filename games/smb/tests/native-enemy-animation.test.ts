import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import fixture from './fixtures/native-enemy-animation.json';

test('ordinary live enemy animation chooses native graphics from FrameCounter, independent of spawn age',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 assert.ok(fixture.checked>50000);
 for(const observed of fixture.cases)for(const [frame,counter,...nativeTiles] of observed.rows){
  const tiles:number[]=[];renderer.spriteTile=(tile:number)=>tiles.push(tile);
  renderer.enemy({kind:observed.kind,x:0,y:24,age:1,dead:0,vx:-0.5,shell:false},{camera:0,player:{x:0},level:{id:'fixture'},area:{id:'main'},random:{frame:counter}});
  assert.deepEqual(tiles.sort((a,b)=>a-b),nativeTiles.sort((a,b)=>a-b),`${observed.level} native frame ${frame} ${observed.kind}`);
 }
});
