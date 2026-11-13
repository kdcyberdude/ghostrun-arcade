import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button,Enemy} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import {strictCompare} from '../tools/harness/native-strict.js';
import fixture from './fixtures/native-shell-chain-rekick.json';

test('1-2: stopping and re-kicking a shell preserves its native scoring chain',()=>{
 const initial=gunzipSync(Buffer.from(fixture.initial,'base64')),pads=gunzipSync(Buffer.from(fixture.pads,'base64')),ram=gunzipSync(Buffer.from(fixture.ram,'base64'));
 for(const [key,data]of Object.entries({initial,pads,ram}))assert.equal(createHash('sha256').update(data).digest('hex'),fixture.hashes[key as keyof typeof fixture.hashes]);
 const entrance=decodeEntrance(initial,{level:fixture.level},fixture.binding);
 assert.equal(strictCompare(entrance,pads,ram,fixture.level).first,null);
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const names:Button[]=['a','b','select','start','up','down','left','right'];
 for(let f=0;f<pads.length;f++){
  sim.step(names.filter((_,bit)=>pads[f]&(1<<bit)),1);
  if(f<3144)continue;
  const row=ram.subarray(f*2048,(f+1)*2048),shell=sim.enemies.find((e:Enemy)=>e.active&&!e.slotFreed&&e.enemySlot===2);
  assert.ok(shell);assert.equal(shell.shellChain??0,row[0x127],`ShellChainCounter slot2 at ${f}`);
  assert.equal(sim.score,Array.from(row.subarray(0x7dd,0x7e3)).reduce((n,d)=>n*10+d,0)*10,`score at ${f}`);
 }
 assert.equal(sim.score,22300);
});
