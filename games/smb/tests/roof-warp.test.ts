import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import observations from '../data/warp-1-2-observations.json';
import fixtures from '../data/warp-1-2-fixture-inputs.json';
import type {Button} from '../src/types.js';

// The end block of 1-2 area-2 is 16 px left of the screenshot registration (data/native-geometry-corrections.json '1-2 area-2 end block drift': native
// exit pipe 2656, first warp plant 2856, registration anchor 2672). Map coordinates of this file therefore moved -16 against the screenshot-era values
// (spawn 2594/camera 2473 -> 2578/2457, camera stop and activation 2834 -> 2818, pipes 2864/2928/2992 -> 2848/2912/2976, side pipe 2672 -> 2656,
// width 3090 -> 3074); screen positions are unchanged. data/warp-1-2-observations.json keeps the screenshot-frame cells: nativeCell() maps them.
const nativeCell=([col,row,...rest]:number[])=>[row<=12?col-1:col,row,...rest]; // rows 0-12 follow the drift, the floor rows 13-14 stay
function roofFixture(){
 const all=observedLevels(),source=structuredClone(all.find(l=>l.id==='1-2')!);
 source.main='area-2';const area=source.areas.find(a=>a.id===source.main)!;
 area.spawn=[2578,32];area.camera=2457;area.spawnVelocity=[0,0];area.entryFall=undefined;
 const sim=new Simulation([source,...all.filter(l=>l.id!==source.id)]);sim.reset(true);return sim;
}

test('the observed roof extension remains in the same1-2 area with real pipes and explicit unknown cells',()=>{
 const level=observedLevels().find(l=>l.id==='1-2')!,area=level.areas.find(a=>a.id==='area-2')!;
 assert.equal(level.areas.length,4);assert.equal(area.width,3074);assert.equal(area.warpZone?.cameraEnd,2818);
 assert.equal(area.warpZone?.activateAtCamera,2818);
 for(const [col,row,id]of observations.tiles.map(nativeCell))assert.ok(area.tiles.some(t=>t[0]===col&&t[1]===row&&t[2]===(id===71?82:id)));
 for(const [col,row]of observations.unknownCells.map(nativeCell))assert.equal(area.tiles.some(t=>t[0]===col&&t[1]===row),false);
 for(const [col,row]of observations.observedBlankCells.map(nativeCell))assert.equal(area.tiles.some(t=>t[0]===col&&t[1]===row),false);
 assert.deepEqual(area.pipes?.filter(p=>p.requiresWarpActivation).map(p=>[p.x,p.y,p.targetLevel,p.transitionFrames]),[[2864,160,'4-1',40],[2928,160,'3-1',40],[2992,160,'2-1',40]]);
 assert.ok(area.pipes?.some(p=>p.x===2656&&p.to==='area-3'&&!p.requiresWarpActivation),'normal exit remains available');
});

test('ordinary roof movement activates the sign at the camera stop and removes only the three warp plants',()=>{
 const sim=roofFixture(),area=sim.area,warpX=area.warpZone!.removePiranhasAtX;
 const ordinaryPlants=sim.enemies.filter(e=>e.kind==='piranha'&&!warpX.includes(e.x));
 assert.equal(sim.warpZoneActive,false);let firstActiveFrame=0;
 for(let frame=1;frame<=300;frame++){
  const x=sim.player.x;sim.step(['right','b'],1);
  assert.equal(sim.area,area);assert.equal(sim.areaFrame,frame);assert.ok(Math.abs(sim.player.x-x)<=2.5);
  assert.ok(sim.camera<=2818);
  if(!sim.warpZoneActive)assert.ok(sim.camera<2818);
  else if(!firstActiveFrame){firstActiveFrame=frame;assert.equal(sim.camera,2818);}
 }
 assert.ok(firstActiveFrame>0);assert.equal(sim.warpZoneActive,true);assert.equal(sim.camera,2818);
 assert.equal(sim.player.y,208);assert.equal(sim.lives,3);assert.equal(sim.phase,'play');
 assert.equal(sim.enemies.some(e=>e.kind==='piranha'&&warpX.includes(e.originX)),false);
 for(const plant of ordinaryPlants)assert.ok(sim.enemies.includes(plant),'unrelated plants are not removed by warp activation');
 sim.reset(true);assert.equal(sim.warpZoneActive,false);assert.equal(sim.enemies.filter(e=>e.kind==='piranha'&&warpX.includes(e.x)).length,3);
});

