import {test} from 'node:test';import assert from 'node:assert/strict';import {nativeScreenPicture} from '../src/native-screen-picture.js';import data from './fixtures/native-screen-pictures.json';
test('source screen palette writes reproduce actual universal-color PPU pictures',()=>{
 assert.ok(data.checked>1000);
 for(const e of data.events){const p=nativeScreenPicture(e.n,e.water);assert.equal(p.message,undefined,`${e.level}:${e.frame} uniform picture has no text`);
  if(p.backdrop==='retained'){assert.ok([0x22,0x0f].includes(e.color));continue;}
  const color=p.backdrop==='black'?0x0f:p.backdrop==='water-palette'?0x22:[0x22,0x22,0x0f,0x0f,0x0f,0x22,0x0f,0x0f][e.background||e.areaType];assert.equal(color,e.color,`${e.level}:${e.frame} ${p.backdrop}`);
 }
});

test('source intermediate captions and Mario removal agree with the next actual PPU picture',()=>{
 assert.ok(data.messages.length>20);for(const e of data.messages){const p=nativeScreenPicture(e.n,e.water);assert.equal(p.avatar,e.avatar>0,`${e.level}:${e.frame} intermediate sprite`);assert.equal(p.message==='lives',e.lives>0,`${e.level}:${e.frame} lives caption`);assert.equal(p.message==='time-up',e.timeUp>0,`${e.level}:${e.frame} time-up caption`);}
});
