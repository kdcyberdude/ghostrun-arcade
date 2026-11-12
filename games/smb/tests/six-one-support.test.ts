import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';

function fixture(x:number,y:number,omit=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='6-1')!);
 const main=level.areas.find(a=>a.id==='main')!;
 // Isolate actual terrain near the castle; disable its exit so this remains a collision fixture.
 main.spawn=[x,y];main.camera=2368;main.enemies=[];main.generators=[];main.exit=undefined;
 if(omit)main.tiles=main.tiles.filter(([col,row])=>col!==155||row!==13);
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('6-1 recovered ground supports a fall at208 instead of the old224raster-piece support',()=>{
 const present=fixture(2482,176),omitted=fixture(2482,176,true);
 present.step([],20);omitted.step([],20);
 assert.equal(present.player.y,208);assert.equal(present.player.grounded,true);
 assert.equal(omitted.player.y,224);assert.equal(omitted.player.grounded,true);
 assert.equal(present.phase,'play');assert.equal(present.lives,3);
});

for(const mode of ['walk','run']as const)test('6-1 recovered edge supports an ordinary leftward '+mode,()=>{
 const present=fixture(2520,208),omitted=fixture(2520,208,true);
 const frames=mode==='walk'?50:40,buttons:Button[]=mode==='walk'?['left']:['left','b'];let oldDip=false;
 for(let frame=0;frame<frames;frame++){
  present.step(buttons,1);omitted.step(buttons,1);
  assert.equal(present.player.y,208);assert.equal(present.player.grounded,true);
  oldDip ||= omitted.player.y>208;
 }
 assert.equal(oldDip,true);assert.ok(present.player.x<2496&&present.player.x>=2468);
 assert.equal(present.phase,'play');assert.equal(present.lives,3);
});
