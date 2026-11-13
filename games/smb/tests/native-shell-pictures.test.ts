import {test} from 'node:test';import assert from 'node:assert/strict';import {GameRenderer} from '../src/renderer.js';import data from './fixtures/native-shell-pictures.json';
test('native shell pictures stay still until the revival interval reaches four',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(data.checked>1000);
 for(const row of data.rows){const [level,frame,id,counter,timer,state,x,y,camera,...raw]=row as [string,number,number,number,number,number,number,number,number,...number[]];const tiles:unknown[][]=[];renderer.spriteTile=(tile:number,x:number,y:number,palette:string,flipX=false,flipY=false)=>{if(tile!==252)tiles.push([tile,x,y,flipX,flipY]);};const expected=Array.from({length:4},(_,k)=>{const [tile,x,y,attr]=raw.slice(k*4,k*4+4);return [tile,x,y+1,Boolean(attr&64),Boolean(attr&128)];});
  renderer.enemy({kind:id===2?'beetle':'koopa',x,y,age:11,dead:0,shell:true,movingShell:Boolean(state&0x80),shellTimer:timer,vx:0},{frame:0,camera,level:{id:level},area:{id:'main'},random:{frame:counter}});
  assert.deepEqual(tiles.sort(),expected.sort(),`${level} frame${frame} interval${timer}`);
 }
});
