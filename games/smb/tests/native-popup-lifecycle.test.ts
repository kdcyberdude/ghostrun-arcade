import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import fixture from './fixtures/native-popup-lifecycle.json';

test('native floatey numbers start with48 visible frames and follow the source timer/Y floor',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);assert.ok(fixture.births.length>30);assert.ok(fixture.ticks.length>100);
 for(const row of fixture.births){sim.popups=[];sim.awardPopup(100,40,176);assert.equal(sim.popups[0].life-1,row.timer,`${row.level} native frame ${row.frame}`);}
 for(const row of fixture.ticks){
  const popup={value:100,x:40,y:row.y,life:48,age:47-row.timer};sim.popups=[popup];sim.advancePopups();
  assert.equal(sim.popups.length,Number(row.visible),`${row.level} native frame ${row.frame}: timer`);
  if(row.visible)assert.equal(popup.y,row.nextY,`${row.level} native frame ${row.frame}: native Y motion`);
 }
});

test('native enemy erasure clears its popup while leaving deferred score independent',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);assert.ok(fixture.erases.length>10);
 for(const row of fixture.erases){
  const victim={dead:1,enemySlot:row.slot};sim.popups=[];sim.awardPopup(100,40,176,victim);const score=sim.awardedScore;
  sim.eraseEnemy(victim);assert.equal(sim.popups.length,0,`${row.level} native frame ${row.frame}: native timer residue ${row.timer}`);assert.equal(sim.awardedScore,score);
 }
});

test('another award in one native slot replaces that slot label and preserves other slots',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.awardPopup(100,40,176,{dead:0,enemySlot:0});sim.awardPopup(200,60,176,{dead:0,enemySlot:1});
 sim.awardPopup(400,70,176,{dead:0,enemySlot:0});assert.deepEqual(sim.popups.map((p:any)=>p.value),[200,400]);
});
