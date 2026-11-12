import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native: the level load after the castle message comes on the free-running 21-row area clock, (load row - first play row) = 4 mod 21 in 6 of 7 route castles
// (1-4 .. 7-4 except 6-4's +1). Native control end -> load: 1-4 676, 2-4 686, 3-4 686, 5-4 692, 7-4 690 rows; the remake's flat 368-row message gave 689/682/686/695/685
// (13 rows late .. 5 rows early); the aligned end gives the native row within 1.
test('the castle message ends on the 21-row area clock, within 15 rows before the 368-row hold',()=>{
 const sim=new Simulation(observedLevels().filter(l=>['1-4','2-4'].includes(l.id)));sim.reset(true);sim.enemies=[];
 sim.phase='castle';sim.castleStage='message';sim.castleArrivalFrame=sim.phaseFrame;
 const start=sim.phaseFrame;let ended=-1,clock=-1;
 for(let k=0;k<500&&ended<0;k++){const before=sim.areaFrame;sim.step([],1);if(sim.phase!=='castle'||sim.levelIndex!==0){ended=sim.phaseFrame>0?k+1:k+1;clock=(before+1)%21;}}
 assert.ok(ended>=368-15&&ended<368-15+21+1,`message rows ${ended}`);
 assert.equal(clock,2);
 void start;
});
