import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeStartupPicture} from '../src/native-startup-picture.js';
import fixture from './fixtures/native-startup-picture.json';
test('source startup palette packets and screen enable reproduce every next native PPU picture',()=>{
 const picture=new NativeStartupPicture();
 for(const event of fixture.events){picture.step(event.state);assert.deepEqual({rendering:picture.rendering,backdrop:picture.backdrop},event.nextPicture,`native source row ${event.frame}, next PPU picture ${event.frame+1}`);}
 picture.reset();assert.deepEqual([picture.backdrop,picture.rendering],[0,false]);
});
