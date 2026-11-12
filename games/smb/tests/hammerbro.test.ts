import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
import observedLevels from '../data/levels.json';

// These are declared component fixtures, not native AI states or campaign wins.
// PRNG14 selects the conditional low class;0 selects high. Production seeds
// still come from actor origin, and their source equivalence is unqualified.
const CONDITIONAL_RANDOM={weak:14,strong:0};
function actual(){
 const level=structuredClone((observedLevels as unknown as Level[]).find(l=>l.id==='5-2')!);
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-2',[1140,208],1100);
 const bro=sim.enemies.find(e=>e.kind==='hammerBro'&&e.originX===1296&&e.originY===160);
 assert.ok(bro);return {sim,bro};
}
for(const [initialY,kind,targetY] of [[144,'weak',208],[144,'strong',144],[208,'strong',144]] as const){
 test(`conditional actual5-2 Bro ${kind} jump from${initialY} lands at${targetY}`,()=>{
  const {sim,bro}=actual();Object.assign(bro,{x:1296,y:initialY,vx:.25,vy:0,active:true,hammerRandom:CONDITIONAL_RANDOM[kind],hammerJumpWait:0});
  const rows=[];
  for(let frame=1;frame<=100;frame++){
   sim.step([],1);rows.push({x:bro.x,y:bro.y,vy:bro.vy,dropRow:bro.hammerDropRow});
   if(frame>2&&bro.vy===0)break;
  }
  assert.equal(sim.phase,'play');assert.equal(bro.y,targetY);
  assert.ok(rows.every(r=>r.x>=1292&&r.x<=1308),'observed patrol bounds retain support during the jump');
  if(kind==='weak'){
   assert.ok(rows.some(r=>r.y>144&&r.y<160&&r.dropRow===144),'low class must cross its launch row');
   assert.equal(bro.hammerDropRow,undefined,'row exception must clear before landing on lower ground');
  }else{
   assert.ok(rows.some(r=>r.y<144),'high class must rise above the row');
   assert.ok(rows.every(r=>r.dropRow===undefined));
  }
 });
}
function synthetic(){
 const tiles:Tile[]=[...Array.from({length:128},(_,x)=>[x,13,84] as Tile),...Array.from({length:4},(_,i)=>[30+i,9,192] as Tile)];
 const level:Level={id:'hammer-component-fixture',time:400,main:'main',evidence:'Synthetic component fixture; not campaign traversal',areas:[{id:'main',width:2048,palette:0,theme:'ground',tiles,enemies:[{kind:'hammerBro',x:500,y:208,direction:-1}],spawn:[340,208],camera:240,evidence:'Neutral ordinary steps after reset'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
test('inferred local Bro choice is deterministic and patrol stays bounded through many ordinary updates',()=>{
 const first=synthetic(),second=synthetic(),bro=first.enemies[0];const launches:{frame:number;kind:string}[]=[];
 for(let frame=1;frame<=5000;frame++){
  const previousVy=bro.vy;first.step([],1);second.step([],1);
  if(previousVy===0&&bro.vy<0)launches.push({frame,kind:bro.hammerDropRow===undefined?'strong':'weak'});
  assert.ok(bro.x>=492&&bro.x<=508);assert.equal(first.phase,'play');
 }
 assert.deepEqual(structuredClone(first),structuredClone(second));
 assert.ok(launches.some(l=>l.kind==='strong'));assert.ok(launches.some(l=>l.kind==='weak'));
 for(let i=1;i<launches.length;i++)assert.ok(launches[i].frame-launches[i-1].frame>=192&&launches[i].frame-launches[i-1].frame<=255);
});
test('ordinary right input into a live Bro causes genuine contact death',()=>{
 const sim=synthetic();Object.assign(sim.player,{x:476,y:208,vx:0,vy:0,grounded:true});
 for(let frame=0;frame<30&&sim.phase==='play';frame++)sim.step(['right'],1);
 assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
});
test('an ordinary B-triggered fireball defeats a live Bro and awards100',()=>{
 const sim=synthetic();Object.assign(sim.player,{x:450,y:208,size:2,vx:0,vy:0,grounded:true});
 sim.step(['b'],1);sim.step([],30);
 assert.ok(sim.enemies[0].dead>0);assert.equal(sim.score,100);assert.equal(sim.phase,'play');
});
