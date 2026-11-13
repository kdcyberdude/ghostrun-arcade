import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeStartupPicture} from '../src/native-startup-picture.js';
import fixture from './fixtures/native-startup-picture.json';
test('source startup palette packets and screen enable reproduce every next native PPU picture',()=>{
 const picture=new NativeStartupPicture();
 for(const event of fixture.events){picture.step(event.state);assert.deepEqual({rendering:picture.rendering,backdrop:picture.backdrop},event.nextPicture,`native source row ${event.frame}, next PPU picture ${event.frame+1}`);}
 picture.reset();assert.deepEqual([picture.backdrop,picture.rendering],[0,false]);
});
test('only universal palette writes change the blanked PPU backdrop',()=>{
 const picture=new NativeStartupPicture(),n={mode:0,task:1,engine:0,screen:2,disable:1,initializing:false,queuedPalette:[{address:0x3f10,bytes:[15,22,39,24]}]};
 picture.step(n);assert.equal(picture.backdrop,15);assert.equal(picture.rendering,false);
 picture.step({...n,queuedPalette:[{address:0x3f11,bytes:[34]}]});assert.equal(picture.backdrop,15);
 picture.step({...n,queuedPalette:[{address:0x3f00,bytes:[34]}]});assert.equal(picture.backdrop,34);
 picture.step({...n,task:3,disable:0,queuedPalette:[]});assert.equal(picture.rendering,true);assert.equal(picture.player,false);
 picture.step({...n,task:3,disable:0,engine:7,queuedPalette:[]});assert.equal(picture.player,true);
});

import handoff from './fixtures/native-startup-handoff-picture.json';
import {nativeStartupTitleShown} from '../src/native-startup-picture.js';
test('all seven native Start prefixes retain title nametable ownership while clearing player OAM before InitializeArea blanks',()=>{
 assert.equal(handoff.cases.length,7);
 for(const c of handoff.cases){
  const picture=new NativeStartupPicture();
  for(const event of c.events){
   picture.step(event.state);const shown=nativeStartupTitleShown(picture,event.state.mode===0?'title':'intro',event.state);
   assert.equal(shown,event.nextTitleShown,`${c.name} source ${event.frame} next PPU title`);
   assert.equal(shown&&picture.player,event.nextTitlePlayerShown,`${c.name} source ${event.frame} next PPU Mario`);
  }
 }
});
