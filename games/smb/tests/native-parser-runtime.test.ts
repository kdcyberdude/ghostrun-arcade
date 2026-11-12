import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {decodeEntrance,initializeEntrance} from '../tools/harness/native-entrance.mjs';
import clockEvidence from '../data/native-parser-clock.json';

function replay(level:string,through:number,inspect:(sim:any,frame:number)=>void){
 const run=JSON.parse(fs.readFileSync(new URL(`../evidence/native-runs/${level}.v2.json`,import.meta.url),'utf8'));
 const unpack=(s:string)=>new Uint8Array(gunzipSync(Buffer.from(s,'base64')));
 const initial=unpack(run.initialRam),pads=unpack(run.pads),buttons:Button[]=['a','b','select','start','up','down','left','right'];
 const sim:any=new Simulation(observedLevels());sim.reset(true);
 const entrance=decodeEntrance(initial,{level});initializeEntrance(sim,entrance);
 assert.deepEqual([sim.parserClock.task,sim.parserClock.scroll],[initial[0x71f],initial[0x73d]]);
 sim.step([],0);sim.inputs=[];
 for(let frame=0;frame<=through;frame++){sim.step(buttons.filter((_,b)=>pads[frame]&(1<<b)),1);inspect(sim,frame);}
}

test('runtime coin buffer2 write holds the 4-3 parser clock and permits the native red Koopa first movement',()=>{
 replay('4-3',205,(sim,frame)=>{
  const event=clockEvidence.windows.find(e=>e.frame===frame);if(!event)return;
  assert.deepEqual([sim.parserClock.task,sim.parserClock.scroll],event.after,`row${frame}`);
  assert.equal(sim.parserVramBusy,event.input.busy,`row${frame}`);
  if(frame===204){const e=sim.enemies.find((e:any)=>e.kind==='redKoopa'&&e.active&&e.enemySlot===3);assert.ok(e);assert.equal(e.x,623.5);}
 });
});

test('native enemy-loader reservation precedes the parser clock advance and pipe-column slot allocation',()=>{
 replay('6-2',293,(sim,frame)=>{
  if(frame!==293)return;
  const para=sim.enemies.find((e:any)=>e.kind==='paratroopa'&&e.originX===688);
  const plant=sim.enemies.find((e:any)=>e.kind==='piranha'&&e.originX===744);
  assert.ok(para.active);assert.equal(para.enemySlot,0);assert.equal(para.x,687.5);
  assert.equal(plant.active,false);assert.equal(plant.slotLost,true);
 });
});
