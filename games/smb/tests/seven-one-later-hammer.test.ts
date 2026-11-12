import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 7-1 later encounter has observed upper and ground Hammer Bros',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='7-1')!);
 const area=level.areas.find(a=>a.id==='main')!;
 const bros=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x>=2100&&e.x<=2250);
 assert.deepEqual(bros.map(e=>e.y).sort((a,b)=>a-b),[144,208]);
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[2200,144],2040);sim.step([],1);
 assert.equal(sim.phase,'dying');
});
