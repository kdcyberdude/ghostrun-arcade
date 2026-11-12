import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 7-1 has a Hammer Bro on each observed ledge',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='7-1')!);
 const area=level.areas.find(a=>a.id==='main')!;
 const bros=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x<1500);
 assert.deepEqual(bros.map(e=>e.y).sort((a,b)=>a-b),[80,144]);
 const sim=new Simulation([level]);sim.reset(true);// Native roster (data/native-hammer-bros.json): the second Bro of the pair appears at x 1376 on the 144 ledge (the screenshot-era candidate grid said 1344 / 144).
 sim.loadArea('main',[1368,144],1248);sim.step([],1);
 assert.equal(sim.phase,'dying');
});
