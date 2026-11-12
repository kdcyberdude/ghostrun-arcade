import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

/** 7-1 route: the Koopa the route data places at x 1009 is the Paratroopa native Mario stomps on row 56283 (slot 2 id 14 -> id 0, y 154 = feet 178);
 * its state byte is 1 while it falls (rows 56284-56302) and it lands about row 56303. It must appear falling from feet 178 and be untouchable until it
 * lands: a grounded stand-in let the stomp window bounce Mario off it at row 56293 (native: no contact), which then cost the 7-1 Hammer Bro stomp. */
test('the 7-1 stomp-born Koopa appears falling at native feet 178 and is untouchable until it lands',()=>{
 const level=observedLevels().find(l=>l.id==='7-1')!;
 const main=level.areas.find(a=>a.id==='main')!;
 const spec=main.enemies.find(e=>e.kind==='koopa'&&e.x===1009)!;
 assert.equal(spec.y,178);assert.equal(spec.spawnUnwinged,true);
 const sim=new Simulation([{...level,areas:[{...main,enemies:[spec]}]}]);sim.reset(true);
 const k=sim.enemies[0];k.active=true;
 let rows=0;
 while(k.unwingedAir&&rows<40){
  Object.assign(sim.player,{x:k.x,y:k.y-6,vx:0,vy:2,grounded:false});
  const score=sim.score;sim.step([],1);rows++;
  if(k.unwingedAir){assert.equal(sim.score,score);assert.ok(!sim.player.dead);assert.ok(!k.shell);}
 }
 assert.ok(rows>=8&&rows<=25,`air rows ${rows}`);
 assert.equal(k.y,208);
});
