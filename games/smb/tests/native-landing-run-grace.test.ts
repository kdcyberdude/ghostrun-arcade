import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows (free-play model run explore-r4 1-1 mood0, rows 1465-1470): a run-speed jump falls with B pressed on every other row and lands on
// row 1467 (B held). Row 1468 has no B: the speed drops to the walk cap at once (10436 -> 6292, byte 24, fraction - 48), so an airborne B does
// not refresh the run grace (r3+r4: 203 of 203 such landings clamp; the remake kept the run speed and decayed 28 per row). Row 1469 presses B
// again: the step is the run step 228, not the repeated 208 walk step after a drop (r3+r4: 177 of 184 rows after a walk-cap clamp).
// Seeded from native row 1464 like tools/campaign-compare.ts (MODEL_LOCAL: exact sub-pixel x).
test('an airborne B keeps no run grace for the landing; a B press after the walk-cap drop steps 228 (1-1 free play rows 1465-1470)',()=>{
 const level=observedLevels().find(l=>l.id==='1-1')!;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[3120,196],3000);
 const s=sim as any,p=sim.player;
 p.x=3120+3/16;p.y=164+32;p.vx=10264/4096;s.motor.speed=10264;s.motor.airRun=true;s.motor.airDrop=true;s.motor.runGrace=0;p.vy=4;p.grounded=false;
 s.runJump=true;s.jumpArc=true;s.landJump='released';s.fallGravity=0.5625;sim.camera=3000;s.inputs=[new Set(['right','b']),new Set(['right'])];
 const rows:number[]=[];
 for(const input of [['up','right','b'],['up','right'],['up','right','b'],['up','right'],['right','b'],['right']]){sim.step(input as any,1);rows.push(Math.round(p.vx*4096));}
 assert.deepEqual(rows,[10492,10464,10436,6292,6520,6748]); // the old grace refresh in the air gave ..., 10436, 10408, ...
});
