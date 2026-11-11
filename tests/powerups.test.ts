import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
import {observedLevels} from '../src/levels.js';

function game(){
 const tiles:Tile[]=Array.from({length:80},(_,x)=>[x,13,84]);
 const level:Level={id:'powerup-fixture',time:400,main:'main',evidence:'Isolated mechanic fixture, not campaign completion.',areas:[{id:'main',width:1280,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:240,y:208,spawnCamera:0}],spawn:[40,208],evidence:'Flat fixture uses production item/enemy/collision rules.'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('mushroom growth freezes player, enemies and timer for the measured 59 native frames',()=>{
 const sim=game();sim.items.push({kind:'mushroom',x:40,y:192,vx:0,vy:0,age:32,life:1000});sim.step([],1);
 assert.equal(sim.powerChange?.kind,'grow');assert.equal(sim.score,1000);
 const x=sim.player.x,enemyX=sim.enemies[0].x,time=sim.time,timer=sim.timerFrames;
 sim.step(['right'],27);sim.step(['a'],32);
 assert.equal(sim.powerChange,undefined);assert.equal(sim.player.size,1);assert.equal(sim.player.x,x);
 assert.equal(sim.enemies[0].x,enemyX);assert.equal(sim.time,time);assert.equal(sim.timerFrames,timer);
 sim.step(['right'],4);assert.ok(sim.player.x>x);assert.ok(sim.enemies[0].x<enemyX);
});

// Expectation changed from 64/128 (image brackets) by native rows: engine 10 lasts 55 rows; RAM 0x79e protects 147..167 play rows (evidence/power-findings-20261111.md).
test('Fire Mario damage loses both power stages after55 frozen frames then protects for157play frames',()=>{
 const sim=game();sim.player.size=2;sim.hurt();assert.equal(sim.powerChange?.to,0);
 sim.step(['right'],55);assert.equal(sim.player.size,0);assert.equal(sim.player.invincible,157);
 sim.hurt();assert.equal(sim.phase,'play');sim.step([],156);assert.equal(sim.player.invincible,1);
 sim.step([],1);sim.hurt();assert.equal(sim.phase,'dying');
});

test('a flower changes Big Mario to Fire Mario through the measured freeze',()=>{
 const sim=game();sim.player.size=1;sim.items.push({kind:'flower',x:40,y:192,vx:0,vy:0,age:32,life:1000});
 sim.step([],1);assert.equal(sim.powerChange?.kind,'fire');sim.step([],62);assert.equal(sim.player.size,1);sim.step([],1);assert.equal(sim.player.size,2);assert.equal(sim.score,1000);
});

test('Star pickup grants1000points without a growth freeze and expires after720play frames',()=>{
 const sim=game();sim.player.vx=1;sim.items.push({kind:'star',x:40,y:192,vx:0,vy:0,age:32,life:1000});sim.step([],1);
 assert.equal(sim.player.star,720);assert.equal(sim.score,1000);assert.equal(sim.powerChange,undefined);
 const x=sim.player.x;sim.step(['right'],4);assert.ok(sim.player.x>x);
 // Keep the ordinary fixture controller neutral; no state-based route or win.
 sim.step([],716);assert.equal(sim.player.star,0);assert.ok(sim.events.includes('music_ground'));
});

test('an8px fireball bounces from the floor and awards the observed100points for a Goomba',()=>{
 const sim=game();sim.items.push({kind:'fireball',x:100,y:199,vx:0,vy:3,age:20,life:300});sim.step([],1);
 assert.equal(sim.items[0].y,200);assert.equal(sim.items[0].vy,-3);
 const enemy=sim.enemies[0];sim.items.push({kind:'fireball',x:enemy.x,y:enemy.y-12,vx:0,vy:0,age:1,life:300});sim.step([],1);
 assert.ok(enemy.dead>0);assert.equal(sim.score,100);
});

test('grounded Fire Mario throws from the observed position in both directions',()=>{
 for(const [facing,expectedX] of [[1,16],[-1,-8]] as const){
  const sim=game();sim.player.size=2;sim.player.facing=facing;
  sim.step(['b'],1);sim.step([],4);
  const fireball=sim.items.find(item=>item.kind==='fireball');assert.ok(fireball);
  assert.ok(Math.abs(Math.floor(fireball.x-sim.player.x)-expectedX)<=2);
  assert.ok(Math.abs(Math.floor(fireball.y)-188)<=2);
 }
});

test('releasing and repressing B two frames later fires a second projectile, capped at two',()=>{
 const sim=game();sim.player.size=2;
 sim.step(['b'],1);sim.step([],1);sim.step(['b'],1);sim.step([],2);
 assert.equal(sim.items.filter(item=>item.kind==='fireball').length,2);
 sim.step(['b'],1);sim.step([],2);
 assert.equal(sim.items.filter(item=>item.kind==='fireball').length,2);
 const held=game();held.player.size=2;held.step(['b'],12);
 assert.equal(held.items.filter(item=>item.kind==='fireball').length,1);
});

test('the observed1-1 blocks emit size powerups or a Star and emerge over64frames',()=>{
 for(const [col,size,kind]of [[21,0,'mushroom'],[78,1,'flower'],[101,0,'star']] as const){
  const level=structuredClone(observedLevels()[0]);level.areas[0].enemies=[];level.areas[0].spawn=[col*16,208];
  const sim=new Simulation([level]);sim.reset(true);sim.player.size=size;sim.step(['a'],20);
  const item=sim.items.find(i=>i.kind===kind);assert.ok(item,`${col}/${kind}`);assert.ok(item.emerging!>40);
  assert.equal(sim.tiles.get(`${col},9`),196);const y=item.y,remaining=item.emerging!;
  sim.step([],remaining);assert.equal(item.y,y-remaining*0.25);assert.equal(item.emerging,0);
 }
});
