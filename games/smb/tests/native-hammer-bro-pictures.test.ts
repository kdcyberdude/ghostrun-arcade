import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import fixture from './fixtures/native-hammer-bro-pictures.json';

test('native Hammer Bro pictures follow pre-step state/facing and FrameCounter, not a four-cell age cycle',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(fixture.checked>2500);
 for(const level of fixture.levels)for(const [frame,counter,state,direction,t0,t1,t2,t3,t4,t5,flip] of level.rows){
  const tiles:number[]=[],flips:boolean[]=[];
  renderer.spriteTile=(tile:number,_x:number,_y:number,_palette:string,flipX:boolean)=>{tiles.push(tile);flips.push(flipX);};
  renderer.enemy({kind:'hammerBro',x:0,y:24,age:1,dead:0,vx:0.25,nativeDir:direction===2?-1:1,hbro:{state}},{camera:0,player:{x:100},level:{id:'fixture'},area:{id:'main'},random:{frame:counter}});
  assert.deepEqual(tiles.sort((a,b)=>a-b),[t0,t1,t2,t3,t4,t5].sort((a,b)=>a-b),`${level.level} native frame ${frame}: cell`);
  assert.ok(flips.every(f=>f===Boolean(flip)),`${level.level} native frame ${frame}: pre-step facing`);
 }
});
