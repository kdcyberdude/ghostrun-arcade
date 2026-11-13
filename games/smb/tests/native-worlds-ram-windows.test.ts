import {test} from 'node:test';import assert from 'node:assert/strict';import {gunzipSync} from 'node:zlib';import {createHash} from 'node:crypto';
import {strictCompare} from '../tools/harness/native-strict.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';
import fixture from './fixtures/native-worlds-ram-windows.json';
for(const c of fixture.cases)test(`${c.level}: native coin/fish injury and camera-wrap regression window`,()=>{
 const initial=gunzipSync(Buffer.from(c.initial,'base64')),pads=gunzipSync(Buffer.from(c.pads,'base64')),ram=gunzipSync(Buffer.from(c.ram,'base64'));
 for(const [name,data]of Object.entries({initial,pads,ram}))assert.equal(createHash('sha256').update(data).digest('hex'),c.hashes[name as keyof typeof c.hashes]);
 const entrance=decodeEntrance(initial,{level:c.level},c.binding),report=strictCompare(entrance,pads,ram,c.level);
 assert.equal(report.first,null,JSON.stringify(report.fields));
 // The strict scene comparator does not include velocity fractions; verify that death keeps the observed low byte too.
 if(c.level==='4-4')return;
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'];for(const pad of pads)sim.step(names.filter((_,b)=>pad&(1<<b)),1);
 const last=ram.subarray(ram.length-2048);assert.equal(Math.round(sim.player.vx*4096),(last[0x57]<<24>>24)*256+last[0x705]);
});
