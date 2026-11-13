import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {nativeBowserState} from '../src/native-bowser.js';import data from './fixtures/native-mouth-flame-events.json';
for(const event of data.events)test(`native mouth flame uses visited-slot order, ${event.level} row${event.frame}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-4')!),area=level.areas.find(a=>a.id===level.main)!;area.firebars=[];area.platforms=[];area.enemies=[];
 const sim:any=new Simulation([level]);sim.reset(true);sim.random.bytes=[...event.random];sim.flameTimer=0;
 const boss={kind:'bowser',active:true,dead:0,enemySlot:event.bowser,nativeBowser:nativeBowserState(event.bodyX,event.bodyY)};
 sim.enemies=event.usedSlots.filter(slot=>slot!==event.bowser).map(slot=>({active:true,dead:0,enemySlot:slot}));sim.enemies.push(boss);sim.mouthFlame=boss;
 sim.passNativeMouthFlame(event.slot<event.bowser?0:event.bowser+1,event.slot<event.bowser?event.bowser:5);
 const flame=sim.items.find((i:any)=>i.nativeFlame);assert.ok(flame);
 assert.deepEqual([flame.nativeFlame.slot,flame.x,flame.y,flame.nativeFlame.target],[event.slot,event.x,event.y,event.target]);assert.equal(sim.mouthFlame,undefined);
});
test('unvisited mouth request waits through full later slots and skips parser task7',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='1-4')!]);sim.reset(true);sim.firebarSlots=undefined;sim.area.platforms=[];
 const boss={kind:'bowser',active:true,dead:0,enemySlot:1,nativeBowser:nativeBowserState(2160,128)};sim.enemies=[boss,...[2,3,4].map(enemySlot=>({active:true,dead:0,enemySlot}))];sim.mouthFlame=boss;
 sim.passNativeMouthFlame(2,5);assert.equal(sim.items.length,0);assert.equal(sim.mouthFlame,boss);
 sim.parserLoaderWasBlocked=true;sim.passNativeMouthFlame(0,1);assert.equal(sim.items.length,0);
 sim.parserLoaderWasBlocked=false;sim.passNativeMouthFlame(0,1);assert.equal(sim.items[0].nativeFlame.slot,0);
});

test('recorded mood route retains the native mouth slot/height and avoids the false flame death',async()=>{
 const {initializeEntrance}=await import('../tools/harness/native-entrance.mjs');const buttons=['a','b','select','start','up','down','left','right'];
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,data.full.entrance);sim.inputs=[];
 for(let frame=0;frame<data.full.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>data.full.pads[frame]&(1<<bit)),1);const row=data.full.rows.find(r=>r.frame===frame);if(!row)continue;
  assert.equal(sim.player.dead,false,`native frame ${frame}`);assert.equal(Math.floor(sim.player.x),row.x);assert.equal(sim.camera,row.camera);
  assert.deepEqual(sim.items.filter((i:any)=>i.nativeFlame&&i.life>0).map((i:any)=>({slot:i.nativeFlame.slot,x:i.x,y:i.y})),row.flames,`native flames ${frame}`);
 }
});
