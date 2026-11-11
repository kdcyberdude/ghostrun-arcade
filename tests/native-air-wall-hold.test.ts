import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows (free-play model run explore-r3 3-1 mood7, rows 149-154): a rising run jump with A held meets the wall at x 338. The contact row
// keeps only the fraction of the speed (10288 -> 20), the next row holds it, then the along-press steps again (+208 per row): 20, 20, 228, 436, 644.
// Free play r3: 1,189 of 1,203 air contacts below speed byte 9 hold exactly one row, with or without A/B (the remake used to hold 3 rows with A held).
// Seeded from native row 149 like tools/campaign-compare.ts (MODEL_LOCAL: exact sub-pixel x).
test('an air wall contact with A held holds the kept fraction one row, then steps (3-1 free play rows 150-154)',()=>{
 const level=observedLevels().find(l=>l.id==='3-1')!;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[337,144],200);
 const s=sim as any,p=sim.player;
 p.x=337+16/256;p.y=112+32;p.vx=10288/4096;s.motor.speed=10288;s.motor.airRun=true;s.motor.airDrop=true;p.vy=-2.5;p.grounded=false;
 s.runJump=true;s.jumpArc=true;s.landJump='held';s.fallGravity=0.5625;sim.camera=200;s.inputs=[new Set(['down','right','a']),new Set(['down','right','a'])]; // the row before was held the same (the remake applies a press one row late)
 const rows:number[]=[];
 for(const input of [['down','right','a'],['down','right','a'],['down','right','a'],['right','a'],['right','a']]){sim.step(input as any,1);rows.push(Math.round(p.vx*4096));}
 assert.deepEqual(rows,[20,20,228,436,644]); // the old A-held air hold gave 20, 20, 20, 228, 436
});
