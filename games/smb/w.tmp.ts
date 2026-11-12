import {Simulation} from './src/simulation.js';
import {observedLevels} from './src/levels.js';
const sim:any=new Simulation(observedLevels());sim.reset(true);sim.step([],1);sim.step(['right','b'],9);
for(let i=0;i<55;i++){sim.step(['left','b'],1);const a=sim.playerAnim;console.log(sim.frame,'x',sim.player.x,'vx',sim.player.vx.toFixed(3),'g',sim.player.grounded,JSON.stringify(sim.locomotionPose),'ctrl',a.ctrl,'tmr',a.timer,'set',a.timerSet,'mot',sim.motor.speed,sim.motor.absolute);}
