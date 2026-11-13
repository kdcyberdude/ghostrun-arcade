import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeSpriteShuffle} from '../src/native-sprite-shuffle.js';
import {GameRenderer} from '../src/renderer.js';
import fixture from './fixtures/native-misc-pictures.json';

test('native misc objects draw counter-based coin/hammer poses and floatey200 with byte-wrapped OAM positions',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;assert.ok(fixture.checked>500);assert.ok(fixture.events.some(e=>e.kind==='hammer'&&e.timersStopped));assert.ok(fixture.events.some(e=>e.kind==='hammer'&&e.timerControl&&!e.timersStopped&&e.hurtSlot>=0));
 for(const event of fixture.events){
  const sprites:unknown[]=[];
  renderer.spriteTile=(tile:number,x:number,y:number,_palette:string,flipX=false,flipY=false)=>sprites.push({tile,x,y,flipX,flipY});
  renderer.item({kind:event.kind,x:event.x,y:event.y,age:1,...event.kind==='coin'?{nativeCoin:{state:event.state}}:{nativeHammer:{state:event.state,slot:event.slot,drawFrame:1,drawTimersStopped:event.timersStopped}}},{spriteShuffle:new NativeSpriteShuffle(),camera:event.camera,area:{palette:0},frame:1,nativeTimersStopped:event.timersStopped,random:{frame:event.counter}});
  assert.deepEqual(sprites,event.sprites,`${event.level} native frame ${event.frame} ${event.kind}`);
 }
});
