import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 6-1 bottom stair blocks a grounded rightward walk',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='6-1')!);
 const area=level.areas.find(a=>a.id==='main')!;area.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1080,208],973);
 sim.step(['right'],40);
 assert.equal(sim.phase,'play');assert.ok(Math.abs(sim.player.x-1090)<=2);
});
