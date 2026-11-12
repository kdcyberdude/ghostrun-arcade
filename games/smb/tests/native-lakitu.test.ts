import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {lakituStep,stopFrenzyParsed,SPINY_EGG} from '../src/lakitu.js';
import lakituData from '../data/native-lakitu.json';
import events from './fixtures/native-enemy-rule-events.json';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

// Native Lakitu (id 17) and Spiny (id 18) rules checked on every event of the per-frame RAM traces of the v2 recordings (4-1, 6-1, 8-2;
// tests/fixtures/native-enemy-rule-events.json from tools/harness/native-enemy-rule-events.mjs). The rules read only native state.

test('MoveLakitu / PlayerLakituDiff give the native direction and speed bytes on every normal-play Lakitu row (3255 rows)',()=>{
 let n=0;
 for(const [level,row,x,mario,speedByte,scroll,state,dir,speed,dirNext,speedNext] of events.lakituRows as [string,number,...number[]][]){
  const bytes={dir,speed};lakituStep(bytes,x,mario,speedByte,scroll,state!==0);
  assert.deepEqual([bytes.dir,bytes.speed],[dirNext,speedNext],`${level} row ${row}`);n++;
 }
 assert.ok(n>=3255,`${n} rows`);
});

test('CreateSpiny: an egg in the first free slot at Lakitu x (pre-step when its slot is below Lakitu, else post-step), 8 px above, speed -3, force 0, the slot y fraction kept (26 eggs)',()=>{
 for(const e of events.spinyEggs){
  const at=`${e.level} row ${e.row}`;
  assert.equal(e.x,e.slot<e.lakituSlot?e.lakituBefore:e.lakituAfter,at);
  assert.equal(e.y,e.lakituY-SPINY_EGG.aboveLakitu,at);
  assert.deepEqual([e.speed,e.force,e.fraction],[SPINY_EGG.speed,0,e.slotFraction],at);
  assert.ok(e.timerBefore<=1&&e.timerAfter===SPINY_EGG.timer,`${at}: FrenzyEnemyTimer ${e.timerBefore} -> ${e.timerAfter}`);
  assert.ok(e.marioY>=SPINY_EGG.minMarioY,at);
 }
 assert.equal(events.spinyEggs.length,26);
});

function fixture(enemy:Partial<EnemySpec>={},spawnX=40){
 const tiles:Tile[]=[];for(let x=0;x<256;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:4096,palette:0,theme:'ground',tiles,enemies:[{kind:'lakitu',x:160,y:64,palette:'0f-1a-30-27',direction:-1,...enemy}],spawn:[spawnX,208],evidence:'Synthetic Lakitu fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim as any;
}

test('a landing Spiny walks 0.5 px/frame toward Mario unless FrameCounter & 7 is 0 (17 native landings)',()=>{
 const sim=fixture();
 for(const l of events.spinyLandings){
  sim.random.frame=l.frame;sim.player.x=l.mario+0.5;
  assert.equal(Math.round(sim.spinyLandingVx(l.x+0.5)*16)&255,l.speed,`${l.level} row ${l.row}`);
 }
 sim.random.frame=8;sim.player.x=0;assert.equal(sim.spinyLandingVx(100),SPINY_EGG.walk,'FrameCounter & 7 = 0 keeps the default right');
});

test('a Lakitu throws its first egg on its first remake row, then every 128 frames, and none after it flees',()=>{
 const sim=fixture();const born:number[]=[];let eggs=0,ageAtFirst=0;const lakitu=sim.enemies.find((e:any)=>e.kind==='lakitu');
 for(let f=1;f<=2+128*2+4;f++){sim.step([],1);const n=sim.enemies.filter((e:any)=>e.egg).length;if(n>eggs){born.push(f);eggs=n;ageAtFirst||=lakitu.age;}}
 assert.equal(ageAtFirst,1,'the first egg comes on the row Lakitu first steps (the row after its native creation)');
 assert.deepEqual([born[1]-born[0],born[2]-born[1]],[128,128]);
 const egg=sim.enemies.filter((e:any)=>e.egg)[0];assert.equal(egg.originY,lakitu.y-SPINY_EGG.aboveLakitu);
 lakitu.lak.stopQueued=true;const before=sim.enemies.filter((e:any)=>e.egg).length,x0=lakitu.x;sim.step([],200);
 assert.equal(sim.enemies.filter((e:any)=>e.egg).length,before);assert.ok(lakitu.x<x0-150||lakitu.dead);
});

test('an egg holds its creation row, rises at -3 with 0x20/256 gravity (cap 3), lands and walks toward Mario',()=>{
 const sim=fixture();let egg:any;
 for(let f=0;f<5&&!egg;f++){sim.step([],1);egg=sim.enemies.find((e:any)=>e.egg);}
 const y0=egg.y;sim.step([],1);assert.equal(egg.y,y0+SPINY_EGG.speed);
 for(let f=0;f<200&&egg.motion==='falling';f++)sim.step([],1);
 assert.equal(egg.motion,undefined);assert.equal(egg.y,208);assert.equal(Math.abs(egg.vx),SPINY_EGG.walk);
});

test('native Lakitu appearance x and Stop_Frenzy object column are applied to 4-1, 6-1 and 8-2',()=>{
 for(const entry of lakituData.levels){
  const area=observedLevels().find(l=>l.id===entry.level)!.areas.find(a=>a.id===entry.area)!;
  const lakitu=area.enemies.find(e=>e.kind==='lakitu')!;
  assert.equal(lakitu.x,entry.x);assert.equal(lakitu.stopFrenzyX,entry.stopFrenzyX);
 }
});

test('Stop_Frenzy follows the native area object column and parser tasks, independent of camera overshoot',()=>{
 const skyEvents=events.stopFrenzy.filter(e=>lakituData.levels.some(l=>l.level===e.level));
 assert.equal(skyEvents.length,3);
 for(const event of skyEvents){
  const spec=lakituData.levels.find(l=>l.level===event.level)!;
  assert.equal(event.column,spec.stopFrenzyX,event.level);
  assert.equal(event.task,7,event.level);
  const cross=Math.floor(event.camera/32)*32;
  assert.equal(stopFrenzyParsed(event.column,cross,1),false,event.level);
  assert.equal(stopFrenzyParsed(event.column,cross,event.consumed-event.row),true,event.level);
 }
 // The second column is parsed on task 3, four frames after the first; the enemy pass follows it.
 assert.equal(stopFrenzyParsed(368,0,4),false);assert.equal(stopFrenzyParsed(368,0,5),true);
});
