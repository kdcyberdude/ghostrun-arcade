import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation,solid} from '../src/simulation.js';

// The 6-4 castle end sits one column further right than first compiled (native wall at 2256, cutscene stop x 2431; data/castle-exit-native-alignment.json):
// the chain that hangs beside the axe moved from column 139 to 140 together with the pedestal and the axe (exit x 2264).
test('World 6-4 has the observed non-solid castle chain',()=>{
 const area=observedLevels().find(l=>l.id==='6-4')!.areas.find(a=>a.id==='main')!;
 assert.deepEqual(area.tiles.find(([x,y])=>x===140&&y===9),[140,9,12]);
 assert.equal(solid(12),false);
});

test('World 6-4 chain disappears on the normal axe transition',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='6-4')!);
 const area=level.areas.find(a=>a.id==='main')!;
 if(!area.tiles.some(([x,y])=>x===140&&y===9))area.tiles.push([140,9,12]);
 area.enemies=[];area.firebars=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[2252,140],2026);
 assert.equal(sim.tiles.get('140,9'),12);sim.step([],1);
 assert.equal(sim.phase,'castle');assert.equal(sim.tiles.has('140,9'),false);
});
