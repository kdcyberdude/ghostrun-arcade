import {isolatePlacedStream} from './helpers/isolated-placed-stream.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {hammerBroStep} from '../src/hammer-bro.js';
import hammerData from '../data/native-hammer-bros.json';
import events from './fixtures/native-enemy-rule-events.json';

// Generated from native RAM by native-enemy-rule-events.mjs. Each row starts from the native bytes, then checks the full next-frame motor state.
test('native Hammer Bro decisions and movement match every progressing, normal-play trace row',()=>{
 assert.ok(events.hammerRows.length>=3812);
 for(const row of events.hammerRows){
  const state={...row.before},at=`${row.level} row ${row.row} slot ${row.slot}`;
  const {speed}=hammerBroStep(state,{x:row.x,marioX:row.mario,frame:row.frame,random1:row.random1,random2:row.random2,hard:row.hard,supported:row.supported,sideBlocked:row.sideBlocked,onScreen:row.screenX>0&&row.screenX<=247,spawnHammer:()=>row.made});
  // Bit 3 is cleared later by the misc-object pass when the held hammer is released, outside ProcHammerBro.
  assert.deepEqual({...state,state:state.state&~8},{...row.after,state:row.after.state&~8},at);
  assert.equal(speed,row.xSpeed,at);
 }
});

test('native wall contact forces a strong Hammer Bro jump and runs vertical movement twice',()=>{
 const rows=events.hammerRows.filter(r=>r.sideBlocked&&r.supported&&r.before.frameTimer<=1);
 assert.ok(rows.length>=2);
 for(const row of rows){const state={...row.before};const result=hammerBroStep(state,{x:row.x,marioX:row.mario,frame:row.frame,random1:row.random1,random2:row.random2,hard:row.hard,supported:true,sideBlocked:true,onScreen:row.screenX>0&&row.screenX<=247,spawnHammer:()=>row.made});assert.equal(result.steps,2);assert.equal(state.y,row.after.y);}
});

test('native lag evidence retains the parser-only row without adding a replay-specific engine skip',()=>{
 const lag=events.hammerLagRows.find(r=>r.level==='5-2'&&r.row===2179)!;
 assert.ok(lag);assert.equal(lag.frame,161);assert.equal(lag.oamBefore,lag.oamAfter);
 assert.deepEqual(lag.changes,[[0,112,192],[0x59e,0,85],[0x71f,8,7]]);
});

function fixture(){
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id===level.main)!;area.enemies=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x===1008);area.cannons=[];area.generators=[];area.firebars=[];
 const sim:any=isolatePlacedStream(new Simulation([level]));sim.reset(true);sim.player.invincible=100000;sim.loadArea(area.id,[807,208],770);
 return {sim,bro:sim.enemies[0]};
}

test('the native Hammer Bro roster supplies one level object per Bro',()=>{
 for(const entry of hammerData.bros){const level=structuredClone(observedLevels().find(l=>l.id===entry.level)!);const sim=new Simulation([level]);sim.reset(true);sim.loadArea(entry.area);assert.equal(sim.enemies.filter(e=>e.kind==='hammerBro'&&e.x===entry.x&&e.y===entry.y).length,1,`${entry.level}/${entry.area}/${entry.x}`);}
});

test('Hammer Bro patrol follows FrameCounter, and a reused slot keeps the native jump timer',()=>{
 const {sim,bro}=fixture();sim.slotBroJump[0]=22;sim.random.frame=62;sim.step([],1);
 assert.equal(bro.hbro.jumpTimer,21);assert.equal(bro.vx,0.25);sim.step([],1);assert.equal(bro.vx,-0.25);
});

test('hammer allocation reads the global random byte and reserved enemy slot guard',()=>{
 const {sim,bro}=fixture();sim.random.bytes[1]=1;
 const blocker={...bro,active:true,enemySlot:4};sim.enemies.push(blocker);assert.equal(sim.spawnNativeHammer(bro),false);
 blocker.active=false;assert.equal(sim.spawnNativeHammer(bro),true);assert.equal(sim.spawnNativeHammer(bro),false);
 assert.equal(sim.items[0].nativeHammer.slot,1);
});

test('a native hammer holds its owner position, releases toward its facing direction, and preserves misc gravity bytes',()=>{
 const {sim,bro}=fixture();sim.random.bytes[1]=1;bro.nativeDir=-1;bro.x=1008;bro.y=208;
 assert.equal(sim.spawnNativeHammer(bro),true);const item=sim.items[0];
 for(let row=0;row<15;row++){sim.moveNativeHammer(item);assert.equal(item.x,1010);assert.equal(item.y,174);}
 assert.equal(item.nativeHammer.state,0x81);assert.equal(item.vx,-1);
 sim.moveNativeHammer(item);assert.equal(item.x,1009);assert.equal(item.y,172);assert.equal(item.nativeHammer.force,16);
});

test('stomping a Hammer Bro retains its native 1000 point award',()=>{
 const {sim,bro}=fixture();sim.player.invincible=0;sim.step([],1);Object.assign(sim.player,{x:bro.x,y:bro.y-16,vx:0,vy:3,grounded:false});sim.step([],1);assert.ok(bro.dead>0);assert.equal(sim.awardedScore,1000);
});
