import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from './fixtures/native-used-block-head.json';

test('1-4 evaluation: small Mario hits a used block as solid and keeps post-gravity fraction',()=>{
 const initial=Buffer.from(fixture.initial,'base64'),pads=Buffer.from(fixture.pads,'base64');
 assert.equal(createHash('sha256').update(initial).digest('hex'),fixture.reference.initialSha256);
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 initializeEntrance(sim,decodeEntrance(initial,{level:fixture.level}));sim.step([],0);sim.inputs=[];
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 const expected=new Map(fixture.rows.map(r=>[r.frame,r]));
 for(let f=0;f<pads.length;f++){
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);
  const row=expected.get(f);if(!row)continue;
  assert.deepEqual({x:sim.player.x,y:sim.player.y,vy:sim.player.vy},{x:row.x,y:row.y,vy:row.vy},`native source frame ${fixture.sourceFrameOffset+f}`);
 }
});
