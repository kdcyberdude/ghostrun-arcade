import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import {nativePlatformObject,nativePlatformSpawnCamera} from '../src/platform-motion.js';

// Native r5 5-3 mood1 (evidence/platslot-findings-20261111.md): slots hold id 40 @1363, 6, 15, 23 (Bullet Bill generator, x 1312) and 8 while the camera
// crosses the x 1504 platform's spawn (1202); the platform waits off screen, is still blocked when it would be on screen, and never appears (rows 560-760).
function run(busy:boolean){
 const level=structuredClone(observedLevels().find(item=>item.id==='5-3')!);const sim=new Simulation([level]);sim.reset(true);
 const walker=sim.enemies.find(e=>e.kind==='goomba')!;
 sim.enemies=busy?[1290,1300,1310,1320].map(x=>({...walker,x,originX:x,active:true,dead:0,squashed:false,vx:0})):[];
 sim.camera=1180;Object.assign(sim.player,{x:1180+112,y:100,vx:3,vy:0,grounded:false});
 for(let k=0;k<40;k++){sim.step(['right','b'],1);Object.assign(sim.player,{x:sim.camera+116,y:100,vx:3,vy:0});for(const e of sim.enemies){e.x=Math.max(e.x,sim.camera+20);e.y=200;e.vy=0;}}
 assert.ok(sim.camera>=1250,'camera '+sim.camera+' '+sim.phase);
 return sim.platformPosition(sim.area.platforms!.find(p=>p.x===1466&&p.y===145)!);
}
test('5-3: an id 40 platform whose slot never frees before it is on screen is never made',()=>{
 assert.ok(run(true).y>1000);
 assert.ok(run(false).y<200);
});
test('5-3: the vertical Paratroopa at x 1184 starts at native feet 80 (route rows 43109-43180: top y 56)',()=>{
 const level=observedLevels().find(item=>item.id==='5-3')!;
 assert.equal(level.areas.find(a=>a.id==='main')!.enemies.find(e=>e.kind==='paratroopa'&&e.x===1184)!.y,80);
});

test('a platform waits until the allocation pass after its previous slot occupant is erased',()=>{
 // 1-2 v2: slot0 Goomba is erased on frame1590; the pending id38 lift
 // initializes on1591. The slot's pass cannot process a second object now.
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 sim.levelIndex=sim.levels.findIndex((l:any)=>l.id==='3-3');sim.loadArea('main');
 const platform=sim.area.platforms.find((p:any)=>p.x===452)!;
 sim.area.platforms=[platform];sim.camera=177;sim.frame=100;
 sim.enemies=[1,2,3,4].map(enemySlot=>({kind:'goomba',active:true,dead:0,x:300,y:208,enemySlot}));
 sim.slotReleaseFrame[0]=sim.frame;
 assert.equal(sim.nativeSlotsFull(platform),true);
 assert.deepEqual([...sim.objectSlots(new Set([1,2,3,4]))],[]);
 sim.frame++;
 assert.equal(sim.nativeSlotsFull(platform),false);
 assert.deepEqual([...sim.objectSlots(new Set([1,2,3,4]))],[0]);
 sim.slotReleaseFrame[0]=sim.frame;sim.loadArea('main');
 assert.deepEqual(sim.slotReleaseFrame,[-1,-1,-1,-1,-1],'area load clears slot-pass history');
});


test('the native area-parser task7 postpones a lift initialization by one row',()=>{
 // 4-2 v2: x1980 lift threshold1665 is reached on2015, but the32px
 // scroll crossing left task7. Native initializes both lifts on2016.
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';
 const sim:any=new Simulation([level]);sim.reset(true);sim.enemies=[];
 const p=sim.area.platforms.find((p:any)=>p.x===1980&&p.y===32)!;sim.area.platforms=[p];
 const o=nativePlatformObject(p,sim.platformMotion.context)!;
 sim.camera=nativePlatformSpawnCamera(o);sim.frame=100;sim.platformFrame=100;sim.scrollCrossFrame=99;
 sim.platformMotion.advance(100,sim.camera,40);sim.platformSlotResidues();
 assert.equal(sim.platformSlots.size,0,'a blocked parser cannot run a platform initializer');
 assert.equal(sim.slotYSpeed[0],0,'native slot speed is unchanged until initialization');
 sim.gateNativePlatforms(sim.camera-1);
 assert.equal(sim.platformMotion.waiting.has(p),true);assert.ok(sim.platformMotion.collisionPosition(p,100).y>1000);
 sim.frame=101;sim.platformFrame=101;sim.platformMotion.advance(101,sim.camera,41);sim.gateNativePlatforms(sim.camera);
 assert.equal(sim.platformMotion.waiting.has(p),false);assert.equal(sim.platformMotion.collisionPosition(p,101).y,32);
});

test('an earlier slot-query caller cannot destroy the inherited lift fraction before the first motion',()=>{
 // 4-2 native lift slot0 inherits136 on2016 and writes152 on2017. A
 // group/busy-slot query can reserve its slot before the normal residue pass.
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';
 const sim:any=new Simulation([level]);sim.reset(true);sim.enemies=[];
 const p=sim.area.platforms.find((p:any)=>p.x===1980&&p.y===32)!;sim.area.platforms=[p];
 sim.camera=nativePlatformSpawnCamera(nativePlatformObject(p,sim.platformMotion.context)!);
 sim.frame=100;sim.platformFrame=100;sim.slotVertical[0].fraction=136;
 sim.platformMotion.advance(100,sim.camera,40);sim.objectSlots(new Set());
 sim.frame=101;sim.platformFrame=101;sim.platformMotion.advance(101,sim.camera,41);sim.platformSlotResidues();
 assert.equal(sim.slotVertical[0].fraction,152,'initial fraction is captured at allocation, before any motor write');
 assert.equal(sim.platformMotion.collisionPosition(p,101).y,31);
});
