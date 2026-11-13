import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';import type {Button} from '../src/types.js';import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/native-left-wall-camera.json',import.meta.url),'utf8')),buttons:Button[]=['a','b','select','start','up','down','left','right'];
test('native left-wall impulse refreshes SideCollisionTimer before the subsequent rightward scroll',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,fixture.entrance);sim.inputs=[];
 for(let frame=0;frame<fixture.pads.length;frame++){
  sim.step(buttons.filter((_,bit)=>fixture.pads[frame]&(1<<bit)),1);const row=fixture.rows.find((r:any)=>r.frame===frame);if(!row)continue;
  assert.deepEqual({x:Math.floor(sim.player.x),camera:sim.camera,timer:sim.sideCollisionTimer},{x:row.x,camera:row.camera,timer:row.timer},`native frame ${frame}`);
 }
});
