import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeMotor} from '../src/native-motor.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native excerpts from the explore model-play PPU rows (tools/harness/model-motor-rows.mjs; evidence/hdrift6-findings-20261111.md).

test('a B skid against the motion leaves no run grace (explore-r4 7-4 mood5 rows 3392-3398: LB 4936 -> 4520, then R steps 416, 152, 152)',()=>{
 const motor=new NativeMotor();motor.speed=4520;motor.facing=1;motor.moving=1;
 assert.equal(motor.updateRun(-1,true),true,'B itself still runs');
 motor.speed=4104;
 assert.equal(motor.updateRun(1,false),false,'the release after the skid walks');
 const along=new NativeMotor();along.speed=4520;along.updateRun(1,true);
 assert.equal(along.updateRun(1,false),true,'a B press along the motion keeps the grace');
});

test('small Mario holding Down stops at byte 10 in any area (explore-r6 6-2 mood0 rows 143-146: Down+B 3068 2916 2764 -> 0)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='6-2')!);
 const area=level.areas.find(a=>a.id==='main')!;area.enemies=[];
 assert.ok(!area.smallPlayerDownStop,'6-2 main is not one of the calibrated areas');
 const s=new Simulation([level]) as any;s.reset(true);s.phase='play';s.phaseFrame=0;
 Object.assign(s.player,{vx:3068/4096,vy:0,grounded:true,facing:1,size:0});
 Object.assign(s.motor,{speed:3068,facing:1,moving:1,runGrace:0,friction:152});
 s.inputs=[new Set(['down','b']),new Set(['down','b'])];s.previous=new Set(['down','b']);
 const speeds:number[]=[];
 for(let i=0;i<4;i++){s.step(['down','b'],1);speeds.push(Math.round(s.player.vx*4096));}
 assert.deepEqual(speeds,[2916,2764,0,0]);
});
