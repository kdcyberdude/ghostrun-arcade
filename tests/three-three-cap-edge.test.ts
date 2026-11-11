import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the observed3-3 canopy right end supports a fresh jump while crossing from its middle',()=>{
 const make=(omit:boolean)=>{
  const level=structuredClone(observedLevels().find(l=>l.id==='3-3')!);
  const area=level.areas.find(a=>a.id==='main')!;
  area.enemies=[];area.generators=[];area.exit=undefined;
  if(omit)area.tiles=area.tiles.filter(([col,row])=>col!==110||row!==7);
  const s=new Simulation([level]);s.reset(true);s.loadArea('main',[1755,112],1643);
  // Declared moving-player component initialization, based on the failed replay.
  s.player.vx=2.5;s.player.grounded=true;
  return s;
 };
 const present=make(false),omitted=make(true);
 for(const s of [present,omitted])s.step(['right','a','b'],8);
 assert.ok(present.player.y<100);assert.ok(present.player.vy<0);
 assert.ok(omitted.player.y>112);assert.ok(omitted.player.vy>0);
 assert.equal(present.phase,'play');assert.equal(present.lives,3);
});
