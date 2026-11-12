import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import observations from '../data/vine-optional-farend-running.json';
import fixture from '../data/warp-4-2-fixture-inputs.json';
import type {Button} from '../src/types.js';

function roofFixture(){
 const all=observedLevels(),level=structuredClone(all.find(l=>l.id===fixture.initial.level)!);level.main=fixture.initial.area;
 const area=level.areas.find(a=>a.id===level.main)!;area.spawn=[...fixture.initial.spawn] as [number,number];area.camera=fixture.initial.camera;area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim=new Simulation([level,...all.filter(l=>l.id!==level.id)]);sim.reset(true);return sim;
}

test('4-2 far-end roof warp stays in the existing area and preserves its normal and optional exits',()=>{
 const level=observedLevels().find(l=>l.id==='4-2')!,area=level.areas.find(a=>a.id==='area-3')!;
 assert.ok(area.warpZone,'the observed far-end roof activation is compiled');
 assert.equal(area.width,3600);assert.equal(area.warpZone.cameraEnd,3344);
 for(const [x,y,id]of observations.supplementalMap.tiles)assert.ok(area.tiles.some(t=>t[0]===x&&t[1]===y&&t[2]===(id===71?82:id)));
 for(const [x,y]of [...observations.supplementalMap.unknownCells,...observations.supplementalMap.observedBlankCells])assert.equal(area.tiles.some(t=>t[0]===x&&t[1]===y),false);
 assert.equal(level.areas.length,5);
 assert.ok(area.warpZone.overlays.some(o=>o.text==='5'));
 assert.ok(area.pipes!.some(p=>p.to==='area-4'&&!p.targetLevel&&!p.requiresWarpActivation));
 assert.ok(area.pipes!.some(p=>p.to==='bonus-coins'&&!p.targetLevel));
 assert.ok(area.vines!.some(v=>v.to==='vine-warp-zone'));
 const warp=area.pipes!.filter(p=>p.targetLevel==='5-1');assert.equal(warp.length,1);
 assert.equal(warp[0].requiresWarpActivation,true);assert.equal(warp[0].transitionFrames,40);
 assert.deepEqual(new Set(level.areas.find(a=>a.id==='vine-warp-zone')!.pipes!.map(p=>p.targetLevel)),new Set(['6-1','7-1','8-1']));
});

test('ordinary roof movement remains continuous and activates only the observed far-end sign and plant',()=>{
 const sim=roofFixture(),normalPlants=sim.enemies.filter(e=>e.kind==='piranha'&&e.originX!==3448);let activation=0;
 assert.equal(sim.warpZoneActive,false);assert.ok(sim.enemies.some(e=>e.kind==='piranha'&&e.originX===3448));
 for(let frame=1;frame<=430;frame++){
  const x=sim.player.x;sim.step(['right','b'],1);
  assert.equal(sim.area.id,'area-3');assert.equal(sim.areaFrame,frame);assert.ok(Math.abs(sim.player.x-x)<=2.5);assert.ok(sim.camera<=3344);
  if(!sim.warpZoneActive)assert.ok(sim.camera<3344);else if(!activation){activation=frame;assert.equal(sim.camera,3344);}
 }
 assert.ok(activation);assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
 assert.equal(sim.enemies.some(e=>e.kind==='piranha'&&e.originX===3448),false);
 for(const plant of normalPlants)assert.ok(sim.enemies.includes(plant));
});

test('ordinary roof traversal, falling and pipe jump reach playable5-1 through the physical warp',()=>{
 const sim=roofFixture();sim.score=167500;sim.coins=37;let sawPipe=false,sawIntro=false;
 for(const action of fixture.actions)for(let frame=0;frame<action.frames;frame++){
  sim.step(action.buttons as Button[],1);sawPipe ||= sim.phase==='pipe';sawIntro ||= sim.phase==='intro';assert.equal(sim.lives,3);
 }
 assert.ok(sawPipe);assert.ok(sawIntro);assert.equal(sim.level.id,'5-1');assert.equal(sim.area.id,'main');assert.equal(sim.phase,'play');
 assert.deepEqual([sim.player.x,sim.player.y,sim.camera],[40,208,0]);assert.equal(sim.score,167500);assert.equal(sim.coins,37);assert.equal(sim.warpZoneActive,false);
});

test('ordinary right input still enters the normal 4-2 side-pipe exit',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';
 const area=level.areas.find(a=>a.id===level.main)!;area.spawn=[2994,160];area.camera=2882;area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim=new Simulation([level]);sim.reset(true);sim.step(['right'],8);
 assert.equal(sim.phase,'pipe');assert.equal(sim.warpZoneActive,false);
 // Native timeline (data/pipe-exit-timeline.json): 52 entering rows + 26 load rows, then a 96-row locked rise out of the destination pipe.
 // The old 64-frame wait predates that measurement (the entering animation alone is 52 native rows, the load adds 26).
 sim.step([],73);assert.equal(sim.area.id,'area-4');assert.equal(sim.phase,'play');assert.equal(sim.lives,3);assert.equal(sim.pipeRising,true);
 sim.step([],96);assert.equal(sim.pipeRising,false);assert.equal(sim.player.y,176);
});
