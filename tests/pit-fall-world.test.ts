import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

// Native rows (evidence/local/model-play: it000972 mood0 1-2 rows 4480..4743, live/worlds pit deaths): during a pit fall Mario's row count is
// ~260 with the whole level running. Across 119 non-inert enemy slots of 11 pit deaths, 118 moved while the fall lasted; in arc deaths the
// slots change on the first row only (65 slots, none later).
function walkToGoomba(){
 const sim=new Simulation(structuredClone(observedLevels()));
 for(let f=1;f<=3000;f++){
  sim.step(f===61?['start']:f>200?['right']:[],1);
  if(sim.phase==='play'&&sim.enemies.some(e=>e.active&&e.kind==='goomba'&&!e.dead&&e.x<sim.camera+240))return sim;
 }
 throw new Error('no goomba');
}
test('pit fall: enemies keep walking while Mario falls off screen',()=>{
 const sim=walkToGoomba();
 const g=sim.enemies.find(e=>e.active&&e.kind==='goomba'&&!e.dead)!;
 sim.player.y=300;sim.player.vy=4;sim.die(false,true);
 assert.equal(sim.phase,'dying');
 const x0=g.x;for(let i=0;i<40&&sim.phase==='dying';i++)sim.step([],1);
 assert.ok(Math.abs(g.x-x0)>=10,`goomba moved ${g.x-x0} px in 40 pit rows (native walker ~0.5 px/row)`);
});
test('arc death: enemies stay frozen',()=>{
 const sim=walkToGoomba();
 const g=sim.enemies.find(e=>e.active&&e.kind==='goomba'&&!e.dead)!;
 sim.die();sim.step([],1);const x0=g.x;for(let i=0;i<40;i++)sim.step([],1);
 assert.equal(g.x,x0);
});
test('pit fall: a dead Mario touches nothing, and thrown items keep flying',()=>{
 const sim=walkToGoomba();
 const g=sim.enemies.find(e=>e.active&&e.kind==='goomba'&&!e.dead)!;
 sim.player.y=260;sim.player.vy=4;sim.player.star=100;sim.die(false,true);
 Object.assign(g,{x:sim.player.x,y:sim.player.y,vy:0});
 const score=sim.score,hammer={kind:'hammer' as const,x:sim.camera+100,y:100,vx:1,vy:0,age:0,life:200};sim.items.push(hammer);
 sim.step([],1);
 assert.equal(g.dead,0);assert.equal(sim.score,score);assert.notEqual(hammer.x,sim.camera+100);
});
