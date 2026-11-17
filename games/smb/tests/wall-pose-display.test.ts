import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function game(){const sim=new Simulation(observedLevels());sim.reset(true);sim.step([],1);return sim;}
function displayedCell(sim:Simulation){const pose=sim.locomotionPose;return pose.kind==='walk'?12+pose.frame:pose.kind==='stand'?23:pose.kind==='skid'?15:16;}

test('held left edge cycles the measured walk artwork, then stands',()=>{
 const sim=game();sim.step(['right','b'],9);sim.step(['left','b'],45);
 // run9-release source frames 55,60,67,74; the player is grounded at the left screen edge (pixel 0). The edge keeps the x fraction and
 // the speed byte (native 4-4 rows 2597..2599, 7798c7e), so the cells come from native ProcessPlayerAction (Left held: the walk action).
 for(const [frames,frame,cell] of [[0,55,12],[5,60,13],[7,67,14],[7,74,12]]){
  sim.step(['left','b'],frames);assert.equal(sim.frame,frame);assert.equal(Math.floor(sim.player.x),0);assert.ok(sim.player.vx>=0);
  assert.equal(sim.player.grounded,true);assert.equal(displayedCell(sim),cell);
 }
 sim.step(['left','b'],6);sim.step([],3);
 assert.equal(sim.frame,83);assert.equal(displayedCell(sim),23);

 // The source's right-facing artwork is visible by frame 80; exact cell timing
 // after reversal still differs and is not asserted here.
 const reverse=game();reverse.step(['right','b'],11);reverse.step(['left','b'],65);assert.equal(Math.floor(reverse.player.x),0);
 reverse.step(['right','b'],3);assert.equal(reverse.frame,80);
 assert.equal(reverse.locomotionPose.facing,1);assert.ok(reverse.player.vx>0);
});
