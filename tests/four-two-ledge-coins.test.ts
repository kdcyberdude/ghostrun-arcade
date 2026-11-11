import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 4-2 ledge coin row has the ten observed cells',()=>{
 // Columns 162-171: the screenshot-era 163-172 moved one tile left with the ledge (data/native-geometry-corrections.json: native rows end the ledge at x 2752).
 const area=observedLevels().find(l=>l.id==='4-2')!.areas.find(a=>a.id==='area-3')!;
 for(let col=162;col<=171;col++)assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===8),[[col,8,194]]);
});

test('each World 4-2 ledge coin is collected normally',()=>{
 for(let col=162;col<=171;col++){
  const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);
  const area=level.areas.find(a=>a.id==='area-3')!;
  area.tiles=area.tiles.filter(([x,y])=>y!==8||x===col||x<162||x>171);
  const sim=new Simulation([level]);sim.reset(true);sim.loadArea('area-3',[col*16-2,144],col*16-200);sim.step([],1);
  assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
  assert.equal(sim.tiles.has(`${col},8`),false);
 }
});
