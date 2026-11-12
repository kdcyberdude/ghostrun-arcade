import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button,Level} from '../src/types.js';

for(const buttons of [['right'],['right','b'],['a']] as Button[][])test(`coin-room falling entry follows captured arc with ${buttons.join('+')}`,()=>{
 const room=structuredClone(observedLevels()[0].areas.find(a=>a.id==='bonus-coins')!);
 const level:Level={id:'bonus-entry-fixture',time:400,main:room.id,areas:[room],evidence:'Isolated production room fixture anchored at first presented reference frame; not a campaign traversal.'};
 const sim=new Simulation([level]);sim.reset(true);
 const samples=[[0,64,24],[8,74,24],[15,87,24],[23,114,26],[30,144,30],[38,178,37],[45,207,45],[53,208,50]];
 for(const [frame,feet,x]of samples){
  sim.step(buttons,frame-sim.frame);assert.ok(Math.abs(Math.floor(sim.player.y)-feet)<=2,`${frame}: ${sim.player.y} vs ${feet}`);
  assert.ok(Math.abs(Math.floor(sim.player.x)-(buttons.includes('right')?x:24))<=2,`${frame}: x${sim.player.x}`);
 }
 assert.equal(sim.player.grounded,true);
 if(buttons.includes('a')){sim.step(['a'],15);assert.equal(sim.player.y,208);sim.step([],8);sim.step(['a'],8);assert.ok(sim.player.y<190);}
});

test('a bonus return does not replay the main underground falling entrance',()=>{
 const level=observedLevels().find(l=>l.id==='1-2')!,sim=new Simulation([level]);sim.reset(true);
 sim.loadArea('area-2',[1864,176],1808);
 assert.equal(sim.entryFallPose,false);assert.equal(sim.entryFallHidden,false);assert.equal(sim.entryTimerHidden,false);
});

test('a running pipe approach cannot carry running air acceleration into the coin-room fall',()=>{
 const bonus=structuredClone(observedLevels()[0].areas.find(a=>a.id==='bonus-coins')!);
 const level:Level={id:'running-pipe-fixture',time:400,main:'main',evidence:'Isolated ordinary pipe transition; falling room geometry and entry rules from observed1-1 bonus',areas:[{id:'main',width:1024,palette:0,theme:'ground',tiles:Array.from({length:64},(_,x)=>[x,13,84]),enemies:[],spawn:[40,208],pipes:[{x:160,y:208,direction:'down',entryHorizontalTolerance:9,to:bonus.id,spawn:bonus.spawn,transitionFrames:80}],evidence:'Synthetic flat approach'},bonus]};
 const sim=new Simulation([level]);sim.reset(true);sim.step(['right','b'],68);assert.equal(Math.floor(sim.player.vx*16),40,'run cap speed byte');
 sim.step(['down'],8);assert.equal(sim.phase,'pipe');sim.step(['right','b'],80);assert.equal(sim.area.id,bonus.id);
 let maximumAirSpeed=0;for(let frame=0;frame<80&&!sim.player.grounded;frame++){
  sim.step(['right','b'],1);if(!sim.player.grounded)maximumAirSpeed=Math.max(maximumAirSpeed,sim.player.vx);
 }
 assert.ok(maximumAirSpeed>1);assert.ok(maximumAirSpeed<=1.5,'measured bonus entry ignores B running acceleration');assert.equal(sim.player.y,208);
});
