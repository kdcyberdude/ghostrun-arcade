import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameRenderer} from '../src/renderer.js';
import events from './fixtures/native-goomba-animation.json';

test('Goomba OAM mirrors both sprite rows from native FrameCounter and pre-collision direction',()=>{
 assert.ok(events.checked>10000);
 const renderer=Object.create(GameRenderer.prototype) as any;
 for(const level of events.levels)for(const [frame,counter,direction,left,la,right,ra,priorX,priorY,camera,oamX,oamY] of level.rows){
  const tiles:{id:number,x:number,y:number,flip:boolean}[]=[];
  renderer.spriteTile=(id:number,x:number,y:number,_palette:string,flip:boolean)=>tiles.push({id,x,y,flip});
  renderer.enemy({kind:'goomba',x:priorX+5,y:priorY+5,graphicsX:priorX,graphicsY:priorY,age:1,dead:0,vx:direction===2?-0.5:0.5,graphicsFacing:direction===2?-1:1},{camera,level:{id:'fixture'},area:{id:'main'},random:{frame:counter}});
  const row=tiles.filter(t=>t.y===oamY+1).sort((a,b)=>a.x-b.x);
  assert.equal(row[0]?.x,oamX,`${level.level} native frame ${frame}: pre-movement graphics position`);
  assert.deepEqual(row.map(t=>[t.id,t.flip]),[[left,Boolean(la&64)],[right,Boolean(ra&64)]],`${level.level} native frame ${frame}`);
 }
});
