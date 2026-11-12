import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,solid} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import plan from '../data/lower-next-six-two-continuation-fixtures.json';

function fixture(kind:'fall'|'wall',omit=false){
 const level=structuredClone(observedLevels().find(l=>l.id===plan.level)!);
 const main=level.areas.find(a=>a.id===plan.area)!;
 const spec=plan[kind];main.spawn=spec.spawn as[number,number];main.spawnVelocity=spec.velocity as[number,number];
 main.camera=plan.camera;main.enemies=[];main.generators=[];main.exit=undefined;
 if(omit)main.tiles=main.tiles.filter(([col,row,id])=>col!==153||row!==13||id!==84);
 for(const pipe of plan.pipeTiles)assert.ok(main.tiles.some(tile=>JSON.stringify(tile)===JSON.stringify(pipe)));
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('6-2 black152pit retains an ordinary fall below224 without modifying its neighboring pipe',()=>{
 const sim=fixture('fall');sim.step([],plan.fall.frames);
 assert.ok(sim.player.y>plan.fall.endFeetYGreaterThan);assert.equal(sim.player.grounded,false);
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);assert.equal(sim.frame,plan.fall.frames);
});

test('6-2 ground153base blocks ordinary horizontal momentum below the unchanged pipe; omitted-cell control crosses',()=>{
 const present=fixture('wall'),omitted=fixture('wall',true);
 for(let frame=1;frame<=plan.wall.frames;frame++){
  present.step(plan.wall.buttons as Button[],1);omitted.step(plan.wall.buttons as Button[],1);
  assert.ok(present.player.y-present.height>=plan.wall.pipeBottom);assert.ok(omitted.player.y-omitted.height>=plan.wall.pipeBottom);
  if(frame===plan.wall.contactAfterFrames){
   // The native-speed motor backs out of a wall one pixel on the contact frame and clears only the speed byte (declared
   // fixture constants predate it: contactX was the tile-edge snap, so one pixel less deep).
   assert.equal(present.player.x,plan.wall.contactX+1);assert.equal(Math.floor(present.player.vx*16),0);
   assert.equal(omitted.player.x,plan.wall.omittedContactX);assert.equal(Math.floor(omitted.player.vx*16),40);
  }
 }
 assert.ok(omitted.player.x>present.player.x+4);assert.equal(present.frame,4);assert.equal(present.phase,'play');assert.equal(present.lives,3);
});

test('6-2 base tile/class query identifies only the newly recovered153/13cell as solid',()=>{
 const present=fixture('wall'),omitted=fixture('wall',true),[x,y]=plan.query.point;
 assert.equal(present.tileAt(x,y),84);assert.equal(solid(present.tileAt(x,y)),true);
 assert.equal(omitted.tileAt(x,y),0);assert.equal(solid(omitted.tileAt(x,y)),false);
 assert.equal(present.frame,0);assert.equal(omitted.frame,0);
});
