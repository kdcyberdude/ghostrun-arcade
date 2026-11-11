import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 5-3 upper coin pairs contain all four source-observed cells',()=>{
 const area=observedLevels().find(l=>l.id==='5-3')!.areas.find(a=>a.id==='main')!;
 for(const col of [93,94,97,98])assert.deepEqual(area.tiles.filter(t=>t[0]===col&&t[1]===4),[[col,4,194]]);
});

test('the restored World 5-3 upper coin is collected normally',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);const area=level.areas.find(a=>a.id==='main')!;
 area.tiles=area.tiles.filter(([x,y])=>y!==4||x!==93);
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[94*16-2,80],1300);sim.step([],1);
 assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
 assert.equal(sim.tiles.has('94,4'),false);
});
