import {test} from 'node:test';import assert from 'node:assert/strict';import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';import type {Button} from '../src/types.js';import fixture from './fixtures/native-castle-stream-runtime.json';import seven from './fixtures/native-castle-drop-runtime.json';import {strictNativeEntities,strictSimEntities} from '../tools/harness/native-strict-entities.js';
const buttons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of [...fixture.runs,...seven.runs])test(`${run.level}: every live native castle EnemyData cursor row includes victory and respawn`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.inputs=[];
 for(let frame=0;frame<run.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>run.pads[frame]&(1<<bit)),1);const stream=sim.placedStream;assert.ok(stream,`source profile row${frame}`);
  assert.deepEqual([stream.offset,stream.page,+stream.selected],run.rows[frame],`native source cursor row${frame}`);
  const bank=run.banks.find(b=>b.frame===frame);if(!bank)continue;
  const ram=new Uint8Array(2048);for(const [slot,bytes]of bank.slots.entries()){ram[15+slot]=bytes[0];ram[22+slot]=bytes[1];ram[110+slot]=bytes[2]>>8;ram[135+slot]=bytes[2]&255;ram[182+slot]=bytes[3]>>8;ram[207+slot]=bytes[3]&255;ram[30+slot]=bytes[4];}
  const actual=strictSimEntities(sim),native=strictNativeEntities(ram);
  if(run.level==='7-4')assert.deepEqual(actual.filter(e=>e.bank==='enemy').map(e=>[e.slot,e.kind,e.x,e.y]).sort(),native.entities.filter(e=>e.bank==='enemy').map(e=>[e.slot,e.kind,e.x,e.y]).sort(),`complete native bank row${frame}`);
  for(const expected of native.entities.filter(e=>e.bank==='enemy')){const actor=actual.find(e=>e.bank==='enemy'&&e.slot===expected.slot);assert.ok(actor,`native bank owner row${frame} slot${expected.slot}`);assert.deepEqual([actor.kind,actor.x,actor.y],[expected.kind,expected.x,expected.y],`native actor row${frame} slot${expected.slot}`);}
  for(const [slot,bytes]of bank.slots.entries())if(bytes[0]===1&&[43,44].includes(bytes[1])){const platform=[...sim.platformSlots].find(([,owner])=>owner===slot)?.[0];assert.ok(platform);assert.equal(sim.platformMotion.slotSpeedByte(platform,sim.platformFrame),bytes[6],`native retained058 row${frame} slot${slot}`);}
  for(const [slot,bytes]of bank.slots.entries())if(bytes[0]===1&&bytes[1]===12){const enemy=sim.enemies.find((e:any)=>e.active&&e.dead<90&&e.enemySlot===slot&&e.kind==='podoboo');assert.ok(enemy,`Podoboo slot${slot} row${frame}`);assert.deepEqual(enemy.pod,{y:bytes[3],speed:(bytes[5]<<24)>>24,force:bytes[8],fraction:bytes[9],timer:bytes[10]},`native Podoboo bytes row${frame} slot${slot}`);}
  for(const [slot,bytes]of bank.slots.entries())if(bytes[0]===1&&bytes[1]===41){const platform=[...sim.platformSlots].find(([,owner])=>owner===slot)?.[0];assert.ok(platform,`falling platform slot${slot} row${frame}`);const motor=sim.platformMotion.verticalState(platform,sim.platformFrame);assert.deepEqual(motor,{y:bytes[3]-256,speed:(bytes[5]<<24)>>24,force:bytes[8],fraction:bytes[9]},`native drop bytes row${frame} slot${slot}`);}

 }
});

test('native InitDropPlatform before/after preserves fractions and clears speed/force',()=>{
 const run=seven.runs[0],before=run.banks.find(b=>b.frame===73)!.slots[2],after=run.banks.find(b=>b.frame===74)!.slots[2];
 assert.equal(before[0],0);assert.deepEqual(after.slice(0,6),[1,41,352,384,0,0]);
 assert.equal(after[8],0);for(const index of [6,7,9])assert.equal(after[index],before[index],`retained slot alias ${index}`);
 assert.deepEqual(run.rows[74],[8,6,1]);
});
