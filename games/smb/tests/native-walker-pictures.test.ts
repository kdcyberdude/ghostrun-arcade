import {test} from 'node:test';import assert from 'node:assert/strict';import {GameRenderer} from '../src/renderer.js';import data from './fixtures/native-walker-pictures.json';
test('native walker orientation follows MovingDir in every palette',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(data.checked>10000);
 for(const row of data.rows){const [level,frame,id,counter,dir,x,y,camera,...raw]=row as [string,number,number,number,number,number,number,number,...number[]];
  for(const palette of ['0f-1a-30-27','0f-1c-36-17','0f-0f-36-17','0f-16-30-27']){
   const actual:unknown[][]=[];renderer.spriteTile=(tile:number,x:number,y:number,palette:string,flipX=false,flipY=false)=>{if(tile!==252)actual.push([tile,x,y,flipX,flipY]);};
   renderer.enemy({kind:id>=14?'paratroopa':id===2?'beetle':id===1?'redKoopa':'koopa',paratroopaMotion:id===15?'vertical':id===16?'horizontal':'bounce',x,y,age:0,dead:0,palette,vx:dir===2?-0.5:0.5,graphicsFacing:dir===2?-1:1},{frame:0,camera,level:{id:level},area:{id:'main'},random:{frame:counter}});
   const expected=Array.from({length:6},(_,k)=>{const [tile,x,y,attr]=raw.slice(k*4,k*4+4);return [tile,x,y+1,Boolean(attr&64),Boolean(attr&128)];});
   assert.deepEqual(actual.sort(),expected.filter(t=>t[0]!==252).sort(),`${level} frame${frame} direction${dir} palette${palette}`);
  }
 }
});
