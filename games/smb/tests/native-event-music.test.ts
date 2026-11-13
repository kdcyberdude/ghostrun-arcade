import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyNativeEndLevelMusic,seedNativeEndLevelMusic,tickNativeEndLevelMusic} from '../src/native-event-music.js';
import fixture from './fixtures/native-end-level-music.json';
import musicData from '../data/native-end-level-music.json';

test('source square2 clock matches every native end-level music row across32 retained and336 mood captures',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.rows,300625);assert.deepEqual(fixture.diagnostics,[]);
 assert.equal(fixture.transitions.reduce((n,e)=>n+e.count,0),fixture.rows);
 for(const e of fixture.transitions){const s={...e.before};tickNativeEndLevelMusic(s,e.input);assert.deepEqual(s,e.after,JSON.stringify(e.examples));}
});

test('ROM note stream ends on the native terminator for every complete recording sequence',()=>{
 assert.equal(fixture.sequences.length,925);
 for(const e of fixture.sequences){
  assert.equal(e.startIncluded,true);assert.equal(e.queue,0);assert.equal(e.afterBuffer,0);
  const s=emptyNativeEndLevelMusic();tickNativeEndLevelMusic(s,{eventQueue:32});
  const rows=e.end-e.start!;
  for(let i=1;i<=rows;i++){assert.equal(s.eventMusicBuffer,32,`${e.id} premature end ${i}`);tickNativeEndLevelMusic(s);}
  assert.deepEqual(s,{eventMusicBuffer:0,counter:0,length:36,offset:33},`${e.id} end row${e.end}`);
 }
});

test('music header restart, native pause/title gates and entrance RAM seed preserve clock phase',()=>{
 const r=new Uint8Array(2048);r[0x7b1]=32;r[0x7b4]=7;r[0x7b3]=8;r[0xf7]=2;
 const s=seedNativeEndLevelMusic(r),before={...s};
 for(const input of [{operMode:0},{pauseMode:1},{pauseQueue:1}]){tickNativeEndLevelMusic(s,input);assert.deepEqual(s,before);}
 tickNativeEndLevelMusic(s,{eventQueue:32});assert.deepEqual(s,{eventMusicBuffer:32,counter:8,length:8,offset:2});
 tickNativeEndLevelMusic(s,{areaQueue:1});assert.equal(s.eventMusicBuffer,0);
});

test('native Silence event clears the event buffer immediately without starting another note stream',()=>{
 assert.equal(musicData.silence.headerAddress,0xf958);assert.deepEqual(musicData.silence.notes,[0]);
 const s={eventMusicBuffer:32,counter:5,length:8,offset:2};tickNativeEndLevelMusic(s,{eventQueue:128});assert.deepEqual(s,{eventMusicBuffer:0,counter:0,length:8,offset:1});
 tickNativeEndLevelMusic(s,{areaQueue:128});assert.deepEqual(s,{eventMusicBuffer:0,counter:0,length:8,offset:1});
});
