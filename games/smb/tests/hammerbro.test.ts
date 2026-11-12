import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
import observedLevels from '../data/levels.json';

// Component fixtures seed native slot bytes and LSFR state; full native row evidence is checked in native-hammer-bros.test.ts.
function actual(){
 const level=structuredClone((observedLevels as unknown as Level[]).find(l=>l.id==='5-2')!);
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-2',[1140,208],1100);
 const bro=sim.enemies.find(e=>e.kind==='hammerBro'&&e.originX===1296&&e.originY===160);
 assert.ok(bro);return {sim,bro};
}
for(const [initialY,kind,targetY] of [[144,'weak',208],[144,'strong',144],[208,'strong',144]] as const){
 test(`native actual5-2 Bro ${kind} jump from${initialY} lands at${targetY}`,()=>{
  const {sim,bro}=actual();Object.assign(bro,{x:1296,y:initialY,vx:.25,vy:0,active:true,enemySlot:0,hbro:{state:0,jumpTimer:0,throwTimer:200,frameTimer:0,interval:128,speed:0,force:0,fraction:0,y:initialY-24}});
  sim.random.bytes=[0,kind==='weak'?2:0,0,0,0,0,0];sim.random.frame=0;
  const rows=[];
  for(let frame=1;frame<=100;frame++){
   sim.step([],1);rows.push({x:bro.x,y:bro.y,vy:bro.vy,timer:bro.hbro!.frameTimer});
   if(frame>2&&bro.vy===0)break;
  }
  assert.equal(sim.phase,'play');assert.equal(bro.y,targetY);
  assert.ok(rows.every(r=>r.x>=1280&&r.x<=1312),'FrameCounter patrol retains support during this arc');
  if(kind==='weak'){
   assert.ok(rows.some(r=>r.y>144&&r.y<160&&r.timer>0),'low class must cross its launch row');
   assert.equal(bro.hbro!.frameTimer,0,'native frame timer expires before landing on lower ground');
  }else{
   assert.ok(rows.some(r=>r.y<144),'high class must rise above the row');

  }
 });
}
function synthetic(){
 const tiles:Tile[]=[...Array.from({length:128},(_,x)=>[x,13,84] as Tile),...Array.from({length:4},(_,i)=>[30+i,9,192] as Tile)];
 const level:Level={id:'hammer-component-fixture',time:400,main:'main',evidence:'Synthetic component fixture; not campaign traversal',areas:[{id:'main',width:2048,palette:0,theme:'ground',tiles,enemies:[{kind:'hammerBro',x:500,y:208,direction:-1}],spawn:[340,208],camera:240,evidence:'Neutral ordinary steps after reset'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
test('native slot timers and LSFR make Hammer Bro choices deterministic through ordinary updates',()=>{
 const first=synthetic(),second=synthetic(),bro=first.enemies[0];const launches:{frame:number;kind:string}[]=[];
 for(let frame=1;frame<=5000;frame++){
  const previousVy=bro.vy;first.step([],1);second.step([],1);
  if(previousVy===0&&bro.vy<0)launches.push({frame,kind:previousVy-bro.vy>=4?'strong':'weak'});
  if(first.phase!=='play')break;
 }
 assert.deepEqual(structuredClone(first),structuredClone(second));
 assert.ok(launches.some(l=>l.kind==='strong'));assert.ok(launches.some(l=>l.kind==='weak'));

});
function stillBro(sim:Simulation){sim.random.frame=63;const bro=sim.enemies[0];bro.active=true;bro.enemySlot=0;bro.hbro={state:0,jumpTimer:200,throwTimer:200,frameTimer:0,interval:128,speed:0,force:0,fraction:0,y:184};}
test('ordinary right input into a live Bro causes genuine contact death',()=>{
 const sim=synthetic();stillBro(sim);Object.assign(sim.player,{x:476,y:208,vx:0,vy:0,grounded:true});
 for(let frame=0;frame<30&&sim.phase==='play';frame++)sim.step(['right'],1);
 assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
});
test('an ordinary B-triggered fireball defeats a live Bro and awards100',()=>{
 const sim=synthetic();stillBro(sim);Object.assign(sim.player,{x:450,y:208,size:2,vx:0,vy:0,grounded:true});
 sim.step(['b'],1);sim.step([],30);
 assert.ok(sim.enemies[0].dead>0);assert.equal(sim.score,100);assert.equal(sim.phase,'play');
});
