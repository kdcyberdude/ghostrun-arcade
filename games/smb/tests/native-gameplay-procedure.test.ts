import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {NativeSourceMachine} from '../src/native-source-machine.js';
import fixture from './fixtures/native-gameplay-procedure.json';
type Cpu={pc:number;a:number;x:number;y:number;p:number;sp:number;cycles:number};
type Call={from:number;to:number;instructions:number;initial:Cpu;final:Cpu;before:string;after:string;partials:{row:number;cpu:Cpu;ram:string}[]};
const cases=JSON.parse(gunzipSync(Buffer.from(fixture.records,'base64')).toString()) as {id:string;entry:number;records:Call[]}[];

test('source gameplay/parser paths reproduce native procedure RAM, CPU and exact dynamic cost',t=>{
 const visited=new Set<number>();let calls=0,split=0,partialSamples=0;
 for(const c of cases)for(const r of c.records){
  // A single actual procedure entry is the test input. No intermediate native
  // snapshots or future values are read by the source instruction executor.
  const m=new NativeSourceMachine();Object.assign(m.cpu,r.initial);m.ram.set(Buffer.from(r.before,'hex'));
  assert.equal(m.pc,c.entry);const checkedPartials=new Set<number>();
  for(let i=0;i<r.instructions;i++){
   const event=m.stepInstruction();visited.add(event.pc);assert.equal(event.nmiServiced,false);
   assert.ok(event.reads.every(a=>a.address<0x2000||a.address>=0x8000),'isolated procedure has no hardware-feedback reads');
   for(const partial of r.partials)if(m.cycles===partial.cpu.cycles){assert.deepEqual(m.cpu,partial.cpu,`native partial CPU at row${partial.row}`);assert.equal(Buffer.from(m.ram).toString('hex'),partial.ram,`native partial RAM at row${partial.row}`);checkedPartials.add(partial.row);partialSamples++;}
  }
  const label=`${c.id.slice(0,8)} ${r.from}..${r.to} $${c.entry.toString(16)}`;
  assert.deepEqual(m.cpu,r.final,`${label} registers/cycles`);assert.equal(Buffer.from(m.ram).toString('hex'),r.after,`${label} all2048 RAM bytes`);
  assert.equal(checkedPartials.size,r.partials.length,'every native partial sample is reached without native state corrections');
  if(r.to!==r.from)split++;calls++;
 }
 assert.equal(calls,209);assert.equal(partialSamples,4);assert.equal(split,4,'three heavy GameCore passes plus their explicit parser pass span native samples');
 assert.ok(visited.size>1000,'varied readiness, player, actors, collisions, blocks, score and parser source paths executed');
 t.diagnostic(JSON.stringify({calls,partialSamples,sourceInstructions:visited.size}));
});

test('gameplay CPU fixture records the source program used to derive costs',()=>{
 const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(sha(fs.readFileSync(new URL('../data/native-source-program.json',import.meta.url))),fixture.sourceProgramSha256);
 assert.equal(fixture.romSha256,'f61548fdf1670cffefcc4f0b7bdcdd9eaba0c226e3b74f8666071496988248de');
 assert.equal(fixture.transitions,209);assert.equal(cases.length,8);
});
