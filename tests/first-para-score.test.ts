/** Isolated production-simulation fixtures. Position/velocity seeds and private
 * chain setup below are engineering inputs, not native state or gameplay proof.
 * Native first-hit timing spans 7/8 frames; nonzero-chain behavior is unmeasured.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Enemy} from '../src/types.js';

type ChainAccess = {stompChain:number};
function setup(palette:string,chain=0) {
 const level=structuredClone(observedLevels().find(l=>l.id==='8-2')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===288).map(e=>({...e,palette}));
 area.tiles=[]; area.freeTiles=[]; area.decorations=[]; area.patternOverrides=[]; area.cannons=[]; area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[288,188],128);
 (sim as unknown as ChainAccess).stompChain=chain;
 sim.player.vy=1;sim.player.grounded=false;
 return sim;
}
function hitNext(sim:Simulation,kind:'wingless'|'goomba') {
 const old=sim.enemies[0];
 const next:Enemy={...old,kind:kind==='goomba'?'goomba':old.kind,x:288,y:192,originX:288,originY:192,vx:0,vy:0,dead:0,active:true,shell:false,movingShell:false};
 sim.enemies=[next];delete next.unwingedAir;sim.player.x=288;sim.player.y=188;sim.player.vx=0;sim.player.vy=1;sim.player.grounded=false;
 sim.broClock=1;sim.step([],1);
 return next;
}
for (const [color,palette] of [['green','0f-1a-30-27'],['red','0f-16-30-27']] as const) {
 for (const next of ['wingless','goomba'] as const) {
  test(`${color} zero-chain wing loss awards 400, then ${next} awards 100`,()=>{
   const sim=setup(palette);sim.broClock=1;sim.step([],1);
   assert.equal(sim.enemies[0].kind,color==='red'?'redKoopa':'koopa');
   assert.equal(sim.score,400);
   assert.equal((sim as unknown as ChainAccess).stompChain,0);
   const before=sim.score,target=hitNext(sim,next);
   assert.equal(sim.score-before,100);
   assert.equal((sim as unknown as ChainAccess).stompChain,1);
   if(next==='wingless')assert.equal(target.shell,true);else assert.ok(target.dead>0);
  });
 }
 test(`${color} pre-existing nonzero chain retains the current 200-point fallback`,()=>{
  const sim=setup(palette,1);sim.broClock=1;sim.step([],1);
  assert.equal(sim.enemies[0].kind,color==='red'?'redKoopa':'koopa');
  assert.equal(sim.score,200);
  assert.equal((sim as unknown as ChainAccess).stompChain,2);
 });
}
