import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function start(twoPlayer:boolean){
 const sim=new Simulation(observedLevels());sim.reset(false);
 if(twoPlayer){sim.step(['select'],1);sim.step([],10);}
 sim.step(['start'],1);sim.step([],220);return sim;
}
function nextGameover(sim:Simulation){
 for(let n=0;n<9000&&sim.phase!=='gameover';n++)sim.step(['right','b'],1,['right','b']);
 assert.equal(sim.phase,'gameover');sim.step([],4);
}
test('two-player exhausted Mario remains visible before Luigi takes over',()=>{
 const sim=start(true);nextGameover(sim);assert.equal(sim.currentPlayer,0);assert.equal(sim.lives,0);
 sim.step([],80,['start']);assert.equal(sim.phase,'gameover');assert.equal(sim.gameoverClosing,false);
 sim.step([],1);sim.step(['start'],1);sim.step([],4);assert.equal(sim.gameoverClosing,true);
 sim.step([],6);assert.equal(sim.phase,'intro');assert.equal(sim.currentPlayer,1);assert.ok(sim.lives>0);assert.equal(sim.phaseFrame,0);assert.equal(sim.introFromGameover,true);
 sim.step([],169);assert.equal(sim.phase,'play');assert.equal(sim.introFromGameover,false);
});
test('single-player final game over returns automatically to the title',()=>{
 const sim=start(false);nextGameover(sim);assert.equal(sim.lives,0);sim.step([],414+26);assert.equal(sim.phase,'title');assert.equal(sim.twoPlayer,false);
});
test('two-player last loss returns to the title with two-player selected',()=>{
 const sim=start(true);nextGameover(sim);sim.step(['start'],1);sim.step([],12);assert.equal(sim.currentPlayer,1);
 nextGameover(sim);assert.equal(sim.currentPlayer,1);assert.equal(sim.lives,0);sim.step([],414+26);assert.equal(sim.phase,'title');assert.equal(sim.twoPlayer,true);
});
