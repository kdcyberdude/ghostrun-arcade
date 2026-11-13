import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import data from '../data/native-castle-flame-events.json';

for(const event of data.events)test(`native offscreen flame birth ${event.level} row ${event.frame}, slot ${event.slot}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id===event.level)!);
 const area=level.areas.find(a=>a.id===level.main)!;area.firebars=[];area.platforms=[];area.enemies=[];
 const sim:any=new Simulation([level]);sim.reset(true);sim.camera=event.camera;
 sim.random.bytes=[...event.random];sim.flameTimer=event.timerBefore;sim.flameTimerCounter=event.counterBefore;sim.flameFrenzy=true;
 sim.enemies=event.usedSlots.map(slot=>({active:true,dead:0,enemySlot:slot}));
 sim.passNativeCastleFlames();
 const flame=sim.items.find((i:any)=>i.nativeFlame);
 assert.ok(flame,'a free slot runs InitBowserFlame');
 assert.deepEqual([flame.x,flame.y,flame.nativeFlame.slot,flame.nativeFlame.target,sim.flameTimer,sim.flameTimerCounter],[event.x,event.y,event.slot,event.target,event.timer,event.counter]);
});

test('flame frenzy waits on a full enemy buffer and the native parser scroll-block row',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='3-4')!]);sim.reset(true);
 sim.camera=1400;sim.flameFrenzy=true;sim.enemies=[0,1,2,3,4].map(slot=>({active:true,dead:0,enemySlot:slot}));
 sim.passNativeCastleFlames();assert.equal(sim.items.length,0);
 sim.enemies=[];sim.firebarSlots=undefined;sim.scrollCrossFrame=sim.frame-1;
 sim.passNativeCastleFlames();assert.equal(sim.items.length,0);
});
