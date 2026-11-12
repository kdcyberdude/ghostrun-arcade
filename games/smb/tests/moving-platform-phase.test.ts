import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlatformMotion,platformMotionModel,nativePlatformObject} from '../src/platform-motion.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {PlatformSpec} from '../src/types.js';

// Native excerpts below come from the reference RAM object slots (per-frame x/y of platform-class objects, decoded by
// tools/fidelity-lab/platform-compact.mjs) of the recorded winning route and of idle/delay probes of the same levels.
// `age` is the number of frames since the first row in which the object exists. A native object is created when the scroll
// position reaches its spawn position and then runs on its own clock, not on the level timeline.
const spec=(level:string,area:string,x:number,y:number):PlatformSpec=>observedLevels().find(l=>l.id===level)!.areas.find(a=>a.id===area)!.platforms!.find(p=>p.x===x&&p.y===y)!;
const spawn=(level:string,platform:PlatformSpec)=>nativePlatformObject(platform,{levelId:level,areaId:'main'})!.spawnCamera;
const within=(actual:number,expected:number,tolerance:number,label:string)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${label}: ${actual} vs native ${expected}`);

// Exact horizontal motion, including every recorded spawn counter and inherited slot
// fraction, is checked over all native runs by native-platform-motion.test.ts.
test('horizontal artwork sits one row below its native collision surface',()=>{
 const platform=spec('3-3','main',452,65),motion=new PlatformMotion({levelId:'3-3',areaId:'main'});
 motion.advance(100,spawn('3-3',platform),13);
 assert.equal(motion.artworkPosition(platform,100).y-motion.collisionPosition(platform,100).y,1);
});

test('horizontal clocks depend on spawn FrameCounter phase, not the level timeline',()=>{
 const platform=spec('3-3','main',452,65),context={levelId:'3-3',areaId:'main'},camera=spawn('3-3',platform);
 const early=new PlatformMotion(context),late=new PlatformMotion(context);
 early.advance(10,camera,13);late.advance(500,camera,13);
 for(const age of [1,30,60,117,239,240,333])assert.deepEqual(early.collisionPosition(platform,10+age),late.collisionPosition(platform,500+age),`age ${age}`);
 early.reset();assert.deepEqual(early.collisionPosition(platform,70),new PlatformMotion(context).collisionPosition(platform,0));
});

test('lifts follow the native 384-frame cycle in both directions',()=>{
 const down=spec('1-3','main',880,175),up=spec('6-3','main',448,142);
 const ages=[0,20,40,60,80,100,120,140,160,166,200,240,300,326,330,384,400,500,541,600,700,766,800];
 const nativeDown=[96,99,111,130,157,186,207,221,227,226,214,171,99,89,89,96,98,206,227,199,91,96,106]; // 1-3 idle probe, rows 5351+age
 const a=new PlatformMotion({levelId:'1-3',areaId:'main'});a.advance(0,spawn('1-3',down));
 assert.equal(platformMotionModel(down,{levelId:'1-3',areaId:'main'}),'native-lift');
 ages.forEach((age,i)=>within(a.collisionPosition(down,age).y,nativeDown[i],2,`1-3 lift age ${age}`));
 const upAges=[0,20,40,80,120,160,170,200,240,280,300];
 const nativeUp=[208,204,192,146,96,76,76,88,131,186,203]; // 6-3 up-lift idle probe, rows 51418+age
 const b=new PlatformMotion({levelId:'6-3',areaId:'main'});b.advance(0,spawn('6-3',up));
 upAges.forEach((age,i)=>within(b.collisionPosition(up,age).y,nativeUp[i],2,`6-3 lift age ${age}`));
});

test('balance pairs hold still until ridden and then move like the native pair',()=>{
 // 6-3 pair at native x 1128/1192, rest y 78/142. Mario is grounded on the left platform for 34 frames (route rows
 // 51819..51852, frames 100..133 here), walks off and lands on the right one for 4 frames (rows 51867..51870, frames
 // 148..151); the pair then coasts to rest at y 101/119 (row 51884).
 const a=spec('6-3','main',1128,88),b=spec('6-3','main',1192,132),context={levelId:'6-3',areaId:'main'};
 const motion=new PlatformMotion(context);
 assert.equal(platformMotionModel(a,context),'native-balance');
 assert.deepEqual([motion.collisionPosition(a,5).y,motion.collisionPosition(b,5).y],[78,142]);
 for(let frame=100;frame<=200;frame++){if(frame<=133)motion.contact(a,frame);else if(frame>=148&&frame<=151)motion.contact(b,frame);motion.advance(frame,0);}
 const ks=[0,6,11,16,26,36,47,51,60,65],nativeA=[78,79,80,81,85,91,97,98,101,101],nativeB=[142,141,140,139,135,129,123,122,119,119];
 ks.forEach((k,i)=>{
  within(motion.collisionPosition(a,100+k).y,nativeA[i],2,`left k${k}`);within(motion.collisionPosition(b,100+k).y,nativeB[i],2,`right k${k}`);
 });
 const sum=(frame:number)=>motion.collisionPosition(a,frame).y+motion.collisionPosition(b,frame).y;
 assert.equal(sum(199),sum(100),'the pair stays counterweighted');
 assert.equal(motion.collisionPosition(a,199).y,motion.collisionPosition(a,170).y,'it holds its position once the rider leaves');
 // a rider on the other side tips the pair the other way
 const reverse=new PlatformMotion(context);
 for(let frame=100;frame<=147;frame++){reverse.contact(b,frame);reverse.advance(frame,0);}
 assert.ok(reverse.collisionPosition(a,148).y<78&&reverse.collisionPosition(b,148).y>142);
});

test('drop platforms fall only while a rider stands on them',()=>{
 const context={levelId:'6-3',areaId:'main'};
 const ride=(platform:PlatformSpec,frames:number)=>{
  const motion=new PlatformMotion(context);
  for(let frame=100;frame<=200;frame++){if(frame<100+frames)motion.contact(platform,frame);motion.advance(frame,0);}
  return motion;
 };
 // 6-3 drop platform at native x 2448, rest y 112: Mario is grounded on it for 5 frames (route rows 52385..52389, frames
 // 100..104 here); it stops at y 117 the moment he leaves and holds that height.
 const short=spec('6-3','main',2448,116),shortRide=ride(short,5);
 assert.equal(platformMotionModel(short,context),'native-drop');
 assert.equal(shortRide.collisionPosition(short,50).y,112);
 [[0,112],[2,114],[4,117],[6,117],[10,117],[40,117]].forEach(([k,y])=>within(shortRide.collisionPosition(short,100+k).y,y,1,`short ride k${k}`));
 assert.equal(shortRide.collisionPosition(short,200).y,shortRide.collisionPosition(short,110).y,'it holds its height once unloaded');
 // 6-3 drop platform at native x 2256, rest y 112: grounded for 15 frames (rows 52307..52321); it stops at y 139. The model trails
 // the native fall by up to 3px in the middle of this ride (at most 2px elsewhere), so this longer ride is held to 3px.
 const long=spec('6-3','main',2256,126),longRide=ride(long,15);
 [[0,112],[2,114],[4,117],[6,121],[8,126],[10,130],[12,135],[14,139],[15,139],[20,139],[60,139]].forEach(([k,y])=>within(longRide.collisionPosition(long,100+k).y,y,3,`long ride k${k}`));
 within(longRide.collisionPosition(long,160).y,139,1,'final height');
 assert.equal(longRide.collisionPosition(long,200).y,longRide.collisionPosition(long,130).y,'it holds its height once unloaded');
});

test('the simulation starts platform clocks from the scroll and restarts them with the area',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-3')!);
 level.areas.find(a=>a.id==='main')!.enemies=[];
 const game=new Simulation([level]);game.reset(true);
 const platform=()=>game.area.platforms!.find(p=>p.x===452&&p.y===65)!;
 const camera=spawn('3-3',platform());
 const x=()=>game.platformPosition(platform()).x;
 // before the scroll reaches the spawn the platform sits at its right end however long the player waits
 game.loadArea('main',undefined,camera-40);game.step([],60);assert.equal(x(),480);
 // the same scroll position and native FrameCounter phase start the same cycle
 game.loadArea('main',undefined,camera);(game as any).random.frame=0;game.step([],1);assert.equal(x(),480);
 game.step([],80);const first=x();within(first,437,2,'age 80 after a fresh start');
 game.loadArea('main',undefined,camera);(game as any).random.frame=0;game.step([],1);assert.equal(x(),480);
 game.step([],80);assert.equal(x(),first,'a restarted area replays the same cycle');
});
