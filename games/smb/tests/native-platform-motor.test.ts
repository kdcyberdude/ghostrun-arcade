import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeBalanceStep,nativeDropStep,nativeWrapState} from '../src/native-platform-motor.js';
import {nativeLiftState,PlatformMotion,nativePlatformObject} from '../src/platform-motion.js';
import {observedLevels} from '../src/levels.js';
import events from './fixtures/native-platform-rule-events.json';

test('native lift, wrap, drop and balance motors match every recorded live transition',()=>{
 assert.ok(events.length>200);
 for(const e of events){
  if(e.id===37){assert.deepEqual(nativeLiftState(e.spawnY!,e.age!,e.counter!,e.after.fraction),e.after,`${e.level} lift ${e.slot} age ${e.age}`);continue;}
  if([38,39,43,44].includes(e.id)){assert.deepEqual(nativeWrapState(e.before.y,1,e.before.fraction,e.id===38||e.id===43),e.after,`${e.level} wrap frame ${e.frame} slot ${e.slot}`);continue;}
  const state={...e.before};
  if(e.id===41)nativeDropStep(state,e.load!==0);else nativeBalanceStep(state,e.load);
  assert.deepEqual(state,e.after,`${e.level} frame ${e.frame} slot ${e.slot} id ${e.id} load ${e.load}`);
 }
});

test('balance motion integrates before acceleration and retains the previous slot fraction',()=>{
 // 3-3 v2: drop id41 leaves fraction125 in slot2 at frame471; the linked
 // balance object reuses it. Contact599 changes force, first pixel moves606.
 const state={y:126,speed:0,force:0,fraction:125};
 const expected=[126,126,126,126,126,126,126,125,125];
 for(const y of expected){nativeBalanceStep(state,-1);assert.equal(state.y,y);}
 // Later pair: vertical Paratroopa leaves55 in slot0 on removal885. The
 // same rule delays its first integer step for five contact frames.
 const next={y:126,speed:0,force:0,fraction:55};
 for(const y of [126,126,126,126,126,125]){nativeBalanceStep(next,-1);assert.equal(next.y,y);}
});


test('native lift aliases its slot X fraction byte as YPlatformTopYPos',()=>{
 const levels=observedLevels();let checked=0;
 for(const e of events){
  if(e.id!==37||e.age!==0)continue;
  const context={levelId:e.level,areaId:'main'},area=levels.find(l=>l.id===e.level)!.areas.find(a=>a.id==='main')!;
  const platform=area.platforms!.find(p=>{const o=nativePlatformObject(p,context);return o?.kind==='lift'&&o.y===e.spawnY;})!;
  assert.equal(new PlatformMotion(context).slotXByte(platform,0),e.xByte,`${e.level} native slot ${e.slot}`);checked++;
 }
 assert.ok(checked>=5);
});
