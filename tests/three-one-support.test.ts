import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';

function fixture(x:number,y:number,omit=false){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!);
 const main=level.areas.find(a=>a.id==='main')!;
 // Isolate the actual map's terrain; these placements are collision fixtures, not campaign play.
 main.spawn=[x,y];main.camera=1360;main.enemies=[];main.generators=[];
 if(omit)main.tiles=main.tiles.filter(([col,row])=>col!==94||row!==13);
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('3-1 recovered ground supports a fall at208 instead of the old16px dip',()=>{
 const present=fixture(1506,176),omitted=fixture(1506,176,true);
 present.step([],32);omitted.step([],32);
 assert.equal(present.player.y,208);assert.equal(present.player.grounded,true);
 assert.equal(omitted.player.y,224);assert.equal(omitted.player.grounded,true);
 assert.equal(present.lives,3);
});

for(const mode of ['walk','run','reverse']as const)test('3-1 recovered support stays level during ordinary '+mode+' controls',()=>{
 const present=fixture(1460,208),omitted=fixture(1460,208,true);
 const frames=mode==='reverse'?140:100;let oldDip=false,maxX=0;
 for(let frame=0;frame<frames;frame++){
  const buttons:Button[]=mode==='reverse'&&frame>=55?['left','b']:mode==='walk'?['right']:['right','b'];
  present.step(buttons,1);omitted.step(buttons,1);maxX=Math.max(maxX,present.player.x);
  assert.equal(present.player.y,208);assert.equal(present.player.grounded,true);
  oldDip ||= omitted.player.y>208;
 }
 assert.equal(oldDip,true,'The negative control must reproduce the original missing support');
 assert.ok(maxX>1520);if(mode==='reverse')assert.ok(present.player.x<1504);
 assert.equal(present.lives,3);
});
