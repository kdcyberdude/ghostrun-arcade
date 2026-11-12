import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import plan from '../data/lower-next-six-two-fixtures.json';

function fixture(spawn:[number,number],omitted:number[]=[]){
 const level=structuredClone(observedLevels().find(l=>l.id===plan.level)!);
 const main=level.areas.find(a=>a.id===plan.area)!;
 // Declare the fixture before execution; preserve all other actual map geometry.
 main.spawn=spawn;main.camera=plan.camera;main.enemies=[];main.generators=[];main.exit=undefined;
 main.tiles=main.tiles.filter(([col,row])=>row!==plan.row||!omitted.includes(col));
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

for(const col of plan.ground)test(`6-2 observed ground ${col}/13 supports a fall at208; omitted-cell control lands at224`,()=>{
 const present=fixture([col*16,plan.fall.spawnFeetY]);
 const omitted=fixture([col*16,plan.fall.spawnFeetY],[col]);
 present.step([],plan.fall.frames);omitted.step([],plan.fall.frames);
 assert.equal(present.player.y,plan.fall.groundFeetY);assert.equal(present.player.grounded,true);
 assert.equal(omitted.player.y,plan.fall.omittedGroundFeetY);assert.equal(omitted.player.grounded,true);
 assert.equal(present.frame,plan.fall.frames);assert.equal(present.phase,'play');assert.equal(present.lives,3);
});

for(const col of plan.background)test(`6-2 observed black cell ${col}/13 remains a fall-through pit in the declared map fixture`,()=>{
 const sim=fixture([col*16,plan.fall.spawnFeetY]);
 sim.step([],plan.fall.frames);
 assert.ok(sim.player.y>plan.fall.backgroundFeetYGreaterThan);assert.equal(sim.player.grounded,false);
 assert.equal(sim.frame,plan.fall.frames);assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

for(const route of plan.traversals)test('6-2 ordinary '+route.name+' remains supported across recovered139/140 instead of dipping into the raster-piece floor',()=>{
 const present=fixture(route.spawn as[number,number]);
 const omitted=fixture(route.spawn as[number,number],[139,140]);let oldDip=false;
 for(let frame=0;frame<route.frames;frame++){
  present.step(route.buttons as Button[],1);omitted.step(route.buttons as Button[],1);
  assert.equal(present.player.y,208);assert.equal(present.player.grounded,true);
  oldDip ||= omitted.player.y>208;
 }
 assert.equal(oldDip,true);assert.ok(present.player.x>=plan.traversalEndX.atLeast&&present.player.x<plan.traversalEndX.lessThan);
 assert.equal(present.frame,route.frames);assert.equal(present.phase,'play');assert.equal(present.lives,3);
});
