import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native r6 4-2 mood2 rows 708-712 (area-3 bonus pipe, x 1360 y 160): Down+B held, row 709 x 1355 y 127 vy 4 (still falling), row 710 lands at x 1358,
// rows 711-712 x 1360/1363 on the pipe top; native never enters the pipe. The remake entered on row 709, one row before landing.
function sim(x:number,y:number,vx:number,vy:number,grounded:boolean){
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';
 const s=new Simulation([level]);s.reset(true);s.loadArea('area-3',[x,96],1240);s.step(['down','b'],3); // Down already held (input latency)
 s.player.x=x;s.player.y=y;s.player.vx=vx;s.player.vy=vy;s.player.grounded=grounded;return s;
}
test('a falling Mario one row above a down-pipe top does not enter it (native 4-2 r6 mood2 row 709)',()=>{
 // remake end of row 708 (x 1353.4375, y 155.9375, falling at 4 px/row, 2.5 px/row right) with Down+B; rows 709-713 must not enter (native lands at x 1358).
 const s=sim(1353.4375,155.9375,2.5,3.875,false);for(let i=0;i<5;i++){s.step(['down','b'],1);assert.notEqual(s.phase,'pipe',`row ${709+i}`);}
});
test('a Mario standing on the down-pipe top inside the entry range still enters',()=>{
 const s=sim(1355.9375,160,0,0,true);s.step(['down'],3);assert.equal(s.phase,'pipe');
});