test('down on a warp pipe before activation cannot change worlds',()=>{
 const all=observedLevels(),source=structuredClone(all.find(l=>l.id==='1-2')!);source.main='area-2';
 const area=source.areas.find(a=>a.id===source.main)!;area.spawn=[2984,160];area.camera=2784;area.entryFall=undefined;area.spawnVelocity=[0,0];
 const sim=new Simulation([source,...all.filter(l=>l.id!==source.id)]);sim.reset(true);sim.step(['down'],120);
 assert.equal(sim.level.id,'1-2');assert.equal(sim.phase,'play');assert.equal(sim.warpZoneActive,false);
});

// The declared route inputs (data/warp-1-2-fixture-inputs.json; its hash was bound by earlier browser evidence, the routes themselves are unchanged
// and only its 'initial' placement moved -16 with the map; a rigid -16 leaves the dynamics identical; re-scanned after the move, the segment durations below still sit inside their passing regions) were composed
// against the pre-motor horizontal speeds. These per-route segment overrides re-align them to the native-speed motor; each
// choice was scanned to pass over a wide neighbourhood of frame counts (all routes: the first right segment after the roof
// bounce 0..11; route 2: second right segment 0..19; route 3: airborne pair 18..28 / right 15..42; route 4 adds the second
// airborne pair 38..44 / 10..35). The native wall contact rule (the pause lasts as long as the back-out, opposite presses
// are undelayed; evidence/entry-timeline-findings-20261109.md) changes the bounce off the roof's end wall by about 9 px,
// so the earlier 15-frame right segment (tuned to the fitted 1..3 frame pause) no longer lands on the pipe.
const nativeMotorAlignment:Record<string,[number,string[],number][]>={
 '2':[[2,['right'],5],[4,['right'],20]],
 '3':[[2,['right'],0],[5,['left','a','b'],35],[6,['right'],8]],
 '4':[[2,['right'],0],[5,['left','a','b'],35],[6,['right'],10],[8,['left','a','b'],45]],
};
// Re-aligned again after the native takeoff-reversal rule (a jump out of a run-speed reversal keeps the doubled step; the roof bounce starts with
// one: right,b 300 then left,a,b 30) and the run-class walk-off rule changed the bounce trajectory. Route 2: first right segment 0..20 with the
// second right segment 11..30 (chosen 5/20, inside the passing region); route 3 airborne pair 23..34 / right 8..45 with the first segment at 0
// (the only passing first-segment value); route 4 keeps its own 41-frame pair (passes for 41..45 with right 5..36 after route 3's prefix).
// Re-aligned once more after the air step rule (doubles while facing and motion disagree): route 3 airborne pair 27..42 with right 0..28 (chosen 35/8), route 4 41 with right 0..30.
// Route 4 re-aligned after the small-player Down stop applies in every area (hdrift6): pair 45 with right 10 (passing 43..48 / 2..16).
// Scan: evidence/local/warp-realign/scan.ts. The assertions below are unchanged: only the composed input durations moved.
for(const route of fixtures.routes)test(`ordinary controls traverse the compiled roof/chamber and enter warp${route.label} to${route.targetLevel}`,()=>{
 const sim=roofFixture();let sawPipe=false,sawIntro=false;
 const actions=route.actions.map(action=>[...action] as [string[],number]);
 for(const [index,buttons,frames]of nativeMotorAlignment[route.label]??[])actions[index]=[buttons,frames];
 for(const [buttons,frames]of actions){
  for(let frame=0;frame<Number(frames);frame++){
   sim.step(buttons as Button[],1);sawPipe ||= sim.phase==='pipe';sawIntro ||= sim.phase==='intro';
   assert.equal(sim.lives,3);
  }
 }
 assert.ok(sawPipe);assert.ok(sawIntro);assert.equal(sim.level.id,route.targetLevel);assert.equal(sim.area.id,'main');assert.equal(sim.phase,'play');
 assert.deepEqual([sim.player.x,sim.player.y],[40,208]);assert.equal(sim.camera,0);assert.equal(sim.warpZoneActive,false);
});
