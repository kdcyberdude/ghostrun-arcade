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

test('respawn InitializeArea holds the LFSR and clears FrameCounter for exactly one row (2-4 rows892-894)',()=>{
 const sim:any=new Simulation([observedLevels()[0]]);sim.reset(true);sim.die();sim.loseLife=true;sim.step([],1);
 sim.phaseFrame=2;sim.random.frame=42;sim.random.bytes=[212,77,229,126,180,73,33];
 sim.step([],1);assert.equal(sim.random.frame,0);assert.deepEqual(sim.random.bytes,[212,77,229,126,180,73,33]);
 sim.step([],1);assert.equal(sim.random.frame,1);assert.deepEqual(sim.random.bytes,[106,38,242,191,90,36,144]);
});

test('the first engine8 row already contains the in-range Podoboo initialized on engine7 (2-4 row1052)',()=>{
 const sim:any=new Simulation([observedLevels().find(l=>l.id==='2-4')!]);sim.reset(true);sim.die();sim.loseLife=true;sim.step([],1);
 sim.phaseFrame=162;sim.startPlayAfterIntro();
 const enemy=sim.enemies.find((e:any)=>e.kind==='podoboo'&&e.x===256);
 assert.equal(enemy.active,true);assert.deepEqual(enemy.pod,{y:514,speed:0,force:28,fraction:0,timer:1});
});
