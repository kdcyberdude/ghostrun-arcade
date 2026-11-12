import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native v2 RAM: PlayerLoseLife engine6 row, ScreenTimer $07A0 load row, IntervalTimerControl $077F at that load, then engine7/8.
// 4-2: death889, timer898 (control0), engine7=1043. 1-4: death763, timer772 (control10), engine8=928.
// 7-4 timeout: death9823, first timer9831 (control10); 14 ticks cover TIME UP and the lives screen, engine8=10134.
for(const event of [
 {level:'4-2',load:9,control:0,ready:154,timeUp:false,falling:true},
 {level:'1-4',load:9,control:10,ready:165,timeUp:false,falling:false},
 {level:'7-4',load:8,control:10,ready:311,timeUp:true,falling:false},
])test(`native life-screen timer and entry boundary ${event.level}${event.timeUp?' timeout':''}`,()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id===event.level)!]);sim.reset(true);
 sim.timeUpDeath=event.timeUp;sim.die();sim.loseLife=true;sim.step([],1);
 assert.equal(sim.lifeIntro.set,event.load,'load row comes from native screen-task sequencing');
 assert.equal(Boolean(sim.entryFalling&&sim.area.entryFall?.native),event.falling);
 let control=event.control,firstReady=-1;
 for(let row=event.load;row<=event.ready+2;row++){
  sim.phaseFrame=row;sim.alignLifeClock(control);
  if(sim.lifeIntroDone()){firstReady=row;break;}
  control=control===0?20:control-1;
 }
 assert.equal(firstReady,event.ready);
});
