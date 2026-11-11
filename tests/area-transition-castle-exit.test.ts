import {test} from 'node:test';
import assert from 'node:assert/strict';
import alignment from '../data/castle-exit-native-alignment.json';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Level} from '../src/types.js';

// Native castle ends (data/castle-exit-native-alignment.json): the wall in front of the axe is where a running Mario stops (probe-measured),
// the axe tile is that wall column, and the cutscene ends at the native final x. 4-4 and 6-4 sit 32 and 16 px further right than first compiled.
const mainArea=(id:string)=>observedLevels().find(l=>l.id===id)!.areas.find(a=>a.id==='main')!;

test('castle axe tile, wall and cutscene stop sit at the native positions in 4-4 and 6-4',()=>{
 for(const native of alignment.native){
  const area=mainArea(native.level),exit=area.exit!;
  assert.equal(exit.x,native.wallLeftEdge+8,`${native.level} axe centre = wall column + 8`);
  assert.equal(exit.stopX,native.finalX,`${native.level} cutscene stop`);
  assert.equal(exit.retainerX,exit.x+184,`${native.level} retainer keeps the ordinary 184 px offset`);
  assert.equal(area.tiles.find(t=>t[0]===native.wallLeftEdge/16&&t[1]===8)?.[2],197,`${native.level} axe tile`);
  assert.equal(area.tiles.filter(t=>t[2]===137).length,13,`${native.level} bridge stays 13 tiles`);
 }
});

test('ordinary castles keep the native stop x measured for 1-4, 2-4, 3-4, 5-4 and 7-4',()=>{
 const native:[string,number][]=[['1-4',2432],['2-4',2429],['3-4',2430],['5-4',2432],['7-4',3454]];
 for(const [id,finalX] of native)assert.equal(mainArea(id).exit!.stopX,finalX,id);
});

test('a running Mario on the 4-4 and 6-4 bridge stops at the native wall position',()=>{
 for(const native of alignment.native){
  const level:Level=structuredClone(observedLevels().find(l=>l.id===native.level)!);
  const area=level.areas.find(a=>a.id==='main')!;
  area.spawn=[native.groundBlockedPlayerX-60,160];area.camera=area.spawn[0]-112;area.entryFall=undefined;area.spawnVelocity=[0,0];
  for(const enemy of area.enemies)enemy.x=99999;area.firebars=[];
  const sim=new Simulation([level]);sim.reset(true);sim.step(['right','b'],90);
  assert.equal(sim.phase,'play',`${native.level} no axe contact on the ground`);
  assert.ok(Math.abs(sim.player.x-native.groundBlockedPlayerX)<=2,`${native.level} blocked at ${sim.player.x.toFixed(1)}, native ${native.groundBlockedPlayerX}`);
 }
});
