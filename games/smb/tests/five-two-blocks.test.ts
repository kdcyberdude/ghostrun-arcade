import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

for(const [col,row,feet,kind]of [[34,5,144,'mushroom'],[125,5,144,'star'],[168,9,208,'mushroom']]as const){
 test(`5-2 observed brick${col}/${row} releases its actual ${kind} under an ordinary head hit`,()=>{
  const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!),main=level.areas.find(a=>a.id===level.main)!;
  // Diagnostic placement on the actual lower brick/ground, not a campaign route.
  main.spawn=[col*16,feet];main.camera=col*16-112;main.enemies=[];
  const sim=new Simulation([level]);sim.reset(true);assert.equal(sim.player.grounded,true);
  sim.step(['a'],24);assert.equal(sim.tiles.get(`${col},${row}`),196);
  assert.ok(sim.items.some(i=>i.kind===kind));assert.equal(sim.lives,3);
 });
}

test('the observed5-2 upper ordinary brick bumps without releasing an unobserved item',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!),main=level.areas.find(a=>a.id===level.main)!;
 // Declared rising head-contact fixture, independent of route timing.
 main.spawn=[87*16,112];main.spawnVelocity=[0,-3];main.camera=87*16-112;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);sim.step([],4);
 assert.ok(sim.bump.has('87,5'));assert.equal(sim.tiles.get('87,5'),81);
 assert.equal(sim.items.length,0);assert.equal(sim.lives,3);
});

for(const col of [78,79,80,81,82]){
 test(`5-2 question block${col}/9 releases its observed coin only once`,()=>{
  const level=structuredClone(observedLevels().find(l=>l.id==='5-2')!),main=level.areas.find(a=>a.id===level.main)!;
  // Grounded diagnostic placement; both head hits use ordinary jump controls.
  main.spawn=[col*16,208];main.camera=col*16-112;main.enemies=[];
  const sim=new Simulation([level]);sim.reset(true);
  assert.equal(sim.tiles.get(`${col},9`),192);
  sim.step(['a'],24);
  assert.equal(sim.tiles.get(`${col},9`),196);assert.equal(sim.coins,1);
  assert.equal(sim.items.some(item=>['mushroom','flower','star'].includes(item.kind)),false);
  sim.step([],40);sim.step(['a'],24);
  assert.equal(sim.coins,1);assert.equal(sim.lives,3);
 });
}
