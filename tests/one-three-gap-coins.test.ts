import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 1-3 gap coins appear once and award ordinary coin score and sound',()=>{
 for(const col of [120,121]){
  const level=structuredClone(observedLevels().find(l=>l.id==='1-3')!);
  const area=level.areas.find(a=>a.id==='main')!;
  assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===5),[[col,5,194]]);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[col*16-2,96],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
  assert.equal(sim.tiles.has(`${col},5`),false);
 }
});
