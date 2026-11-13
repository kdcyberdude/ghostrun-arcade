import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativePlatformLanding,nativePlatformHeadBump,nativeBackgroundSkipped,nativePlatformSide} from '../src/native-platform-contact.js';
import {PlatformMotion,nativePlatformHoldsSlot,nativeSmallPlatform} from '../src/platform-motion.js';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

test('native platform landing compares moved Mario feet against the platform before its move',()=>{
 // 4-3 v2 rows 473→474: Mario y86 + speed4 gives feet122; id37 is at
 // y122 before stepping to124. Native lands now, then positions Mario at92.
 const prior={x:992,y:122};
 assert.equal(nativePlatformLanding(122,4,1002,prior,48,false),0);
 assert.equal(nativePlatformLanding(121,4,1002,prior,48,false),undefined);
 assert.equal(nativePlatformLanding(127,4,1002,prior,48,false),0);
 assert.equal(nativePlatformLanding(128,4,1002,prior,48,false),undefined);
 assert.equal(nativePlatformLanding(122,-1,1002,prior,48,false),undefined);
});

test('native small lifts also support the second surface 128 pixels below their object',()=>{
 const prior={x:400,y:40};
 assert.equal(nativePlatformLanding(168,1,400,prior,32,true),128);
 assert.equal(nativePlatformLanding(173,1,400,prior,32,true),128);
 assert.equal(nativePlatformLanding(174,1,400,prior,32,true),undefined);
 assert.equal(nativePlatformLanding(16,1,400,{x:400,y:16},32,true),undefined);
});

test('platform underside contact uses moved Mario box top and a four-pixel window',()=>{
 // ProcLPlatCollisions: platform lower Y=top+13, small Mario upper Y=feet−12.
 for(const d of [22,23,24,25])assert.equal(nativePlatformHeadBump(80+d,false,100,{x:96,y:80},48),true);
 for(const d of [21,26])assert.equal(nativePlatformHeadBump(80+d,false,100,{x:96,y:80},48),false);
 assert.equal(nativePlatformHeadBump(114,true,100,{x:96,y:80},48),true);
});

test('PlayerBGCollision skips every probe at native Y $CF and outside screen page one',()=>{
 // 4-2 v2 rows632–636: native continues horizontally through the wall while
 // falling below the background-collision cutoff; it does not eject Mario.
 assert.equal(nativeBackgroundSkipped(32+0xce),false);
 assert.equal(nativeBackgroundSkipped(32+0xcf),true);
 assert.equal(nativeBackgroundSkipped(31),true);
});

test('native platform slot release uses its left position rather than the width',()=>{
 // 1-3 v2: id37 x880 is removed at row460 when camera crosses953.
 // Its former slot0 is reused by a Goomba; id40 later gets slot2's fraction128.
 const level=observedLevels().find(l=>l.id==='1-3')!,area=level.areas.find(a=>a.id==='main')!;
 const p=area.platforms!.find(p=>p.x===880)!,context={levelId:'1-3',areaId:'main'},motion=new PlatformMotion(context);
 assert.equal(nativePlatformHoldsSlot(motion,p,context,952,460),true);
 assert.equal(nativePlatformHoldsSlot(motion,p,context,953,460),false);
});


test('native platform sides eject a rising Mario beside a large platform',()=>{
 // 4-3 v2 row672: attempted x1445, feet91; the platform at1456/78
 // sees player right1458 inside its first8px, and ImpedePlayerMove ejects−1.
 assert.equal(nativePlatformSide(91,-4,false,1445,{x:1456,y:78},48),1);
 assert.equal(nativePlatformSide(95,-4,false,1442,{x:1456,y:78},48),0);
 assert.equal(nativePlatformSide(78,1,false,1445,{x:1456,y:78},48),0,'top landing wins');
 assert.equal(nativePlatformSide(77,-4,false,1445,{x:1456,y:78},48),0,'above the side');
 assert.equal(nativePlatformSide(91,-4,false,1500,{x:1456,y:78},48),-1);
});


test('only native small lifts43/44 have a repeated collision surface',()=>{
 const levels=observedLevels();
 for(const [levelId,areaId,expected] of [['1-2','area-2',false],['2-4','main',true]] as const){
  const area=levels.find(l=>l.id===levelId)!.areas.find(a=>a.id===areaId)!;
  assert.equal(nativeSmallPlatform(area.platforms!.find(p=>p.x===(expected?1372:2236))!,{levelId,areaId}),expected);
 }
});

test('landing on a platform ends the jump before a later zero-speed walk-off',()=>{
 // 4-3 v2 rows713–716: the rider leaves a balance platform with speed0 and
 // fraction240; gravity144/256 begins on the following airborne frame.
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='3-3')!]);sim.reset(true);
 sim.area.platforms=[{x:100,y:81,width:32,axis:'x',range:0,speed:0}];
 Object.assign(sim.player,{x:110,y:80,vy:0,grounded:false});
 sim.jumpArc=true;sim.runJump=true;sim.landJump='held';sim.landingFraction=240/256;sim.fallGravity=144/256;
 sim.updatePlatforms(80);
 assert.equal(sim.player.grounded,true);assert.equal(sim.jumpArc,false);
 sim.player.x=130;sim.player.grounded=false;sim.updatePlatforms(80);sim.walkOffStart(true);
 assert.equal(sim.player.grounded,false);assert.equal(sim.player.vy,0);assert.equal(sim.player.y,80+240/256);
 assert.equal(sim.walkOffFall(),true);assert.equal(sim.player.vy,144/256);
});


test('a balance motor in an earlier slot reads its later partner box at the previous camera offset',()=>{
 // 4-3 row784: motor slot0 reads first-platform slot4's previous DR_X134,
 // which overlaps Mario UL_X133; slot4 rebuilds DR_X131 later in the frame.
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='4-3')!]);sim.reset(true);
 const first=sim.area.platforms.find((p:any)=>p.x===1632)!,second=sim.area.platforms.find((p:any)=>p.x===1728)!;
 sim.platformSlots.set(first,4);sim.platformSlots.set(second,0);
 const cached=sim.platformContactPosition(first,0,3);
 assert.equal(cached.x,1635);
 assert.equal(nativePlatformLanding(cached.y,0,1679,cached,48,false),0);
 const current={...cached,x:1632};
 assert.equal(nativePlatformLanding(current.y,0,1679,current,48,false),undefined);
 sim.platformSlots.set(first,0);sim.platformSlots.set(second,4);
 assert.equal(sim.platformContactPosition(first,0,3).x,1632,'an earlier first slot has already refreshed its box');
});
