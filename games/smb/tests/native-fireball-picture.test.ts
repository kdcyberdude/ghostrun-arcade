import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeFireballPhase} from '../src/native-fireball-picture.js';
import {GameRenderer} from '../src/renderer.js';
import sprites from '../assets/graphics/special/index.json';
import fixture from './fixtures/native-fireball-picture.json';

test('DrawFirebar tile and flips match native OAM at every FrameCounter value, including death',()=>{
 assert.ok(fixture.checked>100000);assert.equal(fixture.cases.length,256);
 for(const row of fixture.cases){
  const descriptor=sprites.records.find(r=>r.file===`sprite-fireball_or_firebar-${nativeFireballPhase(row.counter)}.png`)!.descriptor.sprites[0];
  assert.equal(descriptor.tile,row.tile,`${row.level} row${row.frame}`);
  assert.equal(descriptor.attributes,row.attributes,`${row.level} row${row.frame}`);
 }
});

test('fireball drawing follows native FrameCounter after resets rather than the global frame',()=>{
 const renderer=Object.create(GameRenderer.prototype) as any;
 for(const row of fixture.cases){
  let picture='';renderer.special=(name:string)=>{picture=name;};
  renderer.item({kind:'fireball',x:50,y:100,age:0,life:10},{camera:0,frame:0,random:{frame:row.counter}});
  assert.equal(picture,`fireball_or_firebar-${nativeFireballPhase(row.counter)}`);
 }
});
