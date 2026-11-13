import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

function fixture(falling=true,enemyX=48){
 const tiles:Tile[]=Array.from({length:80},(_,x)=>[x,13,84]);
 const level:Level={id:'squash-fixture',main:'main',time:400,evidence:'Isolated real-collision test; not a campaign win',areas:[{id:'main',width:1280,palette:0,theme:'ground',spawn:[40,falling?176:208],tiles,enemies:[{kind:'goomba',x:enemyX,y:208,direction:-1}],evidence:'Synthetic level with no state changes after reset'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
function stomp(){
 const sim=fixture(),enemy=sim.enemies[0];let tries=0;
 while(!enemy.dead&&sim.phase==='play'&&tries++<80)sim.step(['left'],1);
 assert.equal(sim.phase,'play');assert.equal(enemy.squashed,true);assert.equal(enemy.dead,1);assert.equal(sim.awardedScore,100);
 return {sim,enemy};
}
// Native: a stomped Goomba keeps its pre-step x and is erased IntervalTimerControl ($077F, read on the stomp row) + 22 rows later (18 of 18 squashes of the 32 v2 traces).
test('a real stomp stays flat and fixed and is removed IntervalTimerControl + 22 updates later',()=>{
 const {sim,enemy}=stomp(),position=[enemy.x,enemy.y],birth=sim.frame,n=(sim as any).intervalControl+22;
 assert.ok(n>=22&&n<=42);
 for(let elapsed=1;elapsed<n;elapsed++){
  sim.step(['left'],1);assert.equal(sim.phase,'play');assert.equal(enemy.squashed,true);
  assert.ok(enemy.dead<90,`flat actor must remain visible at age${elapsed}`);
  assert.deepEqual([enemy.x,enemy.y],position);assert.equal(enemy.vy,0);
 }
 assert.equal(sim.frame-birth,n-1);assert.equal(enemy.dead,n);
 sim.step(['left'],1);assert.equal(enemy.dead,100);assert.deepEqual([enemy.x,enemy.y],position);
 sim.step([],20);assert.equal(enemy.dead,100);assert.deepEqual([enemy.x,enemy.y],position);
});
test('ordinary pause leaves squash age unchanged and resume continues the same interval',()=>{
 const {sim,enemy}=stomp();sim.step(['left'],12);const age=enemy.dead,frame=sim.frame;
 sim.step(['start'],1);assert.equal(sim.paused,true);sim.step([],80);assert.equal(enemy.dead,age);assert.equal(sim.frame,frame);
 sim.step(['start'],1);assert.equal(sim.paused,false);assert.equal(enemy.dead,age+1);
});
test('star contact retains launched velocity and never enters stomp squash',()=>{
 const sim=fixture(false);sim.player.star=100;(sim as any).broClock=1;sim.step([],1); // even frame-counter row
 const enemy=sim.enemies[0];
 assert.equal(enemy.dead,1);assert.equal(enemy.squashed,undefined);assert.equal(enemy.vy,-4);
 const y=enemy.y;sim.step([],1);assert.ok(enemy.y<y);assert.equal(enemy.squashed,undefined);
});
test('fireball contact retains launched velocity and never enters stomp squash',()=>{
 const sim=fixture(false,120);sim.items.push({kind:'fireball',x:120,y:188,vx:0,vy:0,age:0,life:20});sim.step([],1);
 const enemy=sim.enemies[0];assert.equal(enemy.dead,1);assert.equal(enemy.squashed,undefined);assert.equal(enemy.vy,-3);
 const y=enemy.y;sim.step([],1);assert.ok(enemy.y<y);assert.equal(enemy.squashed,undefined);
});
