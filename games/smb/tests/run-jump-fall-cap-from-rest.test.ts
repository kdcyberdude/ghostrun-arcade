import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level} from '../src/types.js';

// Native run jump from the ground at full run speed (recorded route 1-1 rows 901-925, the same rows at 2705-2728, 5695-5718 and 5-1 39131-39155): A held 6 rows, then the fall
// moves 0 1 1 2 2 3 3 4 4 4 px per row. The speed after 3.96875 + 0.5625 would be 4.53125; native moves 4, not 5, on all 17 aligned route rows, so such a step is capped to 4.
test('a run jump from rest falls 3 3 4 4, not 3 3 4 5 (native 1-1 rows 913-925)',()=>{
 const area:Area={id:'main',width:4096,palette:0,theme:'ground',tiles:[],enemies:[],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'run-fall-fixture',time:400,main:area.id,areas:[area],evidence:'run-jump fall cap regression only'};
 const s=new Simulation([level]);s.reset(true);
 const p=(s as any).player;
 // state after native row 913 (feet row 82 + 32): the remake's own arc of that jump has y fraction 0.375 and speed -1.09375 there
 Object.assign(p,{x:100,y:82.375+32,vx:10300/4096,vy:-1.09375,grounded:false});(s as any).motor.speed=10300;(s as any).runJump=true;(s as any).jumpArc=true;
 const deltas:number[]=[];let prev=Math.floor(p.y);
 for(let i=0;i<12;i++){s.step(['right','b'],1);const y=Math.floor(p.y);deltas.push(y-prev);prev=y;}
 assert.deepEqual(deltas,[-1,-1,0,1,1,2,2,3,3,4,4,4]);
});
