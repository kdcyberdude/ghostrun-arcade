import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fourThree from '../evidence/native-v2-four-three-opening.json';

// 4-3 v2 model run: the same pad bytes replayed one per PPU frame on the native NES from the saved entrance (fixture source and
// method in the JSON). Rows are the native state after each pad. Through row 382 every compared field now matches; the next
// difference (row 383) is the first balance lift's ride speed.
const nesButtons:Button[]=['a','b','select','start','up','down','left','right'];
function replay(fixture:typeof fourThree,frames:number,each:(sim:any,row:number)=>void){
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,fixture.entrance);sim.step([],0);sim.inputs=[];
 for(let f=0;f<frames;f++){sim.step(nesButtons.filter((_,b)=>fixture.pads[f]&(1<<b)),1);each(sim,f);}
 return sim;
}
const koopaSlot=(sim:any,slot:number)=>sim.enemies.find((e:any)=>e.active&&e.kind==='redKoopa'&&e.enemySlot===slot&&e.originX<500);

test('4-3 v2 replay matches the native timer, score, coins, death and Mario pixel through row 382',()=>{
 replay(fourThree,fourThree.rows.length,(sim,f)=>{
  const [time,score,coins,x,y,play,dead]=fourThree.rows[f];
  assert.deepEqual({time:sim.time,score:sim.score,coins:sim.coins,dead:Number(['dying','gameover'].includes(sim.phase))},{time,score,coins,dead},`row ${f}`);
  if(play)assert.deepEqual({x:Math.floor(sim.player.x),y:(Math.floor(sim.player.y)-32)&255},{x,y},`row ${f} position`);
 });
});

test('the entrance timer subphase comes from native GameTimerCtrl: $0787 = 16 ticks 300 -> 299 on row 15, not row 23',()=>{
 const times:number[]=[];replay(fourThree,24,sim=>times.push(sim.time));
 assert.equal(times[14],300);assert.equal(times[15],299);assert.equal(times[23],299);
});

test('a pipe-intro entrance keeps the level clock: native shows blank 000 digits during the 1-2 auto-walk',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 initializeEntrance(sim,{level:'1-2',engine:7,grounded:true,vy:0,fallForce:40,x:42.0625,y:208,speed:1672,facing:1,size:0,camera:0,time:0,score:15300,coins:11,lives:3,random:[216,87,231,72,134,23,27],counter:173,timerControl:0});
 assert.equal(sim.area.autoWalk!==undefined&&sim.area.autoWalk!==false,true);assert.equal(sim.time,400);assert.equal(sim.timerFrames,0);
});

test('an enemy spawn waits one frame after the scroll crosses a 32 px boundary (4-3 slot 1: native spawn row 116, first step row 117)',()=>{
 // Camera 157 -> 160 on row 114 crosses 160: native AreaParserTaskNum is 7 on row 115, so the Koopa at 464 spawns on row 116 (camera 165), not 115.
 const xs:(number|undefined)[]=[];replay(fourThree,187,(sim,f)=>{if(f>=115)xs[f]=koopaSlot(sim,1)?.x;});
 assert.equal(xs[116],undefined);assert.equal(xs[117],463.5);assert.equal(xs[186],429); // native 463.128 (463.5) and 429.0
});

test('a stomped Koopa keeps its position and the floatey points are paid five frames later (4-3 row 187 -> 192)',()=>{
 const rows:any[]=[];replay(fourThree,193,(sim,f)=>{if(f>=186)rows[f]={shell:koopaSlot(sim,0)?.shell,x:koopaSlot(sim,0)?.x,other:koopaSlot(sim,1)?.shell,score:sim.score,awarded:sim.awardedScore};});
 assert.deepEqual([rows[186].shell,rows[187].shell,rows[187].x,rows[187].other],[false,true,409,false]); // native slot 0 stays 409.0; slot 1 (dx 12) is untouched
 assert.equal(rows[187].score,193100);assert.equal(rows[187].awarded,193200); // the coin's 200 at once, the stomp's 100 pending
 assert.equal(rows[191].score,193100);assert.equal(rows[192].score,193200);
});
