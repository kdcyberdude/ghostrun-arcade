import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows with RAM 0x500 (collision map), 0x416 (y sub-pixel), 0x70a (fall class), 0x785 (contact timer). Over 8 model runs and the human route the foot and side
// probes predict every contact and landing with no false positive; the falls below follow one law: position then speed, start speed 0, sub-pixel kept from the last landing.
const start=(levelId:string,spawn:[number,number],camera:number)=>{
 const s=new Simulation([structuredClone(observedLevels().find(l=>l.id===levelId)!)]);s.reset(true);s.loadArea('main',spawn,camera);s.phase='play';s.phaseFrame=0;s.area.enemies=[];(s as any).enemies=[];
 return {s,p:(s as any).player,m:(s as any).motor,sim:s as any};
};

test('feet 5 px or more into a cell push a falling Mario back instead of landing him (1-1 rows 1620-1624)',()=>{
 const {s,p,m,sim}=start('1-1',[3155+48/256,193+200/256],3043);sim.inputs=[new Set(['right','b']),new Set(['right','b'])];
 Object.assign(p,{vx:10464/4096,vy:4,grounded:false,facing:1});m.speed=10464;m.airRun=true;m.moving=1;m.facing=1;sim.runJump=true;sim.jumpArc=true;
 const native=[[3156,197,196],[3155,201,196],[3154,205,196]];
 for(const [x,feet,speed] of native){
  s.step(['right','b'],1);
  assert.equal(Math.floor(p.x),x,`x at feet ${feet}`);assert.equal(Math.floor(p.y),feet);assert.equal(Math.round(p.vx*4096),speed);assert.equal(p.grounded,false);
 }
 s.step(['right','b'],1);assert.equal(p.y,208);assert.equal(p.grounded,true);
});

test('a walk-off keeps speed 0 on its first air row and the sub-pixel of the last landing (1-1 rows 532-542, class 144)',()=>{
 const {s,p,m,sim}=start('1-1',[764.5,144],652);
 Object.assign(p,{vx:10412/4096,vy:0,grounded:true,facing:1});m.speed=10412;m.moving=1;m.facing=1;sim.landingFraction=80/256;sim.fallGravity=144/256;
 const native=[112,112,112,114,115,117,120,124,128,132,136];
 const got=native.map(()=>{s.step(['right','b'],1);return Math.floor(p.y)-32;});
 assert.deepEqual(got,native);
});

test('a fall before any jump of the area uses class 40 (1-4 rows 6884-6902)',()=>{
 const {s,p,m,sim}=start('1-4',[44+224/256,112],0);sim.inputs=[new Set(['right']),new Set(['right'])];
 Object.assign(p,{vx:3040/4096,vy:0,grounded:true,facing:1});m.speed=3040;m.moving=1;m.facing=1;
 const native=[80,80,80,80,80,81,82,83,84,85,87,88,90,92,94,96,98,101,103];
 const got=native.map(()=>{s.step(['right'],1);return Math.floor(p.y)-32;});
 assert.deepEqual(got,native);
});

test('the left foot is x+3 whatever the motion (no native landing of 1,887 rests on x+2 alone)',()=>{
 const {s,p,m,sim}=start('1-1',[767.1,143],652);
 Object.assign(p,{vx:-256/4096,vy:2,grounded:false,facing:-1});m.speed=-256;m.moving=-1;m.facing=-1;sim.jumpArc=true;
 s.step([],1);
 assert.equal(p.grounded,false);
});

// Free-play model run explore-r2 1-3 mood1 (one PPU frame per row, exact sub-pixel x): the speed after gravity is no longer upward on row 992, Mario moves up 1 px (feet 83)
// and lands on the tree top at feet 80 that row; the remake ran the head probe and landed a row late. 35 such rows in 256 runs, the remake missed all of them.
test('a run jump whose apex row still moves up 1 px lands on the floor top 3 px above its feet (free-play 1-3 rows 982-993)',()=>{
 const {s,p,m,sim}=start('1-3',[2236+112/256,112],2124);sim.inputs=[new Set(['a']),new Set()];
 Object.assign(p,{vx:10224/4096,vy:0,grounded:true,facing:1});m.speed=10224;m.moving=1;m.facing=1;
 const native=[[2238,75],[2241,70],[2243,65],[2246,62],[2248,59],[2251,56],[2253,54],[2255,52],[2258,52],[2260,48],[2263,48]];
 const got=native.map(()=>{s.step(['a'],1);return [Math.floor(p.x),Math.floor(p.y)-32];});
 assert.deepEqual(got.map(r=>r[1]),native.map(r=>r[1]));
 assert.ok(got.every((r,i)=>Math.abs(r[0]-native[i][0])<=1));
 assert.equal(p.grounded,true);assert.equal(m.speed,10016);
});
