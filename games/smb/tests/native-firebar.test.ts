import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';
import {stepNativeFirebar,nativeFirebarProfiles,nativeFirebarParameters} from '../src/native-firebar.js';import {nativeMiscOffscreen} from '../src/native-misc.js';import {FirebarSlots} from '../src/firebar-slots.js';import {observedLevels} from '../src/levels.js';import fixture from './fixtures/native-firebar-calls.json';
const rows=JSON.parse(gunzipSync(Buffer.from(fixture.gzipBase64,'base64')).toString()) as {source:string;frame:number;slot:number;id:number;x:number;y:number;camera:number;master:number;speed:number;direction:number;before:number[];after:number[];offscreen:number}[];
test('native ProcFirebar instruction entry/return bytes and offscreen bits match across every castle capture',()=>{
 assert.equal(rows.length,fixture.checked);assert.ok(rows.length>20000);assert.ok(fixture.held>1000);assert.ok(fixture.offscreen>1000);
 for(const r of rows){const n={id:r.id,high:r.before[0],low:r.before[1],speed:r.speed,direction:r.direction},label=`${r.source} row${r.frame} slot${r.slot}`;
  assert.equal(nativeMiscOffscreen(r.x,r.y,r.camera),r.offscreen,label);stepNativeFirebar(n,r.x,r.y,r.camera,!r.master);assert.deepEqual([n.high,n.low],r.after,label);
 }
});
test('source firebar profile binding supplies the native ID speed and direction at each exact pivot',()=>{
 let matched=0;
 for(const level of observedLevels())for(const area of level.areas){
  const profiles=nativeFirebarProfiles(level,area.id);
  for(const bar of area.firebars??[]){const p=profiles.find(p=>p.x===bar.x&&p.y===bar.y);if(!p)continue;
   assert.deepEqual({speed:p.speed,direction:p.direction},nativeFirebarParameters(p.id));assert.equal(p.id===31,bar.length===12);matched++;
  }
 }
 assert.ok(matched>=30);
});
test('managed firebar slots preserve raw initializer bytes, expose pure readout, and release the current byte residues',()=>{
 const bar={x:104,y:104,length:12,speed:0.03},slots=new FirebarSlots([bar]);slots.managed=true;slots.beginFrame(0);assert.equal(slots.held().size,0);
 slots.initializeNative(bar,3,{id:31,high:24,low:0,speed:40,direction:0});slots.turn(3,0,false);
 assert.deepEqual(slots.nativeBytes(bar),{id:31,high:25,low:0,speed:40,direction:0},'long-arm horizontal correction runs during TimerControl hold');
 const snapshot=JSON.stringify(slots);for(let n=0;n<5;n++){slots.nativeBytes(bar);slots.centers(bar);}assert.equal(JSON.stringify(slots),snapshot);
 let residue:number[]=[];slots.release=(slot,high,low)=>{residue=[slot,high,low!];};slots.eraseAll();assert.deepEqual(residue,[3,25,0]);
 slots.initializeNative(bar,1,{id:31,high:255,low:0,speed:40,direction:0});slots.turn(1,-180,true);assert.equal(slots.nativeBytes(bar)!.high,255,'offscreen ProcFirebar returns before masking raw A0');
 slots.turn(1,0,true);assert.deepEqual(slots.nativeBytes(bar),{id:31,high:31,low:40,speed:40,direction:0});
});

test('recorded castle prefixes expose native A0/58 bytes from the live slot dispatcher',async()=>{
 const fs=await import('node:fs'),{Simulation}=await import('../src/simulation.js'),{decodeEntrance,initializeEntrance}=await import('../tools/harness/native-entrance.mjs');
 const buttons=['a','b','select','start','up','down','left','right'] as const;
 for(const [level,through]of [['1-4',541],['2-4',670]] as const){
  const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8')),unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64'))),pads=unpack(run.pads),ram=unpack(run.ram);
  const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(unpack(run.initialRam),{level}));sim.step([],0);sim.inputs=[];
  const calls=new Map<number,typeof rows>();for(const row of rows.filter(r=>r.source===`${level}.jsonl.firebars.jsonl`&&r.frame<=through)){const list=calls.get(row.frame)??[];list.push(row);calls.set(row.frame,list);}
  let checked=0;
  for(let f=0;f<=through;f++){
   sim.step(buttons.filter((_,b)=>pads[f]&(1<<b)),1);
   for(const r of calls.get(f)??[]){const bar=sim.area.firebars.find((b:any)=>b.x===r.x+4&&b.y===r.y+4);assert.ok(bar,`${level} row${f} pivot`);
    const nativeFlag=ram[f*run.addrs.length+run.addrs.indexOf(15+r.slot)];if(!nativeFlag){assert.equal(sim.firebarSlots.slotOf(bar),undefined,`${level} row${f} erased after ProcFirebar`);assert.equal(sim.slotYSpeed[r.slot],r.after[0]);checked++;continue;}
    assert.equal(sim.firebarSlots.slotOf(bar),r.slot,`${level} row${f} native ownership`);const n=sim.firebarSlots.nativeBytes(bar);assert.ok(n);assert.deepEqual([n.high,n.low],r.after,`${level} row${f} slot${r.slot}`);checked++;
   }
  }
  assert.ok(checked>300);
 }
});
