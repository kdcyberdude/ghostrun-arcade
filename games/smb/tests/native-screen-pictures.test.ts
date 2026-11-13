import {test} from 'node:test';import assert from 'node:assert/strict';import {nativeScreenPicture,nativeScreenBackdrop} from '../src/native-screen-picture.js';import data from './fixtures/native-screen-pictures.json';
test('source screen palette writes reproduce actual universal-color PPU pictures',()=>{
 assert.ok(data.checked>1000);
 for(const e of data.events){const p=nativeScreenPicture(e.n,e.water);assert.equal(p.message,undefined,`${e.level}:${e.frame} uniform picture has no text`);
  const areaColor=[0x22,0x22,0x0f,0x0f,0x0f,0x22,0x0f,0x0f][e.background||e.areaType],color=nativeScreenBackdrop(e.previous,p,areaColor);assert.equal(color,e.color,`${e.level}:${e.frame} ${p.backdrop}`);
 }
});

test('source intermediate captions and Mario removal agree with the next actual PPU picture',()=>{
 assert.ok(data.messages.length>20);for(const e of data.messages){const p=nativeScreenPicture(e.n,e.water);assert.equal(p.avatar,e.avatar>0,`${e.level}:${e.frame} intermediate sprite`);assert.equal(p.message==='lives',e.lives>0,`${e.level}:${e.frame} lives caption`);assert.equal(p.message==='time-up',e.timeUp>0,`${e.level}:${e.frame} time-up caption`);}
});

import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import replay from './fixtures/native-palette-entry.json';
test('the retained PPU backdrop advances in logical steps without any renderer calls',()=>{
 const names:Button[]=['a','b','select','start','up','down','left','right'];
 const make=()=>{const s=new Simulation(observedLevels());s.reset(true);initializeEntrance(s,replay.entrance);s.step([],0);(s as any).inputs=[];for(const pad of replay.pads){s.step(names.filter((_,b)=>pad&(1<<b)),1);if(s.phase==='dying')return s;}throw Error('Native replay never reached its death');};
 const one=make(),batch=make(),points:{frame:number;color:number;screen:unknown}[]=[];let seen=false;
 for(let frame=1;frame<600;frame++){one.step([],1);const screen=one.nativeScreen;if(screen)seen=true;if(screen&&(frame%7===0||screen.screen===1||screen.screen===11))points.push({frame,color:one.nativeBackdrop,screen:{...screen}});if(seen&&!screen&&one.phase==='play')break;}
 assert.ok(seen);assert.ok(points.some(p=>p.color===0x0f));assert.ok(points.some(p=>p.color===0x22));let at=0;
 for(const p of points){batch.step([],p.frame-at);at=p.frame;assert.equal(batch.nativeBackdrop,p.color);assert.deepEqual(batch.nativeScreen,p.screen);}
});
