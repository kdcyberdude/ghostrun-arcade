import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

function fixture(second=64){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 // The default second Goomba approaches from the left: native Goombas turn back at a squashed corpse (area D), so one arriving from the right
 // behind the first would reverse instead of reaching the bouncing player. Positions and awards below are unchanged.
 // The second Goomba starts at x 17 (was 16): native contact needs |dx| <= 10 on an even counter row (stompedge probe); from 16 it arrived 11 px away. Awards unchanged.
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:48,y:208},second===64?{kind:'goomba',x:17,y:208,direction:1}:{kind:'goomba',x:second,y:208}],spawn:[40,176],evidence:'Synthetic isolated two-enemy collision fixture, not campaign evidence'};
 const level:Level={id:'stomp-fixture',time:400,main:area.id,areas:[area,{...structuredClone(area),id:'other'}],evidence:'Stomp state regression only'};
 const sim=new Simulation([level]);sim.reset(true);sim.broClock=1;return sim; // native check rows are the even counter values: the first step is one
}

test('two distinct enemies stomped during one airborne bounce award100 then200',()=>{
 const sim=fixture(),awards:number[]=[];let prior=0,landed=false;
 for(let frame=0;frame<40&&awards.length<2;frame++){
  sim.step([],1);if(sim.score>0&&sim.player.grounded)landed=true;
  if(sim.score!==prior){awards.push(sim.score-prior);prior=sim.score;}
 }
 assert.deepEqual(awards,[100,200]);assert.equal(landed,false);assert.ok(sim.enemies.every(e=>e.dead>0));assert.equal(sim.phase,'play');
});

test('landing on actual floor between jumps restores the next stomp award to100',()=>{
 const sim=fixture(140),awards:number[]=[];let prior=0,sawFloor=false;
 for(let frame=0;frame<220&&awards.length<2;frame++){
  sim.step(frame>=135&&frame<165?['a']:[],1);
  if(sim.score===100&&sim.player.grounded&&sim.player.y===208)sawFloor=true;
  if(sim.score!==prior){awards.push(sim.score-prior);prior=sim.score;}
 }
 assert.equal(sawFloor,true);assert.deepEqual(awards,[100,100]);assert.ok(sim.enemies.every(e=>e.dead>0));assert.equal(sim.phase,'play');
});

test('an area load clears an airborne count while retaining the accumulated score',()=>{
 const sim=fixture();sim.step([],27);assert.equal(sim.score,300);assert.equal(sim.player.grounded,false);
 // Direct area loading isolates this state boundary; it is not a game route.
 sim.loadArea('other');sim.broClock=1;sim.step([],11);assert.equal(sim.score,400);assert.equal(sim.enemies[0].dead,1);
});

test('actual damage clears an airborne count before a second enemy contact',()=>{
 const sim=fixture();sim.player.size=1;sim.step([],11);assert.equal(sim.score,100);
 sim.items.push({kind:'flame',x:40,y:180,vx:0,vy:0,age:0,life:1});sim.step([],1);assert.equal(sim.powerChange?.kind,'shrink');
 let landed=false;for(let frame=0;frame<100&&sim.score===100;frame++){sim.step([],1);if(sim.player.grounded)landed=true;}
 assert.equal(landed,false);assert.equal(sim.score,200);assert.equal(sim.enemies[1].dead,1);assert.equal(sim.phase,'play');
});
