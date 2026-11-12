import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 6-1 contains the two source-observed gap coins',()=>{
 const area=observedLevels().find(l=>l.id==='6-1')!.areas.find(a=>a.id==='main')!;
 for(const col of [105,106])assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===8),[[col,8,194]]);
});

test('each restored World 6-1 gap coin is collected normally',()=>{
 for(const col of [105,106]){
  const level=structuredClone(observedLevels().find(l=>l.id==='6-1')!);
  const area=level.areas.find(a=>a.id==='main')!;
  area.tiles=area.tiles.filter(([x,y])=>y!==8||x===col||x<105||x>107);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[col*16-2,144],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
  assert.equal(sim.tiles.has(`${col},8`),false);
 }
});
