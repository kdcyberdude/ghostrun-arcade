import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {playerCell} from '../src/player-cell.js';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-victory-events.json',import.meta.url),'utf8'));
const controlRows=new Map(fixture.events.map((e:any)=>[`${e.level}:${e.frame}`,{before:e.before,after:e.after}]));
const signed=(v:number)=>(v<<24)>>24;
const digits=(r:Buffer,a:number,n:number)=>Array.from(r.subarray(a,a+n)).reduce((v,d)=>v*10+d,0);
for(const run of fixture.runtime)test(`${run.level}: every mode2 Mario, camera and task row from native victory entry`,()=>{
 const sim:any=new Simulation(observedLevels()),r=Buffer.from(run.ram,'base64');sim.levelIndex=sim.levels.findIndex((l:any)=>l.id===run.level);sim.reset(true);
 sim.levelIndex=sim.levels.findIndex((l:any)=>l.id===run.level);sim.loadArea(sim.level.main);
 Object.assign(sim.player,{x:r[0x6d]*256+r[0x86]+r[0x400]/256,y:r[0xce]+32+r[0x416]/256,vx:(signed(r[0x57])*256+r[0x705])/4096,vy:signed(r[0x9f])+r[0x433]/256,grounded:r[0x1d]===0,size:r[0x754]?0:1,facing:r[0x33]===2?-1:1});
 sim.time=digits(r,0x7f8,3);sim.score=digits(r,0x7dd,6)*10;sim.coins=r[0x75e];
 sim.playerAnim.reset(r[0x70d],r[0x781],r[0x70c],false);sim.jumpPose=r[0x1d]===1;
 sim.motor.reset(Math.round(sim.player.vx*4096),sim.player.facing,r[0x45]===2?-1:r[0x45]===1?1:0,r[0x700]);sim.motor.runningTimer=r[0x783];sim.motor.runningSpeed=r[0x703];sim.motor.blockedRight=!(r[0x490]&1);sim.motor.blockedLeft=!(r[0x490]&2);
 sim.fallGravity=r[0x70a]/256;sim.camera=r[0x71a]*256+r[0x71c];sim.intervalControl=r[0x77f];sim.phase='castle';sim.castleStage='bridge';sim.phaseFrame=0;
 sim.bridge=[...sim.tiles].filter(([,id]:any)=>id===137).sort((a:any,b:any)=>Number(b[0].split(',')[0])-Number(a[0].split(',')[0])).map(([key]:any)=>key);
 const slot=r[0x368],boss=sim.enemies.find((e:any)=>e.kind==='bowser');assert.ok(boss);boss.active=true;boss.enemySlot=slot;
 boss.nativeBowser={x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],move:{y:r[0xcf+slot],speed:signed(r[0xa0+slot]),force:r[0x434+slot],fraction:r[0x417+slot],timer:0},feet:r[0x364],controls:r[0x363]};sim.beginNativeVictory();
 let walkOwned=false,pending=-1,priorBridge=r[0x369];const shown:number[]=[];const bridgeTiles=sim.bridge.length;
 for(const row of run.rows){if(pending>=0)shown.push(pending);sim.step([],1);pending=row.write;if(row.mode!==2){assert.equal(sim.phase,'intro',`advance ${row.frame}`);assert.equal(sim.level.id,`${Number(run.level[0])+1}-1`);continue;}const control:any=controlRows.get(`${run.level}:${row.frame}`),expected=control.after;if(control.before.task===2)walkOwned=true;if(walkOwned)assert.equal(sim.nativeVictory.walk,expected.walk,`native walk ${row.frame}`);for(const key of ['task','scrollFraction','primary','secondary','endTimer','feet','controls','bridge'])assert.equal(sim.nativeVictory[key],expected[key],`native ${key} ${row.frame}`);if(row.task>=2)assert.equal(sim.nativeVictory.destination,expected.destination,`native destination ${row.frame}`);assert.equal(sim.bridge.length,bridgeTiles-Math.min(bridgeTiles,Math.max(0,priorBridge-2)),`native bridge VRAM ${row.frame}`);priorBridge=row.bridge;assert.deepEqual(sim.victoryMessages,shown,`native VRAM text ${row.frame}`);assert.deepEqual({x:Math.floor(sim.player.x),xf:Math.round((sim.player.x-Math.floor(sim.player.x))*256),speed:Math.round(sim.player.vx*4096),y:(Math.floor(sim.player.y)-32)&255,cell:playerCell(sim).cell,anim:[sim.playerAnim.ctrl,sim.playerAnim.timer,sim.playerAnim.timerSet],camera:sim.camera,task:sim.nativeVictory?.task,time:sim.time,score:sim.score,coins:sim.coins,boss:sim.victoryBoss?[sim.victoryBoss.nativeBowser.x,sim.victoryBoss.nativeBowser.y]:null},{x:row.x,xf:row.xf,speed:row.speed,y:row.y,cell:row.cell,anim:row.anim,camera:row.camera,task:row.task,time:row.time,score:row.score,coins:row.coins,boss:row.boss},`native frame ${row.frame}`);}
});
