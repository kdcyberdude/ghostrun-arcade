import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import measured from '../data/water-optional-entry-measurements.json';
import type {Level} from '../src/types.js';

test('6-2 optional water entry follows the six observed falling poses rather than spawning on the floor',()=>{
 const original=observedLevels().find(l=>l.id==='6-2')!;
 const main=structuredClone(original.areas.find(a=>a.id==='main')!);
 const pipe=main.pipes!.find(p=>p.to==='optional-water')!;
 // Isolated ordinary pipe-entry fixture, not a campaign traversal. Start on the
 // measured entrance pipe; subsequent motion uses only held Down and simulation.
 main.spawn=[pipe.x-8,pipe.y];main.enemies=[];
 const level:Level={...original,main:'main',areas:[main,...original.areas.filter(a=>a.id!=='main')]};
 const sim=new Simulation([level]);sim.reset(true);
 for(const sample of measured.measurements.filter(r=>r.tick>=6600&&r.tick<=6613)){
  // The Mario sprite of a live capture is one native frame old (waterbig: the native-exact entry fall reproduces the six samples exactly one frame
  // earlier, as it does in 5-2; the old fitted fall needed 2 px of slack).
  sim.step(['down'],sample.nativeFramesSince6593-sim.frame-1);const spriteY=sim.player.y;sim.step(['down'],1);
  if(sample.tick<=6602)assert.equal(sim.phase,'pipe');
  if(sample.tick===6603){assert.equal(sim.area.id,'optional-water');assert.equal(sim.entryFallHidden,true);}
  const p=sample.player;
  if(p){assert.ok(Math.abs(sim.player.x-p.originX)<=2);assert.ok(Math.abs(spriteY-p.feetY)<0.5,`${sample.tick}: ${spriteY} vs${p.feetY}`);}
  if(p&&p.feetY<=68)assert.equal(sim.entryTimerHidden,true);
  if(p&&p.feetY>=88)assert.equal(sim.entryTimerHidden,false);
 }
 assert.equal(sim.phase,'play');assert.equal(sim.lives,3);assert.equal(sim.player.y,208);
});
