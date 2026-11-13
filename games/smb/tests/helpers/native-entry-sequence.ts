import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {Simulation} from '../../src/simulation.js';import {observedLevels} from '../../src/levels.js';import {decodeEntrance,initializeEntrance} from '../../tools/harness/native-entrance.mjs';import {strictSimEntities} from '../../tools/harness/native-strict-entities.js';import fixture from '../fixtures/native-entry-sequences.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
export function nativeEntrySequence(level:string){
 const c=fixture.cases.find(c=>c.level===level)!,initial=unpack(c.initial),pads=unpack(c.pads),ram=unpack(c.ram);assert.equal(hash(initial),c.initialSha256);assert.equal(hash(pads),c.padsSha256);assert.equal(hash(ram),c.ramSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,c.receipt));sim.step([],0);sim.inputs=[];
 const rows=[];for(let frame=0;frame<pads.length;frame++){
  sim.step(['a','b','select','start','up','down','left','right'].filter((_,bit)=>pads[frame]&(1<<bit)),1);const r=ram.subarray(frame*2048,(frame+1)*2048),screen=sim.nativeScreen;
  rows.push({frame,r,actual:{x:Math.floor(sim.player.x),y:Math.floor(sim.player.y)-32,vx:Math.round(sim.player.vx*4096),phase:sim.phase,area:sim.area.id,locked:sim.entryControlLocked,time:sim.time,gameTimer:24-sim.timerFrames,actors:strictSimEntities(sim),screen:screen?{task:screen.task,engine:screen.engine,screen:screen.screen,disable:screen.disable,timer:screen.timer,columns:screen.columns}:undefined}});
 }
 return {source:c,main:sim.level.main,rows};
}
