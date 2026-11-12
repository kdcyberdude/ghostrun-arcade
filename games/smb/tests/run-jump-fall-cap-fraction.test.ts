import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level} from '../src/types.js';

// Native run-jump fall cap (free-play model traces, one native frame per row): after the gravity step a speed of 4 or more whose fraction is 0.5 or more is set to exactly 4;
// a step that lands on 5.0-5.4375 is NOT capped that row, so one 5 px row follows (fall bytes 3 3 4 5 4 4). The old rule (cap whenever the speed BEFORE gravity was >= 4)
// gave 4 there: one-step vertical score bucket 'nat vy4>5' was 69 of 361 missed spells on explore-r2, 73/244 on r1, 39/143 on w0; this rule fixes all of them, no new miss.
// Rows: explore-r2/1-2/mood2 893-904 (feet y 52 52 53 55 57 60 63 67 72 77 81 85, vy bytes 0 1 1 2 2 3 3 4 5 4 4 4), pads down+right(+A).
// State after row 893 (run class, falling from the apex): the only 1/16-grid speed that fits all 11 deltas is 0.5 (+0.5625 per row), feet fraction 0.25-0.375.
test('a run-jump fall reaching 5.0x keeps it one row: fall moves 3 3 4 5 5 4 (native 1-2 free play rows 898-904)',()=>{
 const area:Area={id:'main',width:4096,palette:0,theme:'ground',tiles:[],enemies:[],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'run-fall-fraction-fixture',time:400,main:area.id,areas:[area],evidence:'run-jump fall cap fraction regression only'};
 const s=new Simulation([level]);s.reset(true);
 const sim=s as any,p=sim.player;
 Object.assign(p,{x:100,y:52.3125+32,vx:10356/4096,vy:0.5,grounded:false});sim.motor.speed=10356;sim.runJump=true;sim.jumpArc=true;
 const deltas:number[]=[],bytes:number[]=[];let prev=Math.floor(p.y);
 for(let i=0;i<11;i++){s.step(i%2?['down','right','a']:['down','right'],1);const y=Math.floor(p.y);deltas.push(y-prev);bytes.push(Math.floor(p.vy));prev=y;}
 assert.deepEqual(deltas,[0,1,2,2,3,3,4,5,5,4,4]);
 assert.deepEqual(bytes,[1,1,2,2,3,3,4,5,4,4,4]);
});
