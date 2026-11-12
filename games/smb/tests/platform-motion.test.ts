import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PlatformMotion,measuredLiftArtworkY,platformMotionModel,LIFT_TRAJECTORY_PERIOD} from '../src/platform-motion.js';
import type {PlatformSpec} from '../src/types.js';
import waterObservations from '../evidence/optional-water-actors.json';
import fiveTwoWaterObservations from '../evidence/vine-optional-water-actors.json';
const firstLift:PlatformSpec={x:880,y:175,width:48,axis:'y',range:48,speed:1.267};
const firstDropper:PlatformSpec={x:959,y:112,width:48,axis:'balance',range:16,speed:0.517};
const cloud:PlatformSpec={x:256,y:161,width:48,axis:'x',range:0,speed:1};

test('lift trajectory agrees with a later mounted cycle not used as trajectory knots',()=>{
 // Knots use two earlier idle oscillations; repeat timing was calibrated with
 // these later mounted captures. This is a regression, not independent proof of
 // the unmeasured activation/phase rule.
 const observed=[[6287,227],[6295,226],[6332,205],[6370,155],[6407,109],[6437,92],[6445,90],[6453,90]];
 for(const [nativeFrame,y] of observed)assert.ok(Math.abs(measuredLiftArtworkY(nativeFrame-5513)-y)<=2,`${nativeFrame}: expected ${y}`);
 for(let frame=0;frame<LIFT_TRAJECTORY_PERIOD;frame++){
  assert.equal(measuredLiftArtworkY(frame),measuredLiftArtworkY(frame+LIFT_TRAJECTORY_PERIOD));
  assert.ok(measuredLiftArtworkY(frame)>=90&&measuredLiftArtworkY(frame)<=228);
 }
});

test('standing contact and rendering queries cannot change the autonomous lift phase',()=>{
 // Native 1-3 lift object (reference RAM, route rows 5351+age): y=226 at age 166. It runs on its own age from the spawn
 // camera (576 in the remake's scroll), not from a level timeline, so the former level-frame phase argument is gone.
 const motion=new PlatformMotion({levelId:'1-3',areaId:'main'});motion.advance(0,576);
 const prior=motion.artworkPosition(firstLift,166);motion.contact(firstLift,140);
 assert.deepEqual(motion.artworkPosition(firstLift,166),prior);
 assert.deepEqual(motion.artworkPosition(firstLift,166),{x:880,y:227});
 assert.deepEqual(motion.collisionPosition(firstLift,166),{x:880,y:226});
});

test('the unroped3-3 platform stays idle until landing then falls only while ridden',()=>{
 // Native 3-3 drop object x960 (reference RAM, route rows 25724..25740 loaded, y 96 at rest, 127 after): it falls only while
 // Mario stands on it, speeding up to about 2.15px/frame, and stops where it is when he leaves. Nothing else moves it.
 const motion=new PlatformMotion({levelId:'3-3',areaId:'main'});
 assert.equal(platformMotionModel(firstDropper,{levelId:'3-3',areaId:'main'}),'native-drop');
 assert.deepEqual(motion.artworkPosition(firstDropper,500),{x:960,y:97});
 assert.deepEqual(motion.artworkPosition(firstDropper,900),{x:960,y:97});
 for(let frame=500;frame<=516;frame++){motion.contact(firstDropper,frame);motion.advance(frame,0);}
 for(let frame=517;frame<=600;frame++)motion.advance(frame,0);
 const native=[[0,96],[2,97],[4,100],[6,105],[8,107],[10,114],[12,118],[14,123],[16,127],[20,127],[60,127]];
 for(const [k,y] of native)assert.ok(Math.abs(motion.collisionPosition(firstDropper,500+k).y-y)<=3,`k${k}: ${motion.collisionPosition(firstDropper,500+k).y} vs native ${y}`);
 assert.equal(motion.artworkPosition(firstDropper,600).y,motion.collisionPosition(firstDropper,600).y+1);
 assert.equal(motion.collisionPosition(firstDropper,600).y,motion.collisionPosition(firstDropper,540).y);
});

