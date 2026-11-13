import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('ground pit fall stays offscreen until the life transition',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);sim.camera=2313;sim.player.x=2460;sim.player.y=260;sim.player.vy=4;sim.player.grounded=false;(sim as unknown as {runJump:boolean}).runJump=true;sim.enemies=[];
 let elapsed=0;while(sim.phase==='play'&&sim.player.y<=272&&elapsed++<20)sim.step([],1);
 assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);const y=sim.player.y;assert.ok(y>272);
 // Native: 259-260 rows from passing y 240 to the engine change (57 pit deaths), not the older 264.
 sim.step([],257);assert.equal(sim.phase,'play');assert.ok(sim.player.y>y);assert.equal(sim.lives,3);
 sim.step([],3);assert.equal(sim.phase,'intro');assert.equal(sim.lives,2); // +1: the engine-6 row (PlayerLoseLife next row) is still a death row
});

test('ground enemy-style death still uses its normal upward launch',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);const y=sim.player.y;sim.die();sim.step([],16);
 assert.equal(sim.phase,'dying');assert.ok(sim.player.y<y);
});

test('the final page6 void frame clamps Mario to the screen edge before selecting lose-life',()=>{
 // Mood0 1-3 entry0007 row578: rawY252→0/page6, screenX240→239.
 const sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='1-3')!)]);sim.reset(true);
 sim.camera=660;Object.assign(sim.player,{x:899.875,y:1308,vx:0.3,vy:4,grounded:false});sim.enemies=[];
 sim.step(['right'],1);
 assert.equal(sim.phase,'dying');assert.equal(Math.floor(sim.player.x),899);
 assert.ok(sim.player.vx>=0&&sim.player.vx<1/16,'boundary clears only the integer speed byte');
});
