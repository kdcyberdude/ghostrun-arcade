import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows (mood-1 model run, RAM 0x71a-0x71c screen-left, native f1213 -> f1214 in 1-1): Mario x 2370 (sub 208) at screen x 117 runs
// into the wall at speed 10080 (about 2.5 px): x 2372, screen-left 2253 -> 2256 = floor(attempted x) - floor(old x) = 3, with no catch-up to
// screen x 112 (which would give 2261). Seeded from the native row like tools/campaign-compare.ts.
test('a wall contact frame with Mario ahead of screen x 112 scrolls by the attempted movement, not to x-112',()=>{
 const sim=new Simulation(observedLevels());sim.reset(true);
 const p=sim.player;p.x=2370+208/256;p.y=160+32;p.vx=10080/4096;(sim as any).motor.speed=10080;p.vy=0;p.grounded=true;sim.camera=2253;
 sim.step(['up','a','b'],1);
 assert.equal(Math.floor(p.x),2372);
 assert.equal(sim.camera,2256);
});
