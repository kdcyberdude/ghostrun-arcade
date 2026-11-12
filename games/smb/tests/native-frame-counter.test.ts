import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

/** Native frame counter (RAM 0x09, evidence/stomp2-findings-20261111.md): restarted by each area load, runs through the lives screen. The remake copy is `broClock`; a remake step shows the
 * native row two earlier (input queue), so values here are native minus 2 minus the step. Native: level start 164 on the first control row, title start 153, death 160 after row 642. */
test('the counter per entry: level start, title intro and a death intro reach the native parity',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='1-1')!);
 const sim=new Simulation([level]);sim.reset(true);
 sim.loadArea('main',[40,176],0);sim.step([],1);assert.equal(sim.broClock,163);
 const title=new Simulation([structuredClone(level)]);title.reset(false);(title as any).lifeIntro={fromDeath:false};title.phase='intro';title.phaseFrame=155;(title as any).startPlayAfterIntro();assert.equal(title.broClock,151);
 (title as any).lifeIntro={fromDeath:true};title.phaseFrame=163;(title as any).startPlayAfterIntro();assert.equal(title.broClock,158);
});
