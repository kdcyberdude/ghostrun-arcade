import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {nativeAreaBindings} from '../src/native-area-catalog.js';
import type {Level} from '../src/types.js';
import window from './fixtures/native-walker-entry-window.json';

test('RenderingAreaGraphics preloads source plants before engine7, then native slots preserve every retained entry byte',()=>{
 const level=observedLevels().find(l=>l.id===window.level)!,binding=nativeAreaBindings(level).bindings.find(b=>b.area==='area-2')!,sim:any=new Simulation([level]);sim.reset(true);sim.loadArea('area-2',undefined,0,false,true);sim.enemyContactOff=true;
 sim.areaControls.seedNative(window.rows[0].column-24,false);sim.random.frame=window.rows[0].counter;sim.secondaryHardMode=window.rows[0].hard;sim.primaryHardMode=window.rows[0].primaryHard;
 for(let render=0;render<12;render++)sim.renderInitialSpringColumns();
 const assertActors=(row:typeof window.rows[number])=>{
  const actual=sim.enemies.filter((e:any)=>e.active&&!e.slotFreed&&e.dead<100).map((e:any)=>({slot:e.enemySlot,id:e.nativePipe?13:e.nativeId,state:e.walkerState??0,x:e.x,y:e.y,speed:e.pir?.flag??e.fall?.speed??0,force:e.pir?.down??e.fall?.force??0,fraction:e.pir?.up??e.fall?.fraction??0})).sort((a:any,b:any)=>a.slot-b.slot);
  assert.deepEqual(actual,row.actors.map(e=>({...e,x:e.x+binding.offset})),`entry row${row.frame}`);
 };
 assertActors(window.rows[0]);
 for(const [index,row]of window.rows.slice(1).entries()){
  sim.frame++;sim.random.tick();sim.tickIntervalTimers();assert.equal(sim.random.frame,row.counter);
  if(index===0){sim.broClock=sim.random.frame;sim.primeNativeEntryObjects(true);}else{sim.updateEnemies(sim.player.y);sim.primeNativeEntryObjects();}
  assertActors(row);assert.deepEqual([sim.walkerStream.offset,sim.walkerStream.page,Number(sim.walkerStream.selected)],row.cursor);
 }
});

function timerFixture(){
 const level:Level={id:'pipe-timer-fixture',main:'main',time:400,evidence:'Declared source timer/terrain component',areas:[{id:'main',width:1024,palette:0,theme:'ground',spawn:[40,208],tiles:[],enemies:[{kind:'piranha',x:248,y:184,nativePipe:{column:240,offset:0}},{kind:'piranha',x:536,y:184,nativePipe:{column:528,offset:20}}],nativePiranhaKills:[{column:512,offset:10}],evidence:'Declared pipe/warp column component'}]};
 const sim:any=new Simulation([level]);sim.reset(true);return sim;
}

test('warp clearing preserves the slot frame timer while empty slots keep counting and later pipe columns inherit it',()=>{
 const sim=timerFixture(),first=sim.enemies[0],second=sim.enemies[1];assert.equal(first.active,true);assert.equal(second.active,false);
 first.pir.timer=12;sim.slotFrameTimers[0]=12;sim.createNativePipeObjects(512);
 assert.equal(first.active,false);assert.equal(sim.warpZoneActive,true);assert.equal(sim.areaControls.locked,true);assert.equal(sim.slotFrameTimers[0],12);
 sim.frame++;sim.tickIntervalTimers();assert.equal(sim.slotFrameTimers[0],11);sim.createNativePipeObjects(528);
 assert.equal(second.active,true);assert.equal(second.enemySlot,0);assert.equal(second.pir.timer,11);assert.equal(second.graphicsVisible,false);
});

test('cleared terrain plants stay consumed until their actual source column is parsed again',()=>{
 const sim=timerFixture(),plant=sim.enemies[0];Object.assign(plant,{active:false,dead:100,slotFreed:true,slotHeld:false,slotLost:true});
 sim.piranhaColumns.through=1000;sim.birthParserPiranhas();sim.createNativePipeObjects(224);sim.enemyContactOff=true;sim.updateEnemies(sim.player.y);
 assert.equal(plant.active,false);sim.createNativePipeObjects(240);assert.equal(plant.active,true);assert.equal(plant.slotLost,false);assert.equal(plant.pir.down,160);
});

// OffscreenBoundsCheck's ADC #$38 drops the carry from the low byte:
// camera low>=199 retains a plant for an additional page, even behind Mario.
test('retained Piranha flags keep their frame timer and motor after the low-byte offscreen bound wraps',()=>{
 const sim=timerFixture(),plant=sim.enemies[0];sim.camera=280;plant.pir.timer=5;sim.slotFrameTimers[0]=5;
 // An ordinary low-byte camera releases this plant; the carry-wrapped bound retains it.
 sim.camera=480;assert.equal(sim.holdsNativeSlot(plant),true);sim.releaseNativeSlots();assert.equal(plant.slotFreed,false);
 for(let frame=0;frame<5;frame++){sim.frame++;sim.tickIntervalTimers();sim.updateNativePiranha(plant);}
 assert.equal(plant.pir.timer,0);assert.equal(plant.pir.flag,1);
 sim.camera=513;assert.equal(sim.holdsNativeSlot(plant),false);
});
