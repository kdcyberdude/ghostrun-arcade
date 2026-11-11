import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Run-class jump fall (native rows 23882-23894 of the recorded 3-2 route, a stomp bounce that keeps the 0.5625 gravity; the same row deltas appear at 21460, 23894, 39174 and 70294): the fall cap (4) is checked against the speed BEFORE the
// gravity step, so the step 3 3 4 is followed by one 5 row before the cap holds. A cap applied after the step (4.125) gives 4 4 and lands one row early.
test('run-class fall overshoots the cap by one gravity step: row deltas 3 3 4 5',()=>{
 const level=observedLevels().find(l=>l.id==='2-1')!;
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[1000,176],900);s.phase='play';s.phaseFrame=0;
 const p=(s as any).player;p.vx=10416/4096;(s as any).motor.speed=10416;
 // state after native row 23881: feet row 158, vy -2.359375 (fit of the 13 row deltas), run class, airborne
 p.y=158+32+13/16;p.vy=-2.359375;p.grounded=false;(s as any).runJump=true;
 const deltas:number[]=[];let prev=Math.floor(p.y);
 for(let i=0;i<13;i++){s.step(['right','b'],1);const y=Math.floor(p.y);deltas.push(y-prev);prev=y;}
 assert.deepEqual(deltas,[-2,-2,-1,-1,0,1,1,1,2,3,3,4,5]);
});
