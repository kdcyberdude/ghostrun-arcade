import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 8-3 has a Hammer Bro on each observed first-encounter ledge',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 const bros=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x<1200);
 assert.deepEqual(bros.map(e=>e.y).sort((a,b)=>a-b),[80,144]);
 const sim=new Simulation([level]);sim.reset(true);// Native roster: the Bro of the pair that stands on the 144 ledge appears at x 1040 (the screenshot-era candidate grid said 1056 / 80, which is only its jump apex).
 sim.loadArea('main',[1032,144],872);sim.step([],1);
 assert.equal(sim.phase,'dying');
});
