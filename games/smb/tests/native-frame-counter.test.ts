import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

/** Legacy intro seeds before enemy priming. broClock retains the old queued-row
 * offset here; random.frame is RAM $09. Actual source-owned POWERON clocks are
 * covered by native-startup-runtime.test.ts and native-gameplay-continuation.test.ts. */
test('legacy entry clock seeds are independent of the first enemy pass',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);
 sim.loadArea('main',[40,176],0);sim.step([],1);assert.equal(sim.broClock,163);
 const title=new Simulation([structuredClone(level)]);title.reset(false);(title as any).primeNativeReadyEnemies=()=>{};(title as any).lifeIntro={fromDeath:false};title.phase='intro';title.phaseFrame=155;(title as any).startPlayAfterIntro();assert.equal(title.broClock,151);assert.equal(title.random.frame,153);
 (title as any).lifeIntro={fromDeath:true};title.phaseFrame=163;(title as any).startPlayAfterIntro();assert.equal(title.broClock,158);assert.equal(title.random.frame,160);
});
