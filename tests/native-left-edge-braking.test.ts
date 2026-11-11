import {test} from 'node:test';
import assert from 'node:assert/strict';
import cases from './fixtures/native-left-edge-braking.json';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
const keys=['up','down','left','right','a','b','start','select'] as const;
const buttons=(pad:number)=>keys.filter((_,i)=>pad&(1<<i));

// Same native saved state, original pads and two independent rightward input branches.
for(const c of cases)test(`native left-edge braking ${c.name}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-4')!);
 const sim:any=new Simulation([level]);sim.reset(true);const a=c.seed;
 sim.loadArea('main',[a.x+a.subx/256,a.y+32+a.suby/256],0);sim.phase='play';sim.phaseFrame=0;sim.destination=undefined;sim.enemies=[];
 Object.assign(sim.player,{vx:a.vx/4096,vy:a.vy+a.vyFrac/256,grounded:false,facing:1});
 sim.motor.reset(a.vx,1);sim.motor.moving=-1;sim.motor.airRun=true;sim.motor.airDrop=false;
 sim.runJump=true;sim.jumpArc=true;sim.landJump='held';sim.fallGravity=a.fallForce/256;
 sim.previous=new Set(buttons(a.pad));sim.inputs=[new Set(buttons(c.rows[0].pad)),new Set(buttons(c.rows[1].pad))];
 for(let i=0;i<c.rows.length;i++){
  const n=c.rows[i];sim.step(buttons(c.rows[Math.min(i+2,c.rows.length-1)].pad),1);
  assert.equal(Math.round(sim.player.vx*4096),n.vx,`speed row${n.i}`);
  assert.equal(sim.player.x,n.x+n.subx/256,`x row${n.i}`);
  assert.equal(sim.player.y+(sim.player.grounded?sim.landingFraction:0),n.y+32+n.suby/256,`y row${n.i}`);
 }
});
