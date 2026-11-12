import {test} from 'node:test';
import assert from 'node:assert/strict';
import {NativeWater,whirlpoolAt,whirlpoolPull} from '../src/native-water.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Every sequence below is a short excerpt of read-only native swimming measurements (vertical speed byte S, force F in 1/256,
// position fraction D in 1/256 px, native y; horizontal speed in 1/4096 px) taken with tools/fidelity-lab/water-probe.mjs from
// the recorded World 2-2 / 7-2 winning route and from controlled probes, summarised in evidence/water-motor-findings-20261109.md.

type Rest={S:number;F:number;D:number;rise?:number;fall?:number;timer?:number;whirl?:boolean};
const water=(s:Rest,whirlFirst=false)=>{const w=new NativeWater();w.speed=s.S;w.force=s.F;w.frac=s.D;w.rise=s.rise??10;w.fall=s.fall??10;w.timer=s.timer??0;w.whirl=s.whirl??false;w.whirlFirst=whirlFirst;return w;};
const snapshot=(w:NativeWater,y:number)=>({y,S:w.speed,F:w.force,D:w.frac});

test('the uncontrolled entry fall follows the native y track under the surface gravity, then the falling force',()=>{
 const w=water({S:0,F:48,D:24,rise:24,fall:40});let y=0;
 const track=Array.from({length:46},()=>y+=w.vertical(false,false,y,false,false).dy);
 // Native rows 12400..12446 of the winning route (one frame between 49 and 52 is the engine hand-over hold, not a physics pass).
 assert.deepEqual(track,[0,0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,17,19,21,23,25,28,30,33,36,39,42,45,49,52,56,60,64,69,73,77,81,85,90,94,98,102,107,111,115]);
});

test('a stroke from the floor sets speed -2, half force plus the rising force, and arms the 32-frame timer',()=>{
 const w=water({S:0,F:0,D:8,rise:40,fall:40},false);
 const stroke=w.vertical(true,false,176,true,false);
 assert.deepEqual([stroke.stroke,stroke.dy],[true,-2]);
 assert.deepEqual([w.speed,w.force,w.frac,w.rise,w.fall,w.timer],[-2,141,128,13,10,32]);
 // Controlled probe regap20, rows 42..53 with A released: gravity is the falling force 10 from the second frame on.
 let y=174;const rows:number[][]=[];
 for(let i=0;i<12;i++){y+=w.vertical(false,false,y,false,false).dy;rows.push([y,w.speed,w.force,w.frac,w.timer]);}
 assert.deepEqual(rows,[[173,-2,151,13,31],[171,-2,161,164,30],[170,-2,171,69,29],[168,-2,181,240,28],[167,-2,191,165,27],[166,-2,201,100,26],
  [165,-2,211,45,25],[164,-2,221,0,24],[162,-2,231,221,23],[161,-2,241,196,22],[160,-2,251,181,21],[159,-1,5,176,20]]);
});

test('a second stroke is honoured while the timer runs and ignored once it has run out while still rising',()=>{
 // regap20: second press with 13 timer frames left (row 60 -> 61).
 const early=water({S:-1,F:75,D:165,timer:13});
 const accepted=early.vertical(true,false,153,false,false);
 assert.equal(accepted.stroke,true);
 assert.deepEqual([153+accepted.dy,early.speed,early.force,early.frac,early.timer],[151,-2,141,128,32]);
 // regap34: the same press with the timer at 0 and S = -1 (row 75 -> 76) does nothing but let gravity run.
 const late=water({S:-1,F:225,D:36,timer:0});
 const ignored=late.vertical(true,false,147,false,false);
 assert.equal(ignored.stroke,false);
 assert.deepEqual([147+ignored.dy,late.speed,late.force,late.frac],[147,-1,235,5]);
 assert.equal(water({S:0,F:9,D:228,timer:0}).canStroke(true,false,false),true,'a falling swimmer may always stroke');
 assert.equal(water({S:-1,F:9,D:228,timer:0}).canStroke(true,true,false),false,'holding A is not a new press');
});

test('near the surface the gravity is 24 and a stroke starts at speed 0',()=>{
 // 7-2 rows 60105 -> 60110.
 const w=water({S:-1,F:84,D:210,rise:24,fall:10,timer:17});
 const stroke=w.vertical(true,false,17,false,false);
 assert.deepEqual([17+stroke.dy,w.speed,w.force,w.frac,w.timer],[17,0,152,128,32]);
 let y=17;const rows:number[][]=[];
 for(let i=0;i<4;i++){y+=w.vertical(true,true,y,false,false).dy;rows.push([y,w.speed,w.force,w.frac]);}
 assert.deepEqual(rows,[[18,0,176,24],[18,0,200,200],[19,0,224,144],[20,0,248,112]]);
 y+=w.vertical(true,true,y,false,false).dy;
 assert.deepEqual([y,w.speed,w.force,w.frac],[21,1,2,104],'at native y 20 the ordinary falling force is back');
});

