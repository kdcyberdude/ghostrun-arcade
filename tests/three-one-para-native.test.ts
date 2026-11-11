import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level} from '../src/types.js';
import native from '../evidence/three-one-para-fixtures.json';

// One shared state estimated from eight calibration PNGs, not native birth.
// Source rows are measured world coordinates, never assigned back into the NPC.
function check(group:'calibration'|'reserved') {
 let observations=0,future=0,maxY=0;
 for(const c of native.cases.filter(c=>c.group===group)) {
  const level:Level={id:'native-3-1-bounce',time:400,main:'main',evidence:'Isolated motor regression, not campaign traversal.',areas:[{id:'main',width:1024,palette:15,theme:'ground',spawn:[0,208],tiles:[],solidRects:[{x:0,y:208,width:1024,height:32,id:84}],enemies:[{kind:'paratroopa',x:200,y:c.seed.y,direction:-1,palette:'0f-1a-30-27'}],evidence:'Observed floor208 and one source-conditioned actor.'}]};
  const sim=new Simulation([level]);sim.reset(true);
  const enemy=sim.enemies[0],shift=c.seed.x-200;
  enemy.active=true;enemy.x=200;enemy.y=c.seed.y;enemy.vx=c.seed.vx;enemy.vy=c.seed.vy;
  let elapsed=0;
  for(const row of c.rows) {
   const next=row.frame-c.seedFrame;
   sim.step([],next-elapsed);elapsed=next;
   if(!row.scored)continue;
   observations++;if(next>0)future++;
   const dx=Math.floor(enemy.x+shift)-row.x,dy=Math.floor(enemy.y)-row.y;
   assert.ok(Math.abs(dx)<=2&&Math.abs(dy)<=2,`${c.name} native${row.frame}: X${dx},Y${dy}`);
   assert.equal(enemy.kind,'paratroopa');assert.equal(sim.phase,'play');
   maxY=Math.max(maxY,Math.abs(dy));
  }
 }
 return {observations,future,maxY};
}

test('3-1 first green actor predicts53calibration-tail poses after the8-pose state-conditioning window',()=>{
 const result=check('calibration');assert.equal(result.observations,53);assert.equal(result.future,53);assert.ok(result.maxY<=2);
});

test('3-1 frozen state predicts68heldout observations including65future poses without any reset',()=>{
 const result=check('reserved');assert.equal(result.observations,68);assert.equal(result.future,65);assert.ok(result.maxY<=2);
});
