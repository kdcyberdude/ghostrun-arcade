import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native pit deaths (worlds-20261111, 3-4 among them) stay in engine 8 with no launch and end 259-260 rows after passing y 240 (245-249 after a walk or medium jump): the old 208-row launch was a screenshot-era guess.
test('3-4 black pit falls unseen with no launch for the native 259-260 rows',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-4')!);
 const sim=new Simulation([level]);sim.reset(true);sim.camera=242;sim.player.x=354;sim.player.y=200;sim.player.vy=4;sim.player.grounded=false;
 sim.enemies=[];sim.items=[];sim.area.firebars=[];sim.area.platforms=[];
 let elapsed=0;while(sim.phase==='play'&&elapsed++<50)sim.step([],1);
 assert.equal(sim.phase,'dying');const y=sim.player.y;assert.ok(y>272);
 sim.step([],16);assert.equal(sim.player.y,y,'no launch');
 sim.step([],241);assert.equal(sim.phase,'dying');assert.equal(sim.lives,3);
 sim.step([],2);assert.equal(sim.phase,'intro');assert.equal(sim.lives,2);
});

test('landing after passing a lava tile clears the flag before a later black pit',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-4')!);
 const area=level.areas[0];area.spawn=[48,208];area.tiles=[[3,13,134],[2,14,98],[3,14,98],[4,14,98]];area.enemies=[];area.firebars=[];area.platforms=[];
 const sim=new Simulation([level]);sim.reset(true);
 let elapsed=0;while(!sim.player.grounded&&elapsed++<30)sim.step([],1);
 assert.equal(sim.player.grounded,true);assert.equal(sim.player.y,224);
 elapsed=0;while(sim.phase==='play'&&elapsed++<200)sim.step(['right','b'],1);
 assert.equal(sim.phase,'dying');const y=sim.player.y;assert.ok(y>272);
 sim.step([],16);assert.equal(sim.player.y,y,'no launch');
 sim.step([],243);assert.equal(sim.phase,'intro');assert.equal(sim.lives,2);
});