test('a stroke inside a whirlpool zone is class B: speed -1, no force, rising force 4',()=>{
 // 7-2 row 59037 -> 59038 (the previous frame was inside the zone too).
 const w=water({S:0,F:54,D:36,rise:9,fall:9,timer:19,whirl:true});
 const stroke=w.vertical(true,false,94,false,true);
 assert.deepEqual([stroke.stroke,94+stroke.dy,w.speed,w.force,w.frac,w.rise,w.fall,w.timer],[true,92,-1,20,4,4,9,32]);
});

test('the whirlpool adds a second gravity pass (gravity 16, speed cap 1); contact comes between the two passes',()=>{
 // 7-2 rows 58989 -> 58995 (whirlpool pass last): falling in, landing on a block top, then walking off its edge.
 const w=water({S:0,F:73,D:101});let y=94;
 let step=w.vertical(false,false,y,false,true);y+=step.dy;assert.deepEqual(snapshot(w,y),{y:95,S:0,F:99,D:1});
 step=w.vertical(false,false,y,false,true);y+=step.dy;assert.deepEqual(snapshot(w,y),{y:95,S:0,F:125,D:209});
 step=w.vertical(false,false,y,false,true);y+=step.dy;assert.equal(y,96);
 w.land(); // the remake's collision code reports the block top under the feet
 assert.deepEqual(snapshot(w,y),{y:96,S:0,F:16,D:78},'the landing clears S and F before the whirlpool pass');
 step=w.vertical(false,false,y,true,true);y+=step.dy;assert.deepEqual(snapshot(w,y),{y:96,S:0,F:32,D:94},'standing frames still take the whirlpool pass');
 step=w.vertical(false,false,y,false,true);y+=step.dy;assert.deepEqual(snapshot(w,y),{y:96,S:0,F:58,D:168});
 step=w.vertical(false,false,y,false,true);y+=step.dy;assert.deepEqual(snapshot(w,y),{y:97,S:0,F:84,D:38});
});

test('in the other capture phase the whirlpool pass is observed before the ordinary one',()=>{
 // 2-2 rows 13120 -> 13126 with A held (rising force 13).
 const w=water({S:-1,F:89,D:51,rise:13,fall:10,timer:20},true);let y=65;
 const rows:Array<Record<string,number>>=[];
 for(let i=0;i<6;i++){y+=w.vertical(true,true,y,false,true).dy;rows.push(snapshot(w,y));}
 assert.deepEqual(rows,[{y:63,S:-1,F:118,D:245},{y:62,S:-1,F:147,D:241},{y:62,S:-1,F:176,D:39},{y:61,S:-1,F:205,D:151},{y:61,S:-1,F:234,D:65},{y:61,S:0,F:7,D:37}]);
});

test('a head bump turns the speed to +1 and keeps force and fraction; the ceiling does not move the swimmer',()=>{
 // 2-2 rows 13513 -> 13516.
 const w=water({S:-1,F:43,D:129,timer:18});let y=141;
 y+=w.vertical(true,true,y,false,false).dy;assert.equal(y,140);
 w.bump();assert.deepEqual(snapshot(w,y),{y:140,S:1,F:53,D:172});
 y+=w.vertical(true,true,y,false,false).dy;assert.deepEqual(snapshot(w,y),{y:141,S:1,F:63,D:225});
 y+=w.vertical(true,true,y,false,false).dy;assert.deepEqual(snapshot(w,y),{y:143,S:1,F:73,D:32});
});

test('whirlpool zones are inclusive and pull one pixel toward the centre every second frame',()=>{
 const zones=[{left:1040,length:96}];
 assert.equal(whirlpoolAt(zones,1039),undefined);assert.ok(whirlpoolAt(zones,1040));assert.ok(whirlpoolAt(zones,1136));assert.equal(whirlpoolAt(zones,1137),undefined);
 const zone=zones[0];
 // 2-2 rows 13140 and 13142: one extra pixel right of x 1085, one extra pixel left of x 1089, nothing on the other frames.
 assert.equal(whirlpoolPull(zone,1085,0),1);assert.equal(whirlpoolPull(zone,1089,2),-1);
 assert.equal(whirlpoolPull(zone,1085,1),0);assert.equal(whirlpoolPull(undefined,1085,0),0);
});

