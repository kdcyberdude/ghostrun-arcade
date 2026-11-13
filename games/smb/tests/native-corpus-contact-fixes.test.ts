import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-corpus-contact-fixes.json';

const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
for(const c of fixture.cases)test(`${c.level}: ${c.label} follows native evaluation RAM`,()=>{
 const initial=Buffer.from(c.initial,'base64'),pads=Buffer.from(c.pads,'base64');
 assert.equal(hash(initial),c.reference.initialSha256);assert.equal(hash(pads),c.reference.padsSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 initializeEntrance(sim,decodeEntrance(initial,{level:c.level},c.binding));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'],expected=new Map(c.rows.map(r=>[r.frame,r]));
 for(let f=0;f<pads.length;f++){
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);const row=expected.get(f);if(!row)continue;
  assert.deepEqual({x:sim.player.x,y:sim.player.y+(sim.player.grounded?sim.landingFraction:0),speed:Math.round(sim.player.vx*4096),vy:sim.player.vy,score:sim.score},
   {x:row.x+c.binding.offset,y:row.y,speed:row.speed,vy:row.vy,score:row.score},`source frame ${c.sourceFrameOffset+f}`);
  for(const n of row.enemies??[]){const e=sim.enemies.find(e=>e.active&&!e.slotFreed&&e.enemySlot===n.slot);assert.ok(e);assert.equal(e.x,n.x+c.binding.offset);assert.equal(Boolean(e.squashed),n.squashed);}
 }
});
