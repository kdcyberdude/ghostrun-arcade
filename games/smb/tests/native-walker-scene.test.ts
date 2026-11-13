import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {nativeAreaBindings} from '../src/native-area-catalog.js';
import {applyNativeWalkerGroups,nativeWalkerScene} from '../tools/native-walker-groups.mjs';
import layouts from '../data/native-walker-groups.json';
import window from './fixtures/native-walker-entry-window.json';

const level=observedLevels().find(l=>l.id===window.level)!,scene=layouts.find(l=>l.level===level.id&&l.area==='area-2')!;

test('secondary walker roster is a ROM stream projection through its authenticated entry page',()=>{
 const binding=nativeAreaBindings(level).bindings.find(b=>b.area===scene.area)!,raw=layouts.find(l=>l.pointer===binding.code&&l.area===level.main)!;
 assert.equal(scene.pointer,binding.code);assert.equal(scene.sceneOffset,binding.offset);
 assert.deepEqual(scene.singles,nativeWalkerScene(raw,{level:level.id,area:scene.area,offset:binding.offset,width:level.areas.find(a=>a.id===scene.area)!.width,source:binding.source}).singles);
 const actor=level.areas.find(a=>a.id===scene.area)!.enemies.filter(e=>e.nativeOffset!==undefined);
 assert.deepEqual(actor.map(e=>[e.nativeId,e.nativeOffset,e.x,e.y]),[[2,14,256,208],[2,16,288,208],[14,21,432,208],[14,23,464,208],[14,25,688,208],[14,27,720,208]]);
 const copy=structuredClone([level]);applyNativeWalkerGroups(copy,[scene]);const once=structuredClone(copy);applyNativeWalkerGroups(copy,[scene]);assert.deepEqual(copy,once);
});

test('raw page and portal skips derive native pipe-entry birth passes without a fitted delay',()=>{
 const sim:any=new Simulation([level]);sim.reset(true);sim.loadArea(scene.area,undefined,0,true,true);sim.enemyContactOff=true;sim.areaControls.seedNative(window.rows[0].column-24,false);
 for(let render=0;render<12;render++)sim.renderInitialSpringColumns();
 assert.equal(sim.parserColumnX,window.rows[0].column*16+scene.sceneOffset!);
 assert.deepEqual(sim.enemies.filter((e:any)=>e.active).map((e:any)=>[e.enemySlot,e.kind,e.x,e.y]),window.rows[0].actors.map(e=>[e.slot,'piranha',e.x+scene.sceneOffset!,e.y]));
 assert.deepEqual([sim.walkerStream.offset,sim.walkerStream.page,Number(sim.walkerStream.selected)],window.rows[0].cursor);
 for(const row of window.rows.slice(1)){
  sim.random.frame=row.counter;sim.broClock=row.counter;sim.secondaryHardMode=row.hard;sim.primaryHardMode=row.primaryHard;
  sim.updateEnemies(sim.player.y);sim.primeNativeEntryObjects();
  assert.deepEqual([sim.walkerStream.offset,sim.walkerStream.page,Number(sim.walkerStream.selected)],row.cursor,`cursor row${row.frame}`);
  const actual=sim.enemies.filter((e:any)=>e.active&&e.nativeId===2).map((e:any)=>({slot:e.enemySlot,id:e.nativeId,state:e.walkerState??0,x:e.x,y:e.y,...e.fall}));
  const expected=row.actors.filter(e=>e.id===2).map(e=>({...e,x:e.x+scene.sceneOffset!}));assert.deepEqual(actual,expected,`birth/movement row${row.frame}`);
 }
});
