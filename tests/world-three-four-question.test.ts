import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 3-4 middle question block yields the observed mushroom',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-4')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[688,208],576);
 sim.step(['a'],20);
 assert.equal(sim.tiles.get('43,9'),196);
 assert.equal(sim.items[0]?.kind,'mushroom');assert.equal(sim.coins,0);
});
