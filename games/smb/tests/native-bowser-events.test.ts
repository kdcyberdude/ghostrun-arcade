import {test} from 'node:test';import assert from 'node:assert/strict';
import data from './fixtures/native-bowser-events.json';import {stepNativeBowser} from '../src/native-bowser.js';
test('native BowserControl follows every observed slot-byte transition',()=>{
 let m=structuredClone(data.events[0].before),last={level:'',frame:-2,slot:-1};
 for(const event of data.events){
  if(event.level!==last.level||event.slot!==last.slot||event.frame!==last.frame+1)m=structuredClone(event.before);
  stepNativeBowser(m,event.input);assert.deepEqual(m,event.after,`${event.level} row${event.frame}, slot${event.slot}`);last=event;
 }
});

test('native Bowser halves use their own inclusive contact boxes',async()=>{
 const {nativeBowserState,nativeBowserHit}=await import('../src/native-bowser.js');
 const m=nativeBowserState(2160,128);m.direction=2;
 const p={x:2150,y:128,size:0,duck:false};
 assert.equal(nativeBowserHit(m,p,2),false,'Mario is above both half boxes');
 p.y=130;assert.equal(nativeBowserHit(m,p,2),true,'player bottom130 reaches front top130');
 assert.equal(nativeBowserHit(m,p,3),false,'odd counter rows skip the test');
});

test('Bowser hammers are requested every fourth frame only while the jump timer is0 in worlds6-8',async()=>{
 const {nativeBowserState}=await import('../src/native-bowser.js');
 for(const world of [5,6,8])for(const frame of [31,32]){
  const m=nativeBowserState(2160,120);m.timer=1;m.move.speed=-2;
  assert.equal(stepNativeBowser(m,{frame,byte:0,playerX:2000,world,hard:true}).hammer,world>=6&&frame===32);
 }
});

test('both native readouts compare the primary Bowser anchor and its32px foot convention',async()=>{
 const {simEntities}=await import('../tools/harness/native-entities.js');
 const {strictSimEntities}=await import('../tools/harness/native-strict-entities.js');
 const sim={enemies:[{kind:'bowser',active:true,dead:0,enemySlot:0,x:2144,y:160,nativeBowser:{x:2160}}],items:[]};
 assert.deepEqual(simEntities(sim),[{kind:'bowser',x:2160,y:128}]);
 assert.deepEqual(strictSimEntities(sim),[{bank:'enemy',slot:0,kind:'bowser',x:2160,y:128,source:'enemy'}]);
});
