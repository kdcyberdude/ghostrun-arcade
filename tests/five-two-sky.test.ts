import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

test('5-2 upper brick grows its sky vine after jumping from the revealed foothold',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const main=level.areas.find(a=>a.id===level.main)!;
 // Declared post-activation foothold fixture; no state writes after reset.
 main.tiles.find(t=>t[0]===84&&t[1]===9)![2]=196;
 main.spawn=[1352,144];main.camera=1232;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);
 sim.step(['a'],18);
 assert.equal(sim.tiles.get('85,5'),196);
 assert.ok(sim.vines.find(v=>v.id==='5-2-sky-vine')!.height>0);
 assert.equal(sim.area.id,'area-2');
 // Seven left frames (was eight): the native-speed motor travels farther per frame; 5..8 all reach the vine.
 sim.step([],260);sim.step(['left'],7);sim.step(['a'],16);
 sim.step(['right','up','a'],14);sim.step(['up'],240);sim.step([],500);
 assert.equal(sim.area.id,'5-2-vine-sky');
 assert.equal(sim.player.x,75);assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
});

test('5-2 sky entry settles at the observed75,208 and keeps the carrier stationary before contact',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 level.main='5-2-vine-sky';
 const sim=new Simulation([level]);sim.reset(true);sim.step([],500);
 assert.equal(sim.area.id,'5-2-vine-sky');assert.equal(sim.player.x,75);assert.equal(sim.player.y,208);
 assert.equal(sim.area.tiles.filter(t=>t[2]===194).length,41);
 assert.equal(sim.platformPosition(sim.area.platforms![0]).x,256);
 assert.equal(sim.lives,3);
});

test('5-2 neutral cloud rider reaches camera992, loses support and returns to world2088',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!);
 const sky=level.areas.find(a=>a.id==='5-2-vine-sky')!;
 // Declared source-observed riding fixture, then neutral controls only.
 level.main=sky.id;sky.entryVine=undefined;sky.spawn=[267,160];sky.camera=155;
 const sim=new Simulation([level]);sim.reset(true);let rightEdge=false,falling=false;
 for(let frame=0;frame<1800&&sim.area.id===sky.id;frame++){
  sim.step([],1);if(sim.area.id!==sky.id)break;
  if(sim.camera===992&&sim.player.x===1232)rightEdge=true;
  if(rightEdge&&sim.player.y>160)falling=true;
 }
 assert.ok(rightEdge);assert.ok(falling);
 assert.equal(sim.area.id,'area-2');assert.equal(sim.player.x,2088);assert.equal(sim.camera,2048);
 sim.step([],120);assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
});
