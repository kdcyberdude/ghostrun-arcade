import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Simulation,multiCoinExpiry} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function fixture(big=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-2')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1232,208],1189);
 if(big)sim.player.size=1;
 return sim;
}
const jump=(sim:Simulation)=>{sim.step(['a'],16);sim.step([],24);};

test('bounded coin clock predicts all four untouched native heldouts under the declared event registration',()=>{
 for(const pair of [1,2]){
  const report=JSON.parse(fs.readFileSync(`evidence/coin-clock-heldout-pair-${pair}-results.json`,'utf8'));
  assert.equal(report.passed,true);assert.equal(report.noRetuning,true);
  for(const row of report.results){
   // These are inferred collision-to-image offsets, not measured event epochs.
   const first=row.firstSample-report.representative.firstOffset;
   const hit=row.hitSample-report.representative.repeatOffset;
   assert.equal(hit>=multiCoinExpiry(first),row.used,row.id);
  }
 }
});

test('ordinary repeated jumps award coins, keep the brick until a late hit, then stop at used',()=>{
 const sim=fixture();jump(sim);assert.equal(sim.coins,1);assert.equal(sim.score,200);
 assert.equal(sim.tiles.get('77,9'),81);
 jump(sim);assert.equal(sim.coins,2);assert.equal(sim.score,400);
 sim.step([],240);assert.equal(sim.tiles.get('77,9'),81,'expiry must not passively change artwork');
 jump(sim);assert.equal(sim.coins,3);assert.equal(sim.score,600);assert.equal(sim.tiles.get('77,9'),196);
 for(let n=0;n<3;n++)jump(sim);
 assert.equal(sim.coins,3);assert.equal(sim.score,600);assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

test('large-player content transfer awards a coin instead of shattering the multi-coin brick',()=>{
 const sim=fixture(true);jump(sim);
 assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.tiles.get('77,9'),81);
 assert.ok(sim.items.every(item=>item.kind!=='debris'));
});
