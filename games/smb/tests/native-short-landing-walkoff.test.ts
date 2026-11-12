import {test} from 'node:test';
import assert from 'node:assert/strict';
import cases from './fixtures/native-short-landing-walkoff.json';
import {NativeMotor} from '../src/native-motor.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
const keys=['up','down','left','right','a','b','start','select'] as const;
const buttons=(pad:number)=>keys.filter((_,i)=>pad&(1<<i));

for(const c of cases){
 test(`${c.level} mood${c.mood} native class after two ground motor calls`,()=>{
  const motor=new NativeMotor();motor.reset(c.rows[0].vx,1);motor.moving=1;
  const actual=c.rows.slice(1,6).map((_,i)=>i<2?motor.groundPress(1,c.running):motor.air(1,c.running));
  assert.deepEqual(actual,c.rows.slice(1,6).map(r=>r.vx));
 });
 test(`${c.level} mood${c.mood} short landing walk-off keeps exact native motion`,()=>{
  const level=structuredClone(observedLevels().find(l=>l.id===c.level)!);
  const sim:any=new Simulation([level]);sim.reset(true);const a=c.rows[0];
  sim.loadArea('main',[a.x+a.subx/256,a.y+32],0);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.enemies=[];
  Object.assign(sim.player,{vx:a.vx/4096,vy:0,grounded:true,facing:1});
  sim.motor.reset(a.vx,1);sim.motor.moving=1;sim.motor.runGrace=c.running?9:0;
  sim.walkGroundFrames=1;sim.fallGravity=a.fallForce/256;sim.landingFraction=a.suby/256;
  sim.inputs=[new Set(buttons(c.rows[1].pad)),new Set(buttons(c.rows[2].pad))];
  for(let i=1;i<c.rows.length;i++){
   sim.step(buttons(c.rows[Math.min(i+2,c.rows.length-1)].pad),1);const n=c.rows[i];
   assert.equal(Math.round(sim.player.vx*4096),n.vx,`speed row${n.i}`);
   assert.equal(sim.player.x,n.x+n.subx/256,`x row${n.i}`);
   assert.equal(sim.player.y+(sim.player.grounded?sim.landingFraction:0),n.y+32+n.suby/256,`y row${n.i}`);
  }
 });
}
