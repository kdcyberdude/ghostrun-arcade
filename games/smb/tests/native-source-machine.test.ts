import {test} from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import zlib from 'node:zlib';
import {NativeSourceMachine} from '../src/native-source-machine.js';import {NativeSourcePpu} from '../src/native-source-ppu.js';
import program from '../data/native-source-program.json';import graphics from '../data/native-source-ppu-graphics.json';import fixture from './fixtures/native-source-machine.json';
type Case={capture:string;pads:string;ramSha256:string[];cpu:Record<string,number>[];nmis:{startCycles:number;cycles:number}[]};
const cases=JSON.parse(zlib.gunzipSync(Buffer.from(fixture.proof,'base64')).toString()) as Case[];
const ops=new Map(program.instructions.map(r=>[r[0],r[1]]));
test('source-owned CPU/PPU predicts partial NMI continuations from power-on, with every RAM sample exact',()=>{
 assert.equal(cases.length,3);assert.equal(fixture.samples,946);
 for(const c of cases){
  const m=new NativeSourceMachine(),pads=Buffer.from(c.pads,'base64'),nmis=new Map<number,number>();let nmiStart:number|undefined,partial=0;
  m.onInstruction=(event,machine)=>{if(event.nmiServiced)nmiStart=event.cpuBefore.cycles-7;if(ops.get(event.pc)==='RTI'&&nmiStart!==undefined){nmis.set(nmiStart,machine.cycles-nmiStart);nmiStart=undefined;}};
  assert.ok(m.ram.every(v=>v===255));
  for(let frame=0;frame<fixture.samples;frame++){
   m.step(pads[frame]);const actual=createHash('sha256').update(m.ram).digest('hex');assert.equal(actual,c.ramSha256[frame],`${c.capture} POWERON RAM${frame}`);
   const cpu=c.cpu.find(r=>r.row===frame);if(cpu){const snapshot=m.snapshot();for(const key of ['pc','cycles','ppuFrame','ppuDot','sp','a','x','y'] as const)assert.equal(snapshot[key],cpu[key],`${c.capture} ${frame} ${key}`);assert.equal(snapshot.nmi,cpu.ppuNmi);if(cpu.pc!==0x8057)partial++;}
  }
  assert.ok(partial>0,'actual native CPU is observed inside a procedure at the PPU boundary');
  for(const expected of c.nmis)assert.equal(nmis.get(expected.startCycles),expected.cycles,`${c.capture} dynamic source NMI cost`);
 }
});
test('source machine exposes exact writes and retains incomplete instruction ownership without replay inputs',()=>{
 const m=new NativeSourceMachine();const writes:{address:number;value:number}[]=[];m.onInstruction=e=>writes.push(...e.writes);
 m.step(255);assert.ok(writes.some(w=>w.address===0x2000&&w.value===16));assert.equal(m.pc,0x800d);
 const ppu=new NativeSourcePpu();ppu.write(0,128);ppu.status=128;assert.equal(ppu.read(2)&128,128);assert.equal(ppu.status&128,0);assert.equal(ppu.nmi,false);assert.equal(ppu.w,0);
 assert.equal(graphics.opacity.length,4096);assert.equal(graphics.titleAddress,0x1ec0);assert.equal(graphics.title.length,320);
 assert.equal(Object.hasOwn(program,'proof'),false);assert.equal(Object.hasOwn(graphics,'proof'),false);
 assert.throws(()=>new NativeSourcePpu().read(7),/outside source-opacity timing coverage/);
});
test('sparse/no observer and source idle batching preserve every native sample',()=>{
 for(const [index,c] of [...cases,cases[0]].entries()){const m=new NativeSourceMachine(),pads=Buffer.from(c.pads,'base64');let entries=0,returns=0,nmis=0;
  if(index<cases.length){m.observerPcs=new Set([0x92b0,0x92c7]);m.onInstruction=event=>{assert.ok(event.nmiServiced||m.observerPcs!.has(event.pc));if(event.nmiServiced)nmis++;if(event.pc===0x92b0)entries++;if(event.pc===0x92c7)returns++;};}
  for(let frame=0;frame<fixture.samples;frame++){m.step(pads[frame]);assert.equal(createHash('sha256').update(m.ram).digest('hex'),c.ramSha256[frame],`${c.capture} sparse RAM${frame}`);const expected=c.cpu.find(r=>r.row===frame);if(expected){const actual=m.snapshot();for(const key of ['pc','cycles','ppuFrame','ppuDot','sp','a','x','y'] as const)assert.equal(actual[key],expected[key]);}}
  if(index<cases.length){assert.equal(entries,returns);assert.ok(entries>0&&nmis>0);}
 }
});
