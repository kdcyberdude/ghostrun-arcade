import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

function game(){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:3400,palette:0,theme:'ground',tiles,enemies:[],spawn:[40,208],springs:[{x:3008,y:200}],evidence:'Mechanic fixture; rows from native 2-1 trace frames 10254-10267'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[3000,160],2880);return sim;
}

const keys=['up','down','left','right','a','b'] as const;
const held=(m:number)=>keys.filter((_,i)=>m&(1<<i));
// Native branches from the 2-1 spring (probe plan: replay route to frame 10250, save, run the inputs below; rows are probe rows 4..33).
// Inputs are right+B (mask 40) with A (mask 56) per probe-row index set; probe row 3 is the last row before contact.
function ys(aRows:number[]){
 const sim=game();const p=sim.player;
 p.x=3018.5;p.y=172.5;p.vy=4.5;p.vx=10316/4096;sim.camera=2880;p.grounded=false;(sim as any).motor.speed=10316;(sim as any).motor.airRun=true;(sim as any).runJump=true;(sim as any).landJump='held';
 const mask=(i:number)=>aRows.includes(i)?56:40;
 (sim as any).inputs=[new Set(held(mask(4))),new Set(held(mask(5)))];
 const out:number[]=[];
 for(let i=4;i<34;i++){sim.step(held(mask(i+2)) as any,1);out.push(Math.floor(sim.player.y)-32);}
 return out;
}
const SINK=[144,146,148,150,152,154,156,158,160,158,156,154,152,150];
const LOW=[...SINK,143,136,130,125,120,116,112,109,107,105,103,103,102,103,104,105];
const HIGH=[...SINK,138,126,115,105,95,86,77,69,62,55,48,43,37,33,29,25];
const range=(a:number,b:number)=>Array.from({length:b-a+1},(_,i)=>a+i);

test('native 2-1 spring: A never pressed launches at vy -7 (gravity 0.5625, rows equal native)',()=>assert.deepEqual(ys([]),LOW));
test('native 2-1 spring: A held from before contact (no press edge) is still the low launch',()=>assert.deepEqual(ys(range(0,40)),LOW));
test('native 2-1 spring: A pressed on compression row 7 (too early) is the low launch',()=>assert.deepEqual(ys([7]),LOW));
test('native 2-1 spring: A pressed on compression rows 8..16 launches at vy -12 (recorded press on row 11, held)',()=>{
 assert.deepEqual(ys(range(11,40)),HIGH);assert.deepEqual(ys([8]),HIGH);assert.deepEqual(ys([16]),HIGH);
});
test('native 2-1 spring: A pressed on the launch row itself is an ordinary jump (y 145,140,135,130; the 5th row is 1 px off, open)',()=>{
 assert.deepEqual(ys(range(17,40)).slice(0,17),[...SINK.slice(0,13),145,140,135,130]);
});
