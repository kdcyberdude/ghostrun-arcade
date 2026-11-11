import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

const level=()=>structuredClone(observedLevels().find(l=>l.id==='8-2')!);

test('8-2 late Paratroopa has no inferred duplicate ordinary Koopa',()=>{
 const area=level().areas.find(a=>a.id==='main')!;
 assert.equal(area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===2224&&e.y===208).length,1);
 assert.equal(area.enemies.filter(e=>e.kind==='koopa'&&e.x===2208&&e.y===192).length,0);
});

test('8-2 late Paratroopa becomes a wingless Koopa on an ordinary stomp',()=>{
 const sim=new Simulation([level()]);sim.reset(true);sim.loadArea('main',[2216,202],2100);
 sim.player.vy=2;sim.broClock=1;sim.step([],1);
 assert.equal(sim.enemies.find(e=>e.originX===2224&&e.originY===208)?.kind,'koopa');
 assert.equal(sim.phase,'play');
});
