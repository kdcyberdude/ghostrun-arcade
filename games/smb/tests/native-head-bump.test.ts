import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native head bumps of a small Mario (recorded route; y is the trace y byte, feet - 32). The native rule measured from the 46 castle ceiling bumps of the route: the head probe is 14 px above
// the feet, the speed after the bump is 1 plus the fraction of the speed that hit (0 plus the fraction for a brick / question / used block), the jump class (run gravity 0.5625) is kept, there
// is no snap to the ceiling, and a jump that only touches a ceiling at its apex (speed turning non-negative this frame) is not a bump. The legacy rule snapped, fell on gravity 0.4375 and ended
// 5-16 px behind. Tolerance 1 px: the native fall cap lets the speed overshoot 4 for one row (not modelled, 1 px).
// noEnemies: the fresh load spawns the 1-1 Goomba at x 343 in Mario's path; on the native route row 145 it is at x 315, behind Mario.
const run=(levelId:string,areaId:string,spawn:[number,number],camera:number,speed:number,frames:string[][],noEnemies=false)=>{
 const level=observedLevels().find(l=>l.id===levelId)!;
 const s=new Simulation([level]);s.reset(true);s.loadArea(areaId,spawn,camera);if(noEnemies)(s as any).enemies=[];
 s.phase='play';s.phaseFrame=0;
 const p=(s as any).player;p.vx=speed/4096;(s as any).motor.speed=speed;
 const ys:number[]=[];
 for(const buttons of frames){s.step(buttons as any,1);ys.push(Math.floor(p.y)-32);}
 const takeoff=ys.findIndex(y=>y<spawn[1]-32);
 return ys.slice(takeoff);
};
const near=(got:number[],native:number[],tolerance:number)=>native.forEach((y,i)=>assert.ok(Math.abs(got[i]-y)<=tolerance,`row ${i}: native ${y} got ${got[i]} (${got.slice(0,native.length)})`));
const hold=(buttons:string[],n:number)=>Array.from({length:n},()=>buttons);

test('2-4 run jump into the castle ceiling (rows 19434-19452): speed 1.25 and run gravity after the bump',()=>{
 const native=[171,166,161,156,152,148,144,140,141,143,145,148,152,156,160,164,168,172]; // row 19434 = takeoff, bump on the 8th row (y 140)
 const got=run('2-4','main',[1064,208],952,10268,hold(['a'],24));
 near(got,native,1);
 assert.deepEqual(got.slice(7,12),[140,141,143,145,148],'the rows right after the bump are exact');
});

test('4-4 start: walk-class jump into the castle ceiling (rows 36269-36283)',()=>{
 const native=[76,72,68,64,61,62,64,67,70,73,77,81,85,90,94]; // 61 = bump row; walk-class gravity 0.4375 after it
 const got=run('4-4','main',[40,112],0,0,[...hold(['right','b'],5),...hold(['right','a','b'],7),...hold(['right','b'],10)]);
 near(got,native,1);
 assert.deepEqual(got.slice(4,8),[61,62,64,67],'the rows right after the bump are exact');
});

test('1-1 brick bump from a run jump (rows 128-148): speed byte 0 after a hit block',()=>{
 const native=[171,166,161,156,152,148,144,140,140,141,142,144,147,150,153,158,162,166,170,174];
 const got=run('1-1','main',[302,208],190,10344,hold(['right','a','b'],24),true);
 near(got,native,2);
 // the speed after the bump keeps the fraction of the speed after this row's gravity (0.25 here, not 0.09375 of the speed that hit): every row exact
 assert.deepEqual(got.slice(0,native.length),native,'all rows exact');
});

test('1-2 area 2 run jump that only touches the brick ceiling at its apex is not a bump (rows 2810-2842)',()=>{
 const native=[75,70,65,60,56,52,48,44,40,37,34,32,31,30,29,30,30,32,34,36,39,43,47,51,55,59,63,67,71,75,79,83];
 const got=run('1-2','area-2',[694,112],582,10384,[...hold(['right','a','b'],8),...hold(['right','b'],30)]);
 near(got,native,1);
});

test('1-2 area 2 run jump into the used-block row (free play explore-r4 1-2 mood0 rows 89-106): the bump keeps the fraction after gravity',()=>{
 // A released on the 5th row: the speed that hits is -2.125 (fraction 0.875), after the run-fall gravity 0.5625 it is -1.5625 (fraction 0.4375); native falls 1,1,1,2,3,3,4,4 px after the bump row (y 140)
 const native=[171,166,161,156,152,148,145,142,140,141,142,143,145,148,151,155,159,163];
 const got=run('1-2','area-2',[166,208],80,10404,[...hold(['right','b'],3),['right'],['right','a','b'],['right','a'],['right','a','b'],['right','a'],...hold(['down','right','b'],20)],true);
 assert.deepEqual(got.slice(0,native.length),native);
});
