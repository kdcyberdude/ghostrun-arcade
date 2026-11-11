import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

test('observed3-1 upper vine brick replaces the misregistered overlapping fragments and grows under an ordinary head hit',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!);
 const main=level.areas.find(a=>a.id==='main')!;
 for(const col of [129,130,131])assert.equal(main.tiles.find(t=>t[0]===col&&t[1]===5)?.[2],81);
 assert.ok(!main.freeTiles?.some(t=>t.y===80&&t.x>=2060&&t.x<2112));
 main.spawn=[2096,128];main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);sim.step(['a'],24);
 assert.equal(sim.tiles.get('131,5'),196);assert.ok(sim.vines.find(v=>v.id==='3-1-sky-vine')!.height>0);
});

for(const [id,room,cameraEnd,offset]of [['2-1','sky-coins',992,11],['3-1','3-1-vine-sky',1248,29]]as const){
 test(`a neutral${id} sky rider reaches its observed camera end and falls when the cloud leaves`,()=>{
  const level=structuredClone(observedLevels().find(l=>l.id===id)!),sky=level.areas.find(a=>a.id===room)!;
  // Declared riding fixture on the actual map, then only neutral controls.
  level.main=sky.id;sky.entryVine=undefined;sky.spawn=[256+offset,160];sky.camera=144+offset;
  const sim=new Simulation([level]);sim.reset(true);let reachedRight=false,departed=false;
  for(let frame=0;frame<1800&&sim.area.id===sky.id;frame++){
   sim.step([],1);if(sim.area.id!==sky.id)break;
   if(sim.camera===cameraEnd&&sim.player.x===cameraEnd+240){reachedRight=true;assert.ok(sim.player.x-sim.camera<=240);}
   if(reachedRight&&sim.player.y>160){departed=true;assert.ok(sim.platformPosition(sim.area.platforms![0]).x>cameraEnd+240);}
  }
  assert.ok(reachedRight);assert.ok(departed);assert.equal(sim.area.id,'main');assert.equal(sim.lives,3);
  assert.equal(sim.player.x,2600);assert.equal(sim.camera,2560);
 });
}

test('3-1 distinct sky room completes neutral automatic vine entry at the observed standing pose',()=>{
 const level=observedLevels().find(l=>l.id==='3-1')!;
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('3-1-vine-sky');
 // Room-load fixture checks the inferred shared entry behavior, not traversal.
 sim.step([],500);assert.equal(sim.area.id,'3-1-vine-sky');
 assert.equal(sim.player.x,75);assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
 const sky=sim.area;assert.ok(sky.tiles.filter(t=>t[2]===194).length>=50);
 assert.deepEqual(sky.fallExit?.spawn,[2600,0]);assert.equal(sky.fallExit?.camera,2560);
 assert.deepEqual(sky.platforms?.[0],{x:256,y:161,width:48,axis:'x',range:0,speed:1});
});
