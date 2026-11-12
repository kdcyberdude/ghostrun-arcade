import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 7-2 contains and collects all three observed underwater coins',()=>{
 for(const col of [101,102,103]){
  const level=structuredClone(observedLevels().find(l=>l.id==='7-2')!);
  const area=level.areas.find(a=>a.id==='area-4')!;
  assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===11),[[col,11,195]]);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-4',[col*16-2,192],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
 }
});
