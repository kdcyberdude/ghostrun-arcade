import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {moodInventory,hash} from '../tools/harness/native-mood-corpus.js';
import {moodNativeTimeline} from '../tools/harness/native-mood-audit.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {selectNativeAreaBinding,nativeAreaBindings} from '../tools/harness/native-area-identity.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import data from './fixtures/native-mood-entries.json';
const unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));
test('mood discovery includes ignored/hidden paths, deduplicates pad content and retains every provenance/summary',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'smb-mood-inventory-'));try{
  for(const part of ['.hidden','visible']){const d=path.join(dir,part,'eval','it000001');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'smb_mood0.pads.bin'),Buffer.from([0,8,128,129]));fs.writeFileSync(path.join(d,'summary.json'),JSON.stringify([{game:'smb',mood:0,deaths:3}]));}
  fs.writeFileSync(path.join(dir,'unrelated.pads.bin'),Buffer.from([1]));
  const runs=moodInventory(dir);assert.equal(runs.length,1);assert.equal(runs[0].frames,4);assert.equal(runs[0].sha256,hash(Buffer.from([0,8,128,129])));assert.equal(runs[0].provenance.length,2);assert.deepEqual(runs[0].provenance[0].summary,{game:'smb',mood:0,deaths:3});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('real native POWER-ON fixture accounts for every input row and detects InitializeArea from source task0→1',()=>{
 const ram=unpack(data.prefix.ram),pads=unpack(data.prefix.pads),timeline=moodNativeTimeline(ram);
 assert.equal(pads.length,100);assert.equal(ram.length,204800);assert.deepEqual(timeline.loads,[62]);
 assert.equal(timeline.spans[0].from,0);assert.equal(timeline.spans.at(-1)!.to,100);assert.equal(timeline.spans.reduce((n,s)=>n+s.to-s.from,0),100);
 for(let i=1;i<timeline.spans.length;i++)assert.equal(timeline.spans[i].from,timeline.spans[i-1].to);
 assert.ok(timeline.spans.some(s=>s.mode===0),'title/demo is retained');assert.ok(timeline.spans.some(s=>s.mode===1&&s.task===1),'level setup is retained');
 assert.throws(()=>moodNativeTimeline(ram.subarray(1)),/whole PPU rows/);
});
test('native main, underground, pipe-return and life-entry snapshots use ROM area origins without pose fitting',()=>{
 const levels=observedLevels();assert.equal(data.entries.length,10);
 for(const e of data.entries){
  const ram=unpack(e.initialRam),level=levels.find(l=>l.id===e.level)!,binding=selectNativeAreaBinding(level,nativeAreaBindings(level).bindings,ram[0xe7]+256*ram[0xe8],ram[0x71a]);
  assert.ok(binding.some(b=>b.area===e.binding.area&&b.offset===e.binding.offset),`source binding entry${e.index}`);
  const start=decodeEntrance(ram,{schema:'native-mood-entry-v1',level:e.level,areaBinding:e.binding}),sim=new Simulation(levels);sim.reset(true);initializeEntrance(sim,start);
  assert.equal(sim.area.id,e.binding.area);assert.equal(sim.player.x,ram[0x6d]*256+ram[0x86]+ram[0x400]/256+e.binding.offset);
  assert.equal(sim.camera,ram[0x71a]*256+ram[0x71c]+e.binding.offset);assert.equal(sim.random.frame,ram[9]);assert.equal(sim.intervalControl,ram[0x77f]);
 }
 const returning=data.entries.find(e=>e.index===2)!;assert.equal(unpack(returning.initialRam)[0x71a],10,'native return page differs from level start');
});

test('engine8 falling snapshot preserves the native entry gravity instead of selecting a new jump class',()=>{
 const e=data.entries.find(e=>e.index===4)!,sim=new Simulation(observedLevels()),initial=unpack(e.initialRam);sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,{schema:'native-mood-entry-v1',level:e.level,areaBinding:e.binding}));
 (sim as any).inputs=[];const pads=unpack(e.followingPads!),ram=unpack(e.followingRam!),names=['a','b','select','start','up','down','left','right'] as const;
 for(let f=0;f<pads.length;f++){sim.step(names.filter((_,b)=>pads[f]&(1<<b)),1);const r=ram.subarray(f*2048,(f+1)*2048);assert.equal(sim.player.y,r[0xce]+32+r[0x416]/256,`native row ${e.frame+f+1}`);assert.equal(sim.player.vy,r[0x9f]+r[0x433]/256);}
});
test('checkpoint snapshot preserves native Piranhas and diagnoses any restored undeclared actor',()=>{
 const e=data.entries.find(e=>e.index===105)!,ram=unpack(e.initialRam),sim=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex(l=>l.id===e.level);sim.loadArea(e.binding.area);const declared=sim.enemies.some(e=>e.kind==='piranha'&&e.originX===1848);const init=initializeEntrance(sim,decodeEntrance(ram,{schema:'native-mood-entry-v1',level:e.level,areaBinding:e.binding}));
 assert.deepEqual(init.snapshotActors,declared?[]:[{code:'snapshot-native-actor-not-declared',kind:'piranha',slot:2,x:1848,downY:176}]);
 const actor=sim.enemies.find(e=>e.active&&e.enemySlot===2)!;assert.equal(actor.x,1848);assert.deepEqual(actor.pir,{y:176,speed:1,flag:0,up:152,down:176,timer:0});
});

test('control-ready native snapshots clear entry hiding without changing the native timer phase',()=>{
 const e=data.entries.find(e=>e.index===4)!,sim=new Simulation(observedLevels()),r=unpack(e.initialRam);sim.reset(true);initializeEntrance(sim,decodeEntrance(r,{schema:'native-mood-entry-v1',level:e.level,areaBinding:e.binding}));
 assert.equal(sim.entryTimerHidden,false);assert.equal((sim as any).entryInputDelay,0);assert.equal(sim.timerFrames,(24-r[0x787])%24);
});
import {compareRun} from '../tools/harness/native-divergence.js';
test('legacy source-snapshot readout inverts the declared ROM origin instead of comparing compiled x with native x',()=>{
 const e=data.entries.find(e=>e.index===6)!,initial=unpack(e.initialRam),pads=unpack(e.followingPads!),ram=unpack(e.followingRam!);
 assert.equal(e.binding.offset,-2816);const start=decodeEntrance(initial,{schema:'native-mood-entry-v1',level:e.level,areaBinding:e.binding});
 const result=compareRun(start,pads,f=>ram.subarray(f*2048,(f+1)*2048),e.level,true);assert.equal(result.fields.x,null);assert.equal(result.fields.y,null);
});
