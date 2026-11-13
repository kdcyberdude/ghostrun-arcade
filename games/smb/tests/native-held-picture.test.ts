import {test}from'node:test';import assert from'node:assert/strict';
import {GameRenderer}from'../src/renderer.js';import{enemyRenderPicture}from'../src/enemy-picture.js';import{itemShown}from'../src/view-rules.js';import type{Enemy,Item}from'../src/types.js';
import fixture from'./fixtures/native-held-picture.json';
test('frozen EnemyGfxHandler redraws retained post-move coordinates after preserving the actual injury-row picture',()=>{
 const renderer=Object.create(GameRenderer.prototype)as any;
 for(const e of fixture.events.filter(e=>e.kind==='enemy')){
  const enemy=e.enemy as Enemy,before=JSON.stringify(enemy),sprites:unknown[]=[];
  renderer.spriteTile=(tile:number,x:number,y:number,_palette:string,flipX=false,flipY=false)=>sprites.push({tile,x,y,flipX,flipY});
  renderer.enemy(enemy,{frame:e.globalFrame,nativeTimersStopped:e.stopped,random:{frame:e.counter},camera:e.camera,area:{id:'main'},level:{id:'1-1'}});
  assert.deepEqual(sprites.sort((a:any,b:any)=>a.y-b.y||a.x-b.x),[...e.oam!].sort((a,b)=>a.y-b.y||a.x-b.x),`${e.source} PPU frame ${e.frame}`);assert.equal(JSON.stringify(enemy),before,'picture selection cannot change simulation state');
  if(enemy.graphicsFrame!==e.globalFrame)assert.equal(enemyRenderPicture(enemy,e.globalFrame,true).graphicsX,enemy.x);
 }
});
test('MiscObjectsCore state zero does not draw a stale coin during TimerControl hold',()=>{
 for(const e of fixture.events.filter(e=>e.kind==='coin')){assert.equal(e.nativeState,0);assert.equal(e.item?.nativeCoin?.state,0);assert.equal(itemShown(e.item as Item),false);}
});
