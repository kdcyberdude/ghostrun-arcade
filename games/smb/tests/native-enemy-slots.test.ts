import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

// Enemy-slot rules checked on every frame of every recorded run (evidence/native-runs/*.json): they read only the camera, the slot bytes and the ids.
const dir=new URL('../evidence/native-runs/',import.meta.url),unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
function runs(){
 return fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(file=>{
  const x=JSON.parse(fs.readFileSync(new URL(file,dir),'utf8')),ram=unpack(x.ram),init=unpack(x.initialRam),n=x.addrs.length,idx=new Map<number,number>(x.addrs.map((a:number,i:number)=>[a,i]));
  return {x,at:(f:number,a:number)=>f<0?init[a]:ram[f*n+idx.get(a)!]};
 });
}
const WALKERS=[0,2,6];

test('HandleGroupEnemies: a group is made at ScreenRight (camera + 255), +24, +48 with each slot\'s sub-pixel byte; followers have stepped once (-0.5)',()=>{
 let followers=0;
 for(const {x,at} of runs())for(let f=0;f<x.frames;f++){
  const made=[0,1,2,3,4].filter(k=>at(f,0xf+k)&&!at(f-1,0xf+k)&&WALKERS.includes(at(f,0x16+k))&&at(f,0x1e+k)===0);
  if(made.length<2)continue;
  const right=(at(f,0x71a)*256+at(f,0x71c)+255)*256,xs=made.map(k=>(at(f,0x6e+k)*256+at(f,0x87+k))*256+at(f,0x401+k));
  if(xs[0]!==right+at(f-1,0x401+made[0]))continue; // two singles made on one row (a load), not a group
  made.forEach((k,i)=>{if(i){assert.equal(xs[i],right+24*256*i+at(f-1,0x401+k)-128,`${x.level}.${x.run} row ${f} slot ${k}`);followers++;}});
 }
 assert.ok(followers>=60,`${followers} followers`);
});

test('OffscreenBoundsCheck: no live object is left of ScreenLeft - 72 - (id < 13), or of -16 / -271 (low-byte carry) for a Hammer Bro or Piranha',()=>{
 let rows=0;
 const bound=(cam:number,id:number)=>id===5||id===13?((cam&255)+57>255?cam-271:cam-16):cam-72-(id<13?1:0);
 for(const {x,at} of runs())for(let f=0;f<x.frames;f++){
  if(at(f,0x0e)!==8)continue;
  const cam=at(f,0x71a)*256+at(f,0x71c);
  for(let k=0;k<5;k++){const id=at(f,0x16+k);if(at(f,0xf+k)!==1||![0,2,3,5,6,13,14,15,16,17,18].includes(id))continue; // flag $80|owner: a part of another object
   assert.ok(at(f,0x6e+k)*256+at(f,0x87+k)>=bound(cam,id),`${x.level}.${x.run} row ${f} slot ${k} id ${id}`);rows++;}
 }
 assert.ok(rows>50000,`${rows} rows`);
});

function fixture(enemies:Level['areas'][number]['enemies'],spawnX=40){
 const tiles:Tile[]=Array.from({length:120},(_,x)=>[x,13,84]);
 const level={id:'slot-fixture',time:400,main:'main',evidence:'Synthetic slot fixture',areas:[{id:'main',width:1920,palette:0,theme:'ground',tiles,enemies,spawn:[spawnX,208],evidence:'test'}]} as unknown as Level;
 const sim:any=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}
test('with all five slots busy a list object is never made, even after a slot frees (2-1 x 1088 Goomba)',()=>{
 const sim=fixture([0,1,2,3,4,5].map(i=>({kind:'goomba',x:120+i*30,y:208,direction:-1})));
 sim.step([],1);
 assert.equal(sim.enemies.filter((e:any)=>e.active).length,5);const lost=sim.enemies.find((e:any)=>e.slotLost);assert.ok(lost);
 sim.enemies[0].active=false;sim.enemies[0].slotFreed=true;sim.step([],5);assert.equal(lost.active,false);
});
test('a new jumping Paratroopa starts from the vertical bytes its slot was left with (7-1 row 300: speed -1, force 216)',()=>{
 const sim=fixture([{kind:'paratroopa',x:200,y:208,direction:-1,palette:'0f-1a-30-27'}]);
 sim.slotVertical[0]={speed:-1,force:216,fraction:88};sim.step([],1);
 const p=sim.enemies[0];assert.equal(p.enemySlot,0);assert.deepEqual([p.pod.speed,p.pod.force],[-1,244]);assert.equal(p.y,208); // native row 301: y 184 (−1 + the fraction carry), force 244, speed −1
});
test('ChkInj: a rising Mario whose y + 12 is above a Paratroopa\'s y stomps it on contact and keeps his jump speed (7-1 row 359)',()=>{
 const sim=fixture([]);
 const para={...sim.makeEnemy({kind:'paratroopa',x:819,y:185,direction:-1,palette:'0f-1a-30-27'}),active:true,enemySlot:0};
 const mario={x:808.25,y:172,vy:-3.75,size:0,duck:false};
 assert.equal(sim.nativeChkInjStomp(para,mario,819,185),true);
 assert.equal(sim.nativeChkInjStomp(para,{...mario,y:185},819,185),false,'y + 12 not above');
 assert.equal(sim.nativeChkInjStomp(para,{...mario,x:802},819,185),false,'boxes apart (x 805..815 vs 821..833)');
 assert.equal(sim.nativeChkInjStomp(para,{...mario,vy:1.5},819,185),false,'a falling Mario takes the ordinary stomp');
});
