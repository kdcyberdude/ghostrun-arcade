import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native v2: 1-1 touch2181 -> award2243, $041c=0 before the grab; 3-3 touch1047 -> award1108,
// $041c=158 before the grab (the earlier mushroom erased at507 leaves that byte unchanged).
for(const [fraction,awardAfter] of [[0,62],[158,61],[1,62]])test(`flag award preserves slot-five fraction ${fraction} (${awardAfter} rows)`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.phase='flag';sim.phaseFrame=0;
 sim.player.x=sim.area.exit.x-15;sim.player.y=185;sim.player.vx=sim.player.vy=0;sim.player.grounded=false;
 sim.nativePowerSlot.fraction=fraction;sim.flagBonus=100;sim.beginFlag();
 assert.equal(sim.flagTop,fraction?50:49);
 let paid=-1;
 for(let frame=1;frame<=63;frame++){sim.step([],1);if(sim.score>0){paid=frame;break;}}
 assert.equal(paid,awardAfter);
});
