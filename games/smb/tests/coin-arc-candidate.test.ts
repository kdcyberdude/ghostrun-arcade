import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Visible source positions after the displayed +200, frozen before source holdouts.
const origins=[118,113,109,106,102,99,96,94,92,90,88,87,86];
function checkArc(sim:Simulation, controls:()=>void){
 let elapsed=0;
 while(sim.coins===0&&elapsed++<60)controls();
 assert.equal(sim.coins,1);assert.equal(sim.score,200);
 let coin=sim.items.find(i=>i.kind==='coin');assert.ok(coin);assert.equal(Math.floor(coin.y),123);
 const x=coin.x;
 for(const expected of origins){sim.step([],1);coin=sim.items.find(i=>i.kind==='coin');assert.ok(coin);assert.equal(Math.floor(coin.y),expected);assert.equal(coin.x,x);}
}
test('ordinary first question block emits a source-measured coin arc and awards once',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);sim.step(['right','b'],98);let n=0;
 checkArc(sim,()=>sim.step(n++<6?['right','a','b']:['right','b'],1));
 assert.equal(sim.phase,'play');assert.equal(sim.coins,1);assert.equal(sim.score,200);
});
test('multi-coin block component emits the same observed initial arc and retains repeatability',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-2')!);const area=level.areas.find(a=>a.id==='main')!;area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1232,208],1189);
 checkArc(sim,()=>sim.step(['a'],1));assert.equal(sim.tiles.get('77,9'),81);
 sim.step([],36);sim.step(['a'],16);sim.step([],30);assert.equal(sim.coins,2);assert.equal(sim.score,400);
});

test('coin flight freezes during pause and resumes without another coin sound',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);sim.events.length=0;sim.step(['right','b'],98);let n=0;
 while(sim.coins===0&&n++<30)sim.step(n<=6?['right','a','b']:['right','b'],1);
 assert.equal(sim.coins,1);assert.equal(sim.events.filter(x=>x==='sfx_coin').length,1);
 sim.step(['start'],1);assert.equal(sim.paused,true);const item=sim.items.find(i=>i.kind==='coin');assert.ok(item);
 const before={y:item.y,age:item.age,life:item.life,frame:sim.frame};sim.step([],60);
 assert.deepEqual({y:item.y,age:item.age,life:item.life,frame:sim.frame},before);
 sim.step(['start'],1);assert.equal(sim.paused,false);assert.ok(item.y<before.y);assert.equal(sim.events.filter(x=>x==='sfx_coin').length,1);
});
test('touching a decorative flying coin neither hurts nor awards another coin',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);sim.events.length=0;
 sim.items.push({kind:'coin',x:sim.player.x+4,y:sim.player.y-18,vx:0,vy:0,age:0,life:10});
 sim.step([],1);assert.equal(sim.player.dead,false);assert.equal(sim.phase,'play');assert.equal(sim.coins,0);assert.equal(sim.score,0);assert.equal(sim.events.filter(x=>x==='sfx_coin').length,0);
});
