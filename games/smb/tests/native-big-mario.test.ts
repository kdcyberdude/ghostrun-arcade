import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows of big Mario in 1-1 (probes evidence/local/power/{b1,c1rows}.jsonl, from a checkpoint after the first mushroom; y is native y = feet - 32). See evidence/power-findings-20261111.md.
const big=(x:number)=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const s:any=new Simulation([level]);s.reset(true);s.enemies=[];s.player.size=1;s.player.x=x+0.25;s.camera=Math.max(0,x-112);
 return s;
};
const jump=(s:any,pre:string[][],hold:string[])=>{
 for(const b of pre)s.step(b,1);
 const ys:number[]=[];
 for(let k=0;k<60;k++){s.step(hold,1);const y=Math.floor(s.player.y)-32;if(y<176||ys.length)ys.push(y);if(ys.length&&y===176)break;}
 return ys;
};
const near=(got:number[],native:number[])=>native.forEach((y,i)=>assert.ok(Math.abs(got[i]-y)<=1,`row ${i}: native ${y} got ${got[i]} (${got})`));

test('big Mario breaks a brick at feet - ceiling 25, rises on at speed -2 and bumps the broken cell on the next row',()=>{
 const s=big(353),score=s.score;
 near(jump(s,[],['a']),[172,168,164,160,157,153,152,154,156,159,162,166,170,174,176]);
 assert.equal(s.score,score+50);assert.equal(s.tiles.has('22,9'),false);
});

test('big Mario under a used block: bump at the same height, speed 1, nothing breaks',()=>{
 const s=big(364);s.tiles.set('23,9',196);
 near(jump(s,[],['a']),[172,168,164,160,157,153,155,157,160,163,167,170,175,176]);
 assert.equal(s.tiles.get('23,9'),196);
});

test('a crouched jump keeps the crouched head probe up to the block and through the air',()=>{
 const brick=big(353);
 near(jump(brick,[['down'],['down'],['down']],['down','a']),[172,168,164,160,157,153,150,147,144,141,139,141,143,145,148,151,154,158,163,167,171,175,176]);
 assert.equal(brick.tiles.has('22,9'),false);
 const used=big(364);used.tiles.set('23,9',196);
 near(jump(used,[['down'],['down'],['down']],['down','a']),[172,168,164,160,157,153,150,147,144,141,142,144,146,149,152,155,159,163,167,172,176]);
 // djrel: Down released after takeoff, the head stays crouched.
 const released=big(364);released.tiles.set('23,9',196);
 for(const b of [['down'],['down'],['down']])released.step(b,1);
 const ys:number[]=[];for(let k=0;k<14;k++){released.step(k<6?['down','a']:['a'],1);ys.push(Math.floor(released.player.y)-32);}
 near(ys.slice(ys.findIndex(y=>y<176)),[172,168,164,160,157,153,150,147,144,141,142]);
});

test('a ducking big Mario stops dead once the speed byte is 10 or less (rows -2576, -2424, 0)',()=>{
 const s=big(434);s.player.vx=-2576/4096;s.motor.speed=-2576;
 s.inputs=[new Set(['down']),new Set(['down'])];
 s.step(['down'],1);assert.equal(Math.round(s.player.vx*4096),-2424);
 s.step(['down'],1);assert.equal(s.player.vx,0);
});

test('big Mario landing moving left needs floor(x) + 3 on the block (x 397 misses, x 396 lands on the column ending at 400)',()=>{
 for(const [x,lands] of [[397,false],[396,true]] as const){
  const s=big(x);s.player.x=x+0.9;s.player.y=143;s.player.vx=-0.05;s.player.vy=2;s.player.grounded=false;(s as any).motor.speed=-205;
  s.step([],1);assert.equal(s.player.grounded,lands);
 }
});

