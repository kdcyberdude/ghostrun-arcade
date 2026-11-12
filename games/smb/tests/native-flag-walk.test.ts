import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,FLAG_COMPLETION} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import windows from '../data/native-flag-walk.json';

for(const w of windows.cases)test(`${w.level} native flag end-walk bytes, camera and first tally row`,()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.levelIndex=sim.levels.findIndex((l:{id:string})=>l.id===w.level);sim.loadArea(sim.level.areas.find((a:{exit?:{kind:string}})=>a.exit?.kind==='flag').id);
 const [x,y,speed,camera,time,score]=w.seed.row;
 // Bonus-room exits retain their native page number; the mapped area starts at page zero.
 const pageOffset=Math.round((x-(sim.area.exit.x-15))/256)*256;
 Object.assign(sim.player,{x:x-pageOffset,y:y+32+w.seed.fraction/256,vx:speed/4096,vy:0,grounded:false,size:w.seed.size});
 sim.motor.reset(speed,1,1,w.seed.absolute);sim.motor.runningSpeed=w.seed.running;sim.fallGravity=w.seed.gravity/256;sim.landingFraction=w.seed.fraction/256;
 sim.camera=camera-pageOffset;sim.time=time;sim.score=score;sim.phase='flag';sim.beginFlag();sim.phaseFrame=FLAG_COMPLETION.slideFrames;sim.flagAwardFrame=FLAG_COMPLETION.slideFrames;
 w.rows.forEach((expected,index)=>{
  sim.step([],1);
  assert.deepEqual([sim.player.x,Math.floor(sim.player.y)-32,Math.round(sim.player.vx*4096),Math.floor(sim.camera),sim.time,sim.score],expected.map((v:number,i:number)=>i===0||i===3?v-pageOffset:v),`${w.level} native row ${w.first+index+1}`);
 });
});
