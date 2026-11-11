import test from 'node:test';
import assert from 'node:assert/strict';
import excerpts from '../data/piranha-column-native-excerpts.json';
import {PiranhaColumns} from '../src/piranha-columns.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

for(const run of excerpts.runs)test(`native column-builder cadence and plant births, 5-1 mood${run.mood}`,()=>{
 const clock=new PiranhaColumns(0),built=new Map<number,number>();
 for(const [i,[camera,tasks]] of run.rows.entries()){
  const previous=clock.through;clock.step(camera);
  assert.equal(clock.remaining,tasks,`native row${i}`);
  if(clock.through!==previous)built.set(clock.through,i);
 }
 for(const [frame,x] of run.births)assert.equal(built.get(x),frame,`native plant${x}`);
});

test('production5-1 reserves the native824 plant on row243 rather than four rows late',()=>{
 const run=excerpts.productionApproach,keys=['up','down','left','right','a','b','start','select'];
 const buttons=(pad:number)=>keys.filter((_,j)=>pad&(1<<j));
 const sim:any=new Simulation([structuredClone(observedLevels().find(l=>l.id==='5-1')!)]);sim.reset(true);
 sim.inputs=[new Set(buttons(run.pads[run.start])),new Set(buttons(run.pads[run.start+1]))];
 sim.previous=new Set(buttons(run.pads[run.start-1]));
 const plant=sim.enemies.find((e:any)=>e.kind==='piranha'&&e.x===run.plantX);let birth:number|undefined;
 for(let frame=run.start;frame<=run.birthFrame;frame++){
  sim.step(buttons(run.pads[frame+2]),1);
  assert.equal(sim.phase,'play');
  if(birth===undefined&&plant.slotBorn!==undefined)birth=frame;
 }
 assert.equal(birth,run.birthFrame);assert.equal(plant.slotHeld,true);
});
