import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Jump vertical class (native rows of the recorded route: 544 jumps, first rise 5 = run class, 4 = walk class). The class is read from the speed the takeoff frame starts with (5 of 5 decelerating
// takeoffs across speed byte 25 are run jumps) and a jump taken inside the pause of a run-speed ground wall contact keeps the run class although the contact has cleared the speed byte (4 of 4 that
// the remake reproduces the contact of). y is the trace y byte (feet - 32); tolerance 1 px.
const run=(levelId:string,areaId:string,spawn:[number,number],camera:number,speed:number,frames:string[][])=>{
 const level=observedLevels().find(l=>l.id===levelId)!;
 const s=new Simulation([level]);s.reset(true);s.loadArea(areaId,spawn,camera);
 s.phase='play';s.phaseFrame=0;
 const p=(s as any).player;p.vx=speed/4096;(s as any).motor.speed=speed;
 const ys:number[]=[];
 for(const buttons of frames){s.step(buttons as any,1);ys.push(Math.floor(p.y)-32);}
 return ys.slice(ys.findIndex(y=>y<spawn[1]-32));
};
const near=(got:number[],native:number[])=>native.forEach((y,i)=>assert.ok(Math.abs(got[i]-y)<=1,`row ${i}: native ${y} got ${got[i]} (${got.slice(0,native.length)})`));
const hold=(buttons:string[],n:number)=>Array.from({length:n},()=>buttons);

test('7-1 jump one row after a run-speed wall contact keeps the run vertical class (rows 56987-56998)',()=>{
 const native=[91,86,81,76,72,68,64,60,56,53,49,46]; // takeoff row 56987: first rise 5 although the speed byte is 0 (contact row 56986)
 const got=run('7-1','main',[2652,128],2540,10260,[...hold(['right','b'],1),...hold(['right','a','b'],19)]);
 near(got,native);
});

test('4-2 jump out of a skid that crosses speed byte 25 on the takeoff frame is a run jump (rows 32896-32906)',()=>{
 const native=[139,134,129,124,120,116,112,108,104,101,97]; // speed 6572 (byte 25) at the start of the takeoff row, 6344 (byte 24) after it
 const got=run('4-2','area-3',[2781,176],2669,6850,hold(['left','a','b'],16));
 near(got,native);
});

test('6-2 jump from the pipe-top landing frame with a run-speed wall contact keeps the run class (rows 49813-49829)',()=>{
 const native=[155,150,145,140,136,132,128,124,120,117,113,110,107,104,101,98,96]; // first rise 5 (native 5,5,5,5,4...)
 const level=observedLevels().find(l=>l.id==='6-2')!;
 // Seeded from native row 49806 (feet 172 + sub-pixel 128/256, vy 4, run-class fall): the old feet 176 / vy 3.5 reached the pipe 5 px deep, where native (4 px deep at x 2084) still lands.
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[2070,172.5],1950);s.phase='play';s.phaseFrame=0;
 const p=(s as any).player;p.vx=10360/4096;(s as any).motor.speed=10360;(s as any).motor.airRun=true;p.vy=4;p.grounded=false;(s as any).runJump=true;(s as any).jumpArc=true;
 const ys:number[]=[];
 for(let i=0;i<30;i++){s.step((i<5?['right','b']:['right','a','b']) as any,1);ys.push(Math.floor(p.y)-32);}
 near(ys.slice(ys.findIndex((y,i)=>y===155&&ys[i-1]===160)),native);
});
