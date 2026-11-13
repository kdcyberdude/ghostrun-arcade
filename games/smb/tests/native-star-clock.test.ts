import {test} from 'node:test';
import assert from 'node:assert/strict';
import data from '../data/native-star-clock.json';
import {nativeIntervalStep,nativeStarMusic,nativeStarPalette,NATIVE_STAR_PICKUP} from '../src/native-interval.js';

test('native Star collision initializes $079F to $23 without a timer freeze',()=>{
 assert.equal(data.pickup[0][2],0);assert.equal(data.pickup[1][2],NATIVE_STAR_PICKUP);assert.equal(data.pickup[1][0],0);
});
test('all native NMI pause/master-control/interval/Star boundary transitions match',()=>{
 assert.equal(data.transitions.length,1008);
 for(const [b,a] of data.transitions){
  const n=nativeIntervalStep(b[1],b[2],b[0],Boolean(b[4]&1));
  assert.deepEqual([n.control,n.interval,n.star],[a[0],a[1],a[2]],JSON.stringify(b));
  assert.equal(a[3],b[4]&1?b[3]:(b[3]+1)&255,'$09 freezes only for pause');
 }
});
test('native Star lifecycle and music restore match every row, including the interval phase at pickup',()=>{
 const rows=data.lifecycle;assert.equal(rows.findIndex(r=>r[2]===0),725);
 for(let f=1;f<rows.length;f++){
  const b=rows[f-1],a=rows[f],n=nativeIntervalStep(b[1],b[2],b[0],Boolean(b[4]&1));
  assert.deepEqual([n.control,n.interval,n.star],a.slice(0,3),`row ${f}`);
  assert.equal(nativeStarMusic(a[2],a[1]),a[5]===1,`area music row ${f}`);
 }
 assert.equal(nativeStarMusic(4,0,2),false,'GameEngine skips music when below screen');
});

import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
function fixture(){
 const level:Level={id:'star-clock',time:400,main:'main',evidence:'Isolated shared interval clock fixture.',areas:[{id:'main',width:1280,palette:0,theme:'ground',tiles:Array.from({length:80},(_,x)=>[x,13,84] as Tile),enemies:[],spawn:[40,208],evidence:'Flat stationary Mario.'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
test('runtime Star byte, shared interval and music reproduce the complete native neutral lifecycle',()=>{
 const sim=fixture(),initial=data.lifecycle[0];sim.player.star=initial[2];sim.intervalControl=initial[1];sim.random.frame=initial[3];sim.starPalette=initial[6]&3;
 for(let f=1;f<data.lifecycle.length;f++){
  sim.events=[];sim.step([],1);const a=data.lifecycle[f];
  assert.deepEqual([sim.intervalControl,sim.player.star,sim.random.frame],[a[1],a[2],a[3]],`native row ${f}`);
  assert.equal(sim.events.includes('music_ground'),a[5]===1,`native area-music row ${f}`);
  assert.equal(sim.starDrawPalette??0,a[7]&3,`native player OAM palette row ${f}`);assert.equal(sim.starPalette,a[6]&3,`stored attributes row ${f}`);
 }
});
test('runtime Star shares the paused and transformation-frozen interval clock, including flag and pipe engines',()=>{
 const sim=fixture();sim.player.star=8;sim.intervalControl=0;
 const counter=sim.random.frame;sim.paused=true;sim.step([],5);assert.equal(sim.random.frame,counter);assert.equal(sim.player.star,8);assert.equal(sim.intervalControl,0);
 sim.paused=false;sim.powerChange={kind:'grow',from:0,to:1,remaining:2};sim.step([],2);assert.equal(sim.player.star,8);assert.equal(sim.intervalControl,0);
 sim.step([],1);assert.equal(sim.player.star,7);assert.equal(sim.intervalControl,20);
 for(const phase of ['flag','pipe'] as const){sim.phase=phase;sim.intervalControl=0;sim.step([],1);assert.equal(sim.player.star,phase==='flag'?6:5);assert.equal(sim.intervalControl,20);}
});

import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
test('retained entrance RAM seeds native Star units and the shared interval phase directly',()=>{
 const ram=new Uint8Array(2048);
 for(const [at,value] of [[0x770,1],[0x772,3],[14,8],[0xb5,1],[0x86,40],[0xce,176],[0x33,1],[0x7f8,4],[0x79f,8],[0x77f,17]])ram[at]=value;
 const start=decodeEntrance(ram,{level:'1-1'}),sim=fixture();sim.levels[0].id='1-1';initializeEntrance(sim,start);
 assert.equal(start.star,8);assert.equal(sim.player.star,8);assert.equal(sim.intervalControl,17);
});

test('Star pickup draws the prior own palette; late GameEngine attribute cycle appears on the next OAM row',()=>{
 assert.equal(data.pickup[1][7]&3,0);assert.equal(data.pickup[1][6]&3,nativeStarPalette(35,data.pickup[1][3]));
 for(let f=1;f<data.lifecycle.length;f++){const b=data.lifecycle[f-1],a=data.lifecycle[f];assert.equal(a[7]&3,b[6]&3,`OAM delay row ${f}`);assert.equal(a[6]&3,nativeStarPalette(a[2],a[3]),`stored row ${f}`);}
});

import {GameRenderer} from '../src/renderer.js';
test('2D consumes the captured native OAM Star palette on pickup and expiry, including timer zero',()=>{
 const sim=fixture(),renderer=Object.create(GameRenderer.prototype) as any;sim.player.size=2;
 let texture='';renderer.quad=(name:string)=>{texture=name;};
 for(const row of data.lifecycle){
  sim.player.star=row[2];sim.starDrawPalette=row[7]&3;renderer.player(sim);
  const variant=['fire','star-green','star-white','star-dark'][row[7]&3];
  assert.match(texture,new RegExp(`^player-${variant}-`));
 }
 sim.starDrawPalette=undefined;renderer.player(sim);assert.match(texture,/^player-fire-/);
});
