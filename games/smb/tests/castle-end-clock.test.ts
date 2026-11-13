import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
test('castle messages advance through native counters and six shared interval ticks',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=3;sim.loadArea(sim.level.main);sim.phase='castle';sim.castleStage='message';sim.intervalControl=0;
 let messages=0;while(!sim.nativeVictory||sim.nativeVictory.task===3){sim.step([],1);messages++;assert.ok(messages<300);}
 assert.equal(messages,257);assert.equal(sim.nativeVictory.primary,4);assert.equal(sim.nativeVictory.endTimer,6);
 let ticks=0;while(sim.phase==='castle'){const tick=sim.intervalControl===0;sim.step([],1);if(tick)ticks++;assert.ok(ticks<=6);}
 assert.equal(ticks,6);assert.equal(sim.level.id,'2-1');
});
