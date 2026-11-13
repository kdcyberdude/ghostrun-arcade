import {test} from 'node:test';import assert from 'node:assert/strict';import {GameRenderer} from '../src/renderer.js';import data from './fixtures/native-hbro-defeat-pictures.json';
test('defeated Hammer Bros immediately flip vertically and retain native moving direction',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(data.checked>500);
 for(const e of data.rows){const actual:number[][]=[];renderer.spriteTile=(tile:number,x:number,y:number,_palette:string,flipX:boolean,flipY:boolean)=>actual.push([tile,x,y,1|(flipX?64:0)|(flipY?128:0)]);renderer.enemy({kind:'hammerBro',x:e.x,y:e.feetY,dead:1,age:1,vx:0,nativeDir:e.direction===2?-1:1,hbro:{state:e.state}},{level:{id:'fixture'},area:{id:'main',palette:0},camera:e.camera,frame:e.frame,random:{frame:0},nativeTimersStopped:false});const sorted=(rows:number[][])=>rows.sort((a,b)=>a[2]-b[2]||a[1]-b[1]);assert.deepEqual(sorted(actual),sorted(e.sprites),`${e.level} native${e.frame} state${e.state}`);}
});
