import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 3-3 left canopy end supports an ordinary landing',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1728,100],1634);
 sim.player.vy=2;sim.player.grounded=false;sim.step([],8);
 assert.equal(sim.player.y,112);assert.equal(sim.player.grounded,true);
});
