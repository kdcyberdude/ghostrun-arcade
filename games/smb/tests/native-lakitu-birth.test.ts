import {test} from 'node:test';import assert from 'node:assert/strict';import zlib from 'node:zlib';import {createHash} from 'node:crypto';
import {nativeEnemyStream} from '../tools/native-enemy-stream.mjs';import {applyNativeLakitus} from '../tools/native-lakitus.mjs';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import {strictCompare} from '../tools/harness/native-strict.js';
import data from '../data/native-lakitu.json';import fixture from './fixtures/native-lakitu-birth.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64'))),names=['a','b','select','start','up','down','left','right'] as const;

test('all six native placed Lakitu records retain raw page controls and source stream order',()=>{
 assert.equal(data.streams.length,3);assert.equal(data.levels.length,6);
 for(const r of data.levels){
  const stream=data.streams.find(s=>s.pointer===r.pointer)!;
  const decoded=nativeEnemyStream(stream.bytes,true).find(o=>o.id===17&&o.offset===r.offset)!;
  assert.ok(decoded);assert.deepEqual([decoded.x,decoded.y],[r.x,r.y]);assert.equal(r.bytes[1]&63,17);
 }
 const levels=structuredClone(observedLevels());applyNativeLakitus(levels,data.levels);
 const actors=levels.flatMap(l=>l.areas.flatMap(a=>a.enemies.filter(e=>e.kind==='lakitu')));assert.equal(actors.length,6);
 assert.ok(actors.every(e=>e.nativeId===17&&e.nativeColumn===e.x&&e.nativeOffset!==undefined));
});

test('every actual placed Lakitu birth has native init bytes and retained free-slot fractions',()=>{
 assert.equal(fixture.inputs,368);assert.equal(fixture.frames,5178452);assert.equal(fixture.events.length,9);assert.deepEqual(fixture.diagnostics,[]);
 for(const e of fixture.events){
  assert.equal(e.after.flag,1);assert.equal(e.after.id,17);assert.equal(e.after.state,0);assert.equal(e.after.box,3);
  assert.deepEqual([e.after.speed,e.after.vertical,e.after.force,e.after.direction,e.reappear],[0,0,0,2,0]);
  assert.equal(e.after.xFraction,e.before.xFraction);assert.equal(e.after.fraction,e.before.fraction);assert.equal(e.after.y,e.record!.y);
 }
 assert.equal(fixture.pending.length,184);
 for(const e of fixture.pending){assert.equal(e.afterOffset,e.record.offset);assert.equal(e.timerAfter,Math.max(0,e.timerBefore-1));assert.ok(e.births.every(b=>b.id!==17&&b.id!==18),'placed duplicate takes precedence over CheckFrenzyBuffer');}
});

test('all nine native entry replays include creation and first movement without dropping birth rows',()=>{
 assert.equal(fixture.replays.length,9);
 for(const e of fixture.replays){
  const initial=unpack(e.initialRam),ram=unpack(e.ram),pads=unpack(e.pads);assert.equal(createHash('sha256').update(ram).digest('hex'),e.ramSha256);
  const start=decodeEntrance(initial,e.receipt),audit=strictCompare(start,pads,ram,e.level);assert.equal(audit.coverage.frames,e.frames);
  for(const [field,first]of Object.entries(audit.fields))assert.equal(first,null,`${e.input}/${e.id} entry${e.sourceFrameOffset} ${field}`);
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,start);sim.step([],0);sim.inputs=[];
  for(let f=0;f<pads.length;f++){
   sim.step(names.filter((_,bit)=>pads[f]&(1<<bit)),1);
   const birth=e.births.find(b=>b.row===e.sourceFrameOffset+f);if(!birth)continue;
   const actor=sim.enemies.find((a:any)=>a.active&&!a.slotFreed&&a.kind==='lakitu'&&a.enemySlot===birth.slot);assert.ok(actor,`native creation row ${birth.row}`);
   assert.deepEqual([actor.x,actor.y-24,actor.age,actor.lak.dir,actor.lak.speed,actor.lak.box],[birth.after.x+birth.after.xFraction/256,birth.after.y,0,0,0,3]);
   assert.equal(actor.graphicsVisible,false,'native initializer does not run EnemyGfxHandler or MoveLakitu');
  }
 }
});
