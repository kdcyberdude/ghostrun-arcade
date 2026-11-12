import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native excerpts from the retained explore model-play PPU rows (tools/harness/model-motor-rows.mjs; evidence/crouchmotor-findings-20261111.md).
const run=(steps:number,step:()=>number)=>Array.from({length:steps},step);

test('Down + a press along the motion doubles the friction step while Mario faces the other way (explore-r1 1-2 mood6 rows 1183-1186, 2-1 mood6 2555-2557)',()=>{
 const right=new NativeMotor();right.facing=-1;right.moving=1;right.speed=3672; // faced left on the ground, turned in the air, landed holding Down+Right+B
 assert.deepEqual(run(3,()=>right.groundDown(1,true)),[3368,3064,2760]);
 const left=new NativeMotor();left.facing=1;left.moving=-1;left.speed=-5000;
 assert.deepEqual(run(2,()=>left.groundDown(-1,true)),[-4696,-4392]);
 const facing=new NativeMotor();facing.facing=1;facing.moving=1;facing.speed=2700;
 assert.equal(facing.groundDown(1,true),2548,'facing along the motion keeps the single step');
});

test('Down at rest lines the motion up with the facing: the next press from 0 takes the walk step, not 304 (explore-r1 5-4 mood6 rows 993-1020)',()=>{
 const motor=new NativeMotor();motor.facing=1;motor.moving=-1;motor.speed=0;
 run(3,()=>motor.groundDown(0,true));
 assert.deepEqual(run(3,()=>motor.groundPress(1,false)),[152,304,456]);
 const without=new NativeMotor();without.facing=1;without.moving=-1;without.speed=0;
 assert.equal(without.groundPress(1,false),304,'without the Down spell the rest step stays doubled');
});

test('grounded Down frames do not refresh the run grace (explore-r1 1-3 mood1 rows 2752-2761: Down+Right+B 1824 -> 760, then Right walks 912, 1064, 1216)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 level.areas.find(a=>a.id==='main')!.enemies=[];
 const s=new Simulation([level]) as any;s.reset(true);s.loadArea('main',[1286,96],1200);s.phase='play';s.phaseFrame=0;
 Object.assign(s.player,{x:1286.3125,y:96,vx:1824/4096,vy:0,grounded:true,facing:1});
 Object.assign(s.motor,{speed:1824,facing:1,moving:1,runGrace:0});
 s.inputs=[new Set(['down','right','b']),new Set(['down','right','b'])];s.previous=new Set(['down','right','b']); // two frames of input latency are already queued
 const speeds:number[]=[];
 for(let i=0;i<5;i++){s.step(['down','right','b'],1);speeds.push(Math.round(s.player.vx*4096));}
 for(let i=0;i<5;i++){s.step(['right'],1);speeds.push(Math.round(s.player.vx*4096));}
 assert.deepEqual(speeds,[1672,1520,1368,1216,1064,912,760,912,1064,1216]);
});
