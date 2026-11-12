import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

function reach(stage:'tally'|'fireworks'){
 const tiles:Tile[]=[];for(let x=0;x<40;x++)tiles.push([x,13,84]);tiles.push([6,12,97],[9,8,69],[10,8,69],[11,8,69]);
 const level:Level={id:'1-1',time:307,main:'main',evidence:'Isolated flag pause fixture',areas:[{id:'main',width:640,palette:0,theme:'ground',tiles,enemies:[],spawn:[80,208],exit:{x:104,doorX:160,kind:'flag'},evidence:'Fixture'}]};
 const next:Level={...level,id:'1-2',time:400,areas:[{...level.areas[0],spawn:[40,208],exit:undefined}]};
 const sim=new Simulation([level,next]);sim.reset(true);
 for(let i=0;i<1200;i++){
  sim.step(i<40?['right','a','b']:[],1);
  if(sim.phase==='flag'&&sim.flagInside&&(stage==='tally'?sim.time>0:sim.flagFireworks.length>0))return sim;
 }
 throw Error(`Failed to reach ${stage}`);
}
for(const stage of ['tally','fireworks'] as const)for(const separation of [44,45])test(`Start during ${stage} freezes the flag sequence and uses the ${separation}-slice source boundary`,()=>{
 const sim=reach(stage);sim.events=[];
 const before={frame:sim.frame,phaseFrame:sim.phaseFrame,time:sim.time,score:sim.score,fireworks:JSON.stringify(sim.flagFireworks)};
 sim.step(['start']);assert.equal(sim.paused,true);assert.deepEqual(sim.events,['pause']);sim.events=[];
 sim.step([],separation-1);
 assert.deepEqual({frame:sim.frame,phaseFrame:sim.phaseFrame,time:sim.time,score:sim.score,fireworks:JSON.stringify(sim.flagFireworks)},before);
 sim.step(['start']);assert.equal(sim.paused,separation===44);
 if(separation===45){assert.equal(sim.frame,before.frame+1);assert.ok(sim.events.includes('unpause'));}
 else{assert.equal(sim.frame,before.frame);assert.deepEqual(sim.events,[]);}
});
