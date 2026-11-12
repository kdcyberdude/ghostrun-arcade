import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';
import {initializeEntrance} from '../tools/harness/native-entrance.mjs';
import fixture from '../evidence/native-v2-camera-openings.json';

// Native ScrollHandler: scroll = attempted pixel move (before wall ejection, plus platform carry), none below screen x 80 or while the side-collision
// timer runs, one pixel less below screen x 112. Native camera ($071A/$071C) per frame of the v2 model runs, up to each level's next x divergence.
const nesButtons:Button[]=['a','b','select','start','up','down','left','right'];
for(const run of fixture.levels)test(`${run.level} v2 replay keeps the native camera for ${run.camera.length} frames`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,run.entrance);sim.step([],0);sim.inputs=[];
 run.pads.forEach((pad,f)=>{sim.step(nesButtons.filter((_,b)=>pad&(1<<b)),1);
  if(run.camera[f]>=0&&sim.phase==='play'&&sim.area.id===sim.level.main)assert.equal(sim.camera,run.camera[f],`${run.level} row ${f}`);});
});
