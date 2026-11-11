import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 1-2 ledge contains and collects the four observed coins',()=>{
 for(const col of [58,59,60,61]){
  const level=structuredClone(observedLevels().find(l=>l.id==='1-2')!);
  const area=level.areas.find(a=>a.id==='area-2')!;
  assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===8),[[col,8,194]]);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-2',[col*16-2,144],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
 }
});

test('World 1-2 upper structure contains and collects the two restored coins',()=>{
 for(const col of [43,44]){
  const level=structuredClone(observedLevels().find(l=>l.id==='1-2')!);
  const area=level.areas.find(a=>a.id==='area-2')!;
  assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===5),[[col,5,194]]);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-2',[col*16-2,96],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
 }
});