test('a whirlpool pull tested where the move lands sends the centre column right (free-play PPU rows)',()=>{
 const zone={left:1040,length:96};
 // explore-w0 2-2 mood0 rows 766 -> 767: x 1087.0, speed 6288, lands at 1088 (the centre) and native ends at 1089.5 (+1); row 768 -> 769 lands at 1092 and pulls -1.
 // Over all 2-2/7-2 free-play rows of sweeps r1-r4/w0 a landing on the centre column pulled +1 314 times, -1 never; one column right -1 327 times, +1 never.
 assert.equal(whirlpoolPull(zone,1088,0),1);assert.equal(whirlpoolPull(zone,1089,0),-1);assert.equal(whirlpoolPull({left:2496,length:128},2560,0),1);
 // Tested where the move starts (slice-clocked route rows) the boundary stays one column left.
 assert.equal(whirlpoolPull(zone,1088,0,true),-1);assert.equal(whirlpoolPull(zone,1087,0,true),1);
});

test('swimming starts with the doubled step from rest, accelerates by 152, and wraps inside the cap byte 24',()=>{
 const w=new NativeWater();
 // 2-2 rows 12431.. (first press ever from rest).
 const first=Array.from({length:8},()=>w.horizontal(1,false));
 assert.deepEqual(first,[304,456,608,760,912,1064,1216,1368]);
 const capped=new NativeWater();capped.motor.speed=6032;capped.moving=1;
 // 7-2 rows 59008 -> 59014: above byte 24 the speed drops back to 24 keeping its fraction.
 assert.deepEqual(Array.from({length:6},()=>capped.horizontal(1,false)),[6184,6336,6232,6384,6280,6176]);
});

test('swimming never decelerates without input, the floor cap is byte 16, and a brake into a wall keeps the fraction',()=>{
 const coast=new NativeWater();coast.motor.speed=6192;coast.moving=1;
 assert.deepEqual(Array.from({length:4},()=>coast.horizontal(0,false)),[6192,6192,6192,6192]);
 // Controlled floor probe fz0: after landing from a swim the cap is 16 (4096 + fraction).
 const floor=new NativeWater();floor.motor.speed=6312;floor.moving=1;
 assert.deepEqual(Array.from({length:11},()=>floor.horizontal(1,true)),[4160,4312,4208,4104,4256,4152,4304,4200,4096,4248,4144]);
 // 2-2 rows 15564 -> 15570: braking from the right into a wall, then pressing left against the sub-byte remainder.
 const wall=new NativeWater();wall.motor.speed=6168;wall.moving=1;
 assert.deepEqual(Array.from({length:3},()=>wall.horizontal(-1,false)),[6016,5712,5408]);
 assert.equal(wall.wall(5104,false),240);
 assert.deepEqual(Array.from({length:2},()=>wall.horizontal(-1,false)),[-64,-216]);
});

test('production: the World 2-2 entry fall and first stroke track the native rows exactly',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='2-2')!);level.main='area-2';
 const sim=new Simulation([level]);sim.reset(true);
 const feet:number[]=[];
 // Frames 1..46 of the entry (the hold frame at native y 49 included), A pressed so that the stroke lands on frame 48.
 for(let frame=1;frame<=47;frame++){sim.step(frame>=46?['a']:[],1);feet.push(Math.floor(sim.player.y)-32);}
 assert.deepEqual(feet,[0,0,0,1,1,2,3,4,5,6,7,8,9,11,12,14,16,17,19,21,23,25,28,30,33,36,39,42,45,49,49,52,56,60,64,69,73,77,81,85,90,94,98,102,107,111,115]);
 // Native rows 12447..12469: the class A stroke rises with A held (rising force 13).
 const rise:number[]=[];
 for(let frame=48;frame<=70;frame++){sim.step(['a'],1);rise.push(Math.floor(sim.player.y)-32);}
 assert.deepEqual(rise,[113,112,110,109,108,106,105,104,103,102,101,100,99,98,97,97,96,95,95,94,94,93,93]);
});

test('Down stops a swimmer below speed byte 11 on the frame the direction is released (7-2 free-play rows 1002/1003 and 1480/1481: 1672 -> 0, 1976 -> 0), not later and not above it',()=>{
 const slow=new NativeWater();slow.motor.speed=1672;
 slow.horizontal(1,false);slow.motor.speed=1672;
 assert.equal(slow.horizontal(0,false,true),0);
 // A later Down frame with no direction keeps the speed (rows 2-2 mood2: 5 of 5 keeps with Down held before), and so does Down with no direction before it.
 const held=new NativeWater();held.motor.speed=1672;assert.equal(held.horizontal(0,false,true),1672);
 // Above byte 11 the release keeps the speed (rows 959..961: 6280 with Down and A).
 const fast=new NativeWater();fast.horizontal(1,false);fast.motor.speed=6280;assert.equal(fast.horizontal(0,false,true),6280);
 // Without Down the coasting speed is kept.
 const coast=new NativeWater();coast.horizontal(1,false);coast.motor.speed=1672;assert.equal(coast.horizontal(0,false,false),1672);
});
