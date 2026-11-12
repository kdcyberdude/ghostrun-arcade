import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the observed1-1 invisible block reveals a1up that ordinary movement can collect',()=>{
 const level=structuredClone(observedLevels().find(level=>level.id==='1-1')!),main=level.areas.find(area=>area.id==='main')!;
 // Diagnostic grounded placement on the real map, then ordinary inputs only.
 main.spawn=[1024,208];main.camera=912;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);
 assert.equal(sim.tiles.get('64,8'),96);
 sim.step(['a'],80);assert.equal(sim.tiles.get('64,8'),196);
 assert.ok(sim.items.some(item=>item.kind==='1up'));
 sim.step(['right','b'],40);assert.equal(sim.lives,4);assert.equal(sim.coins,0);assert.equal(sim.score,0);
});

test('the observed5-2 invisible foothold reveals one coin and remains a used block',()=>{
 const level=structuredClone(observedLevels().find(level=>level.id==='5-2')!),main=level.areas.find(area=>area.id===level.main)!;
 main.spawn=[1344,208];main.camera=1232;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);assert.equal(sim.tiles.get('84,9'),95);
 sim.step(['a'],24);assert.equal(sim.tiles.get('84,9'),196);assert.equal(sim.coins,1);
 sim.step([],40);sim.step(['a'],24);assert.equal(sim.coins,1);assert.equal(sim.lives,3);
});

for(const collect of [false,true])test(`the1-1 hidden1up stays consumed after death when ${collect?'collected':'missed'}`,()=>{
 const level=structuredClone(observedLevels().find(level=>level.id==='1-1')!),main=level.areas.find(area=>area.id==='main')!;
 main.spawn=[1024,208];main.camera=912;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);sim.step(['a'],80);
 assert.equal(sim.tiles.get('64,8'),196);
 if(collect)sim.step(['right','b'],40);else sim.step(['left','b'],40);
 assert.equal(sim.lives,collect?4:3);
 // Walk into the actual first pit, then allow ordinary death and intro to finish.
 sim.step(['right','b'],collect?80:160);sim.step([],456);
 assert.equal(sim.phase,'play');assert.equal(sim.lives,collect?3:2);
 assert.equal(sim.area.id,'main');assert.equal(sim.tiles.has('64,8'),false);
 sim.step(['a'],32);assert.ok(sim.player.y<150,'The former hidden cell no longer blocks the rising player');
 assert.equal(sim.items.some(item=>item.kind==='1up'),false);
});
