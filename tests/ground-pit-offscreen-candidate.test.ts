import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('ground pit fall stays offscreen until the life transition',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);sim.camera=2313;sim.player.x=2460;sim.player.y=260;sim.player.vy=4;sim.player.grounded=false;sim.enemies=[];
 let elapsed=0;while(sim.phase==='play'&&elapsed++<20)sim.step([],1);
 assert.equal(sim.phase,'dying');const y=sim.player.y;assert.ok(y>272);
 // Native: 259-260 rows from passing y 240 to the engine change (57 pit deaths), not the older 264.
 sim.step([],257);assert.equal(sim.phase,'dying');assert.equal(sim.player.y,y);assert.equal(sim.lives,3);
 sim.step([],2);assert.equal(sim.phase,'intro');assert.equal(sim.lives,2);
});

test('ground enemy-style death still uses its normal upward launch',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);const y=sim.player.y;sim.die();sim.step([],16);
 assert.equal(sim.phase,'dying');assert.ok(sim.player.y<y);
});