test('sky cloud starts on contact and continues after the rider jumps away',()=>{
 const motion=new PlatformMotion({levelId:'2-1',areaId:'sky-coins'});
 assert.deepEqual(motion.artworkPosition(cloud,1000),{x:256,y:161});
 motion.contact(cloud,1000);
 const frameCounts=[7,8,7,8,7,8,7,8,7,8,7,8];let frame=1000;
 for(const elapsed of frameCounts){const before=motion.artworkPosition(cloud,frame);frame+=elapsed;assert.equal(motion.artworkPosition(cloud,frame).x-before.x,elapsed);}
 assert.deepEqual(motion.collisionPosition(cloud,1090),{x:346,y:160});
 // A later landing must not restart its activation clock.
 motion.contact(cloud,1080);assert.equal(motion.artworkPosition(cloud,1090).x,346);
});

test('area reset clears contact activation and querying an earlier frame is deterministic',()=>{
 const motion=new PlatformMotion({levelId:'2-1',areaId:'sky-coins'});
 motion.contact(cloud,50);assert.equal(motion.artworkPosition(cloud,60).x,266);
 assert.equal(motion.artworkPosition(cloud,40).x,256);
 assert.equal(motion.artworkPosition(cloud,60).x,266);
 motion.reset();assert.equal(motion.artworkPosition(cloud,60).x,256);
 motion.reset({levelId:'3-3',areaId:'main'});assert.equal(platformMotionModel(cloud,{levelId:'3-3',areaId:'main'}),'unmeasured');
});

test('a native balance pair stays put until ridden, then the partners move in opposite directions',()=>{
 // Native 3-3 pair (reference RAM): objects at (1296,94) and (1408,126) that hold still until Mario stands on one of them;
 // the earlier sine fallback moved them from the first frame.
 const pulley:PlatformSpec={x:1293,y:95,width:48,axis:'balance',range:16,speed:0.25},partner:PlatformSpec={x:1420,y:128,width:48,axis:'x',range:16,speed:0.25};
 const context={levelId:'3-3',areaId:'main'};const motion=new PlatformMotion(context);
 assert.equal(platformMotionModel(pulley,context),'native-balance');assert.equal(platformMotionModel(partner,context),'native-balance');
 assert.deepEqual(motion.collisionPosition(pulley,30),{x:1296,y:94});assert.deepEqual(motion.collisionPosition(partner,30),{x:1408,y:126});
 for(let frame=20;frame<=60;frame++){motion.contact(pulley,frame);motion.advance(frame,1000);}
 assert.deepEqual(motion.collisionPosition(pulley,10),{x:1296,y:94});
 assert.ok(motion.collisionPosition(pulley,61).y>94+3,'the loaded side sinks');
 assert.equal(motion.collisionPosition(pulley,61).y-94,126-motion.collisionPosition(partner,61).y,'the partner rises by the same amount');
});

test('6-2 descending water platforms match every captured complete pose at the measured epoch',()=>{
 const motion=new PlatformMotion({levelId:'6-2',areaId:'optional-water'});
 for(const observed of waterObservations.platforms){
  const platform=observed.spec as PlatformSpec;
  assert.equal(platformMotionModel(platform,{levelId:'6-2',areaId:'optional-water'}),'water-descender');
  for(const [frame,y]of observed.samples)assert.equal(Math.floor(motion.artworkPosition(platform,frame+78).y),y,`${platform.x}/${frame}`);
  const before=motion.artworkPosition(platform,375);motion.contact(platform,323);
  assert.deepEqual(motion.artworkPosition(platform,375),before);
  assert.equal(motion.collisionPosition(platform,375).y,before.y-1);
 }
});

test('5-2 uses independently observed48px platforms and its own water-entry epoch',()=>{
 const context={levelId:'5-2',areaId:'optional-water'},motion=new PlatformMotion(context);
 for(const observed of fiveTwoWaterObservations.platforms){
  const platform=observed.spec as PlatformSpec;
  assert.equal(platform.width,48);assert.equal(platformMotionModel(platform,context),'water-descender');
  // Source offsets are relative to first coarse water image at+121; inferred
  // room load is+75, so46 actual simulation frames have elapsed there.
  for(const [frame,y]of observed.samples)assert.equal(Math.floor(motion.artworkPosition(platform,frame+46).y),y,`${platform.x}/${frame}`);
 }
});
