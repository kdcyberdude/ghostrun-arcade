import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativePlatformLanding,nativePlatformHeadBump,nativeBackgroundSkipped} from '../src/native-platform-contact.js';
import {PlatformMotion,nativePlatformHoldsSlot} from '../src/platform-motion.js';
import {observedLevels} from '../src/levels.js';

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
