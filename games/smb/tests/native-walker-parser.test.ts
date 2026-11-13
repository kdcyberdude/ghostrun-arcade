import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';import fixture from './fixtures/native-walker-parser.json';
const keys:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of fixture.runs)test(`native mixed walker cursor and actors ${run.sha256.slice(0,8)} entry${run.entry}`,()=>{
 const initial=Buffer.from(run.initial,'base64');assert.equal(createHash('sha256').update(initial).digest('hex'),run.initialRamSha256);const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,decodeEntrance(initial,run.receipt));sim.step([],0);sim.inputs=[];
 for(let frame=0;frame<run.pads.length;frame++){sim.step(keys.filter((_,i)=>run.pads[frame]&(1<<i)),1);const row=run.rows[frame],stream=sim.placedStream;assert.ok(stream,'physical mixed stream');assert.deepEqual([stream.offset,stream.page,Number(stream.selected)],row.cursor,`cursor ${frame}`);
  const expected=row.walkers;const actual=sim.enemies.filter(e=>e.active&&e.dead<90&&['goomba','koopa','redKoopa','beetle','paratroopa'].includes(e.kind)).sort((a,b)=>a.enemySlot-b.enemySlot);
  assert.equal(actual.length,expected.length,`walker count ${frame}`);for(let n=0;n<expected.length;n++){const e=actual[n],r=expected[n];assert.deepEqual([e.enemySlot,e.nativeId,e.x,e.y-24],[r.slot,r.id,r.x,r.y],`native walker ${frame} slot${r.slot}`);}
 }
});
