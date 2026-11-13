import {isolatePlacedStream} from './helpers/isolated-placed-stream.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

/** A wingless pose in a screenshot may be the transformed jumping Paratroopa.
 * Native v2 frame437 keeps slot2 while changing id14 to id0. */
test('7-1 keeps the native stomp-born Koopa as one actor, with no screenshot-derived duplicate',()=>{
 const level=observedLevels().find(l=>l.id==='7-1')!;
 const main=level.areas.find(a=>a.id==='main')!;
 assert.equal(main.enemies.some(e=>e.kind==='koopa'&&e.x===1009),false);
 const spec={kind:'koopa' as const,x:1009,y:178,spawnUnwinged:true};
 const sim=isolatePlacedStream(new Simulation([{...level,areas:[{...main,enemies:[spec]}]}]));sim.reset(true);sim.camera=900; // Keep the focused actor in the native active window.
 const k=sim.enemies[0];k.active=true;
 let rows=0;
 while(k.unwingedAir&&rows<40){
  Object.assign(sim.player,{x:k.x+100,y:100,vx:0,vy:2,grounded:false});
  const score=sim.score;sim.step([],1);rows++;
  if(k.unwingedAir){assert.equal(sim.score,score);assert.ok(!sim.player.dead);assert.ok(!k.shell);} // Mario is separated: this tests falling motion, not an airborne immunity.
 }
 assert.ok(rows>=8&&rows<=25,`air rows ${rows}`);
 assert.equal(k.y,208);
});
