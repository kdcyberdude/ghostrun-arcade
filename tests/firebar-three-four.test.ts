import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

const level=()=>structuredClone(observedLevels().find(l=>l.id==='3-4')!);
test('3-4 qualifies only the first observed bar and preserves its previous geometry and other bars',()=>{
 const bars=level().areas[0].firebars!;
 assert.deepEqual(bars.map(b=>[b.x,b.y,b.length,b.speed]),[[312,184,6,-0.02947],[392,184,6,-0.02947],[472,184,6,-0.03276],[872,184,6,0.03244],[1032,184,6,0.02914],[1288,184,6,-0.02913]]);
 assert.deepEqual(bars.filter(b=>b.motor).map(b=>[b.x,b.motor!.direction,b.motor!.initialUnits]),[[312,-1,768]]);
});

test('3-4 first bar freezes before camera53 then advances its shared CCW motor once per native frame',()=>{
 for(const wait of[0,150,278]){
  const data=level(),area=data.areas[0];area.spawn=[40,112];area.camera=52;area.enemies=[];
  const sim=new Simulation([data]);sim.reset(true);sim.step([],wait);
  assert.equal(sim.phase,'play');let bar=sim.area.firebars![0];assert.deepEqual(sim.firebarCenters(bar),[]);
  sim.loadArea('main',[164,160],52);sim.player.vx=1.5;sim.step([],1);bar=sim.area.firebars![0];
  assert.equal(sim.camera,53);const first=sim.firebarCenters(bar);assert.equal(first.length,6);
  const state=(sim as any).firebarMotors.get(bar).state;assert.equal(state.units,763);
  for(let query=0;query<8;query++)assert.deepEqual(sim.firebarCenters(bar),first);
  sim.step([],1);assert.equal(state.units,758);
 }
});
