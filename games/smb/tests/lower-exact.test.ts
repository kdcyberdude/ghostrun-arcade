import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the recovered4-3 mushroom top supports a landing while its observed trunk remains decorative',()=>{
 for(const [col,expected]of [[45,'support'],[33,'trunk']]as const){
  const level=structuredClone(observedLevels().find(l=>l.id==='4-3')!),main=level.areas.find(a=>a.id===level.main)!;
  // Isolated falling placement in the real map, with ordinary neutral updates.
  main.spawn=[col*16,128];main.camera=col*16-112;main.enemies=[];
  const sim=new Simulation([level]);sim.reset(true);sim.step([],20);
  if(expected==='support'){assert.equal(sim.player.y,144);assert.equal(sim.player.grounded,true);}
  else assert.ok(sim.player.y>144,'Decorative trunk pixels must not acquire solid collision');
  assert.equal(sim.lives,3);
 }
});

test('5-4 recovered masonry and semantic firebar base, and6-2 ground support falls at their observed tops',()=>{
 for(const [id,col]of [['5-4',37],['5-4',39],['5-4',43],['5-4',45],['5-4',47],['5-4',55],['5-4',67],['6-2',50]]as const){
  const level=structuredClone(observedLevels().find(l=>l.id===id)!),main=level.areas.find(a=>a.id===level.main)!;
  main.spawn=[col*16,192];main.camera=col*16-112;main.enemies=[];main.firebars=[];
  const sim=new Simulation([level]);sim.reset(true);sim.step([],20);
  assert.equal(sim.player.y,208,`${id} must land on the recovered row13`);
  assert.equal(sim.player.grounded,true);assert.equal(sim.lives,3);
 }
});

test('5-4 floor ends at the fully witnessed black column84 rather than acquiring blank-cell collision',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-4')!),main=level.areas.find(a=>a.id===level.main)!;
 main.spawn=[84*16+4,192];main.camera=84*16-112;main.enemies=[];main.firebars=[];
 const sim=new Simulation([level]);sim.reset(true);sim.step([],20);
 assert.equal(sim.player.grounded,false);assert.ok(sim.player.y>224);
 assert.ok(!main.tiles.some(([col,row])=>col===84&&(row===13||row===14)),'Known blank is background, not a solid metatile');
});
