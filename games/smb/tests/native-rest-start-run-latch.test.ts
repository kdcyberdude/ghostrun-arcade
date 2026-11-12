import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native explore-r3 2-3 mood1 rows 9-14 (model run from the level checkpoint, pad acting on its own row): right+B from rest after the load steps 304, then
// right alone steps +152 (the B of the start row did not latch the run step), right+B +228, right alone +228 (latched now), ...: speeds 304 456 684 912 1140 1368.
// Across all model runs, B on a 304 start and not on the next row: next step 152 in 124 of 134; on a start along the last motion (228): 228 in 119 of 119.
const start=(moving:-1|0|1)=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='2-3')!);
 for(const a of level.areas)a.enemies=[];
 const s=new Simulation([level]) as any;s.reset(true);s.loadArea('main');s.phase='play';s.phaseFrame=0;
 Object.assign(s.player,{x:40,y:208,vx:0,vy:0,grounded:true,facing:1});
 s.motor.reset();s.motor.moving=moving;s.motor.facing=moving;
 return s;
};
const run=(s:any,pads:string[][])=>{s.inputs=[new Set(pads[0]),new Set(pads[1])];const out:number[]=[];for(let i=0;i<pads.length;i++){s.step(pads[i+2]??pads[pads.length-1],1);out.push(Math.round(s.player.vx*4096));}return out;};

test('a 304 start from rest after a load does not latch the run step of its B (native r3 2-3 rows 9-14)',()=>{
 const pads=[['right','b'],['right'],['right','b'],['right'],['right','b'],['right']];
 assert.deepEqual(run(start(0),pads),[304,456,684,912,1140,1368]);
});

test('a start along the last motion (228) latches its B as before',()=>{
 assert.deepEqual(run(start(1),[['right','b'],['right'],['right']]),[228,456,684]);
});
