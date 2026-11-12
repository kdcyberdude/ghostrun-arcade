import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 3-3 question block yields the observed mushroom',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[784,112],672);
 sim.step(['a'],20);
 assert.equal(sim.tiles.get('49,3'),196);
 assert.equal(sim.items[0]?.kind,'mushroom');
});
