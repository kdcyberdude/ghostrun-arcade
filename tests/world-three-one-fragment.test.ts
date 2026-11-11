import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('3-1 elevated question awards one coin per area visit',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1805,144],1693);
 const piece=()=>sim.freeTiles.find(t=>t.x===1805&&t.y===80)!;
 sim.step(['a'],20);
 assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(piece().id,196);
 sim.step([],60);assert.equal(sim.player.grounded,true);
 sim.step(['a'],20);assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(piece().id,196);
 sim.step([],60);sim.loadArea('main',[1805,144],1693);
 assert.equal(piece().id,192);assert.equal(sim.coins,1);
 sim.step(['a'],20);assert.equal(sim.coins,2);assert.equal(sim.score,400);assert.equal(piece().id,196);
});