// Fire Mario rows (evidence/local/power/f1.jsonl walkright/shot1): launched at native y + 4 after the first step of 4, x + 8 facing right, x facing left.
const fire=(x:number,y:number)=>{const s=big(x);s.player.size=2;s.player.x=x;s.player.y=y+32;s.tiles.set('77,9',81);s.tiles.set('78,9',196);s.camera=x-63;return s;};
const balls=(s:any)=>s.items.filter((i:any)=>i.kind==='fireball');

test('a fireball launches at x + 8 facing right, x facing left, native y + 4',()=>{
 for(const [facing,dx] of [[1,8],[-1,0]] as const){
  const s=fire(520,176);s.camera=420;s.player.facing=facing;
  for(let k=0;k<4&&!balls(s).length;k++)s.step(['b'],1);
  const b=balls(s)[0];assert.equal(Math.floor(b.x),520+dx);assert.equal(Math.floor(b.y),180);
 }
});

test('fire arc on the bricks: y rows of walkright reproduced, bounce -3 at the floor',()=>{
 const native=[116,120,123,126,129,132,135,139,142,145,148,151,154,158,161,164,167,170,173,177,180,183,186,189,192,196,199,200,197,194,192,190,188,187,185,185,184,184,184,185,185,186,188,189,191,194,196,199,200];
 const s:any=new Simulation([{id:'fx',time:400,main:'main',evidence:'fixture',areas:[{id:'main',width:4096,palette:0,theme:'ground',tiles:[...Array.from({length:256},(_,x)=>[x,13,84]),...Array.from({length:40},(_,k)=>[10+k,9,84])],enemies:[],spawn:[200,144]}]} as any]);
 s.reset(true);s.player.size=2;s.player.facing=1;s.player.x=200;s.player.y=144;s.camera=100;
 for(let k=0;k<3&&!balls(s).length;k++)s.step(['b'],1);
 const b=balls(s)[0];b.x=900;s.camera=800; // a clear column over the floor
 const ys=[Math.floor(b.y)];for(let k=1;k<native.length;k++){s.camera=b.x-100;s.step([],1);ys.push(Math.floor(b.y));}
 native.forEach((y,k)=>assert.ok(Math.abs(ys[k]-y)<=1,`row ${k}: native ${y} got ${ys[k]} (${ys})`));
});

test('at most two fireballs, none while crouched, gone at the screen edges',()=>{
 const s=fire(520,176);s.camera=420;s.player.facing=1;
 s.step(['down'],3);s.step(['down','b'],3);assert.equal(balls(s).length,0);
 s.step([],3);for(let k=0;k<6;k++){s.step(['b'],1);s.step([],1);}
 assert.equal(balls(s).length,2);
 balls(s)[0].x=420+247;balls(s)[0].vx=4;s.step([],1);assert.equal(balls(s).length,1);
 balls(s)[0].x=422;balls(s)[0].vx=-4;s.step([],1);assert.equal(balls(s).length,0);
});

test('a star falls and bounces on the native low-gravity arc (rows of starmove, apex 43 px above the floor)',()=>{
 const native=[184,181,178,175,172,170,167,165,163,161,159,157,155,153,152,150,149,148,146,145,144,144,143,142,142,142,141,141,141,141,141,142,142,142,143,144,145,146,147,148,149,150,152,153,155,157,159,161];
 const s:any=new Simulation([{id:'fx',time:400,main:'main',evidence:'fixture',areas:[{id:'main',width:4096,palette:0,theme:'ground',tiles:Array.from({length:256},(_,x)=>[x,13,84]),enemies:[],spawn:[40,208]}]} as any]);
 s.reset(true);s.items.push({kind:'star',x:400,y:189,vx:1,vy:3,age:32,life:2000});s.camera=300;
 const star=s.items[0];while(star.y<192)s.step([],1);
 const ys=[Math.floor(star.y)-8];for(let k=1;k<native.length;k++){s.step([],1);ys.push(Math.floor(star.y)-8);}
 native.forEach((y,k)=>assert.ok(Math.abs(ys[k]-y)<=2,`row ${k}: native ${y} got ${ys[k]} (${ys})`));
});
