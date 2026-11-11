import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';

const level=()=>structuredClone(observedLevels().find(l=>l.id==='8-4')!);

test('8-4 fish pipe room has its observed plants and generated fish, without underwater actors',()=>{
 const area=level().areas.find(a=>a.id==='area-3')!;
 assert.deepEqual(area.enemies.map(e=>[e.kind,e.x]),[['piranha',56],['piranha',200],['piranha',328],['piranha',584]]);
 assert.equal(area.firebars?.length,0);
 assert.equal(area.generators?.filter(g=>g.kind==='flyingFish').length,1);
});

test('8-4 water room contains Bloopers and no displaced final-castle enemies',()=>{
 const area=level().areas.find(a=>a.id==='area-4')!;
 assert.equal(area.theme,'water');
 // Native id 13 plant at x 56 is in the first row of the area (the start pipe, like 1-2/2-2/4-2/7-2); the three Bloopers are the other objects.
 assert.deepEqual(area.enemies.filter(e=>e.kind!=='blooper').map(e=>[e.kind,e.x]),[['piranha',56]]);
 assert.equal(area.enemies.filter(e=>e.kind==='blooper').length,3);
 assert.ok(area.firebars?.some(bar=>bar.x===328&&bar.y===120));
 // Seven survey sightings include aliases of one source-tracked late bar.
 assert.equal(area.firebars?.length,5);
 const last=area.firebars!.slice(-2);
 assert.deepEqual([last[1].x-last[0].x,last[1].y-last[0].y],[128,-16]);
});

test('8-4 final castle has its three observed enemy kinds and one live-height Bowser',()=>{
 const area=level().areas.find(a=>a.id==='area-5')!;
 // Native area-5 objects: plants at x 56 (start pipe, first row) and 168, Hammer Bro, Podoboo, Bowser.
 assert.deepEqual(area.enemies.map(e=>e.kind).sort(),['bowser','hammerBro','piranha','piranha','podoboo']);
 const boss=area.enemies.find(e=>e.kind==='bowser')!;
 assert.deepEqual([boss.x,boss.y],[624,160]);
});

test('8-4 main castle plants align with their observed pipe mouths',()=>{
 const area=level().areas.find(a=>a.id==='main')!;
 // The former third plant at 1128 sat on a pipe that is not solid in the native run (native Mario walks and jumps through x 1072-1175);
 // the native exit pipe is at 1296-1327 (data/eight-four-native-alignment.json). Native enemy appearances show no piranha at 1128.
 // Native id 13 slots of the whole main passage are at x 312, 824 (the pipe at 816, data/native-geometry-corrections.json), 1304 and 1448: the
 // screenshot-era plant at 648 has no native counterpart (removed) and the plant of the corrected pipe at 816 is added (moved here from 648).
 assert.deepEqual(area.enemies.filter(e=>e.kind==='piranha').map(e=>e.x).sort((a,b)=>a-b),[312,824,1304,1448]);
 assert.deepEqual(area.enemies.filter(e=>e.kind==='goomba').map(e=>e.x),[897,920,944]); // native id 6 group created together at f75479 (camera 643)
});

test('all four 8-4 room exits accept ordinary pipe controls in declared exit fixtures',()=>{
 for(const id of ['main','area-2','area-3','area-4']){
  const observed=level(),area=observed.areas.find(a=>a.id===id)!,pipe=area.pipes![0];
  // Near-exit placement isolates physical entry, not traversal from the start (side pipes start at their native entry trigger column).
  observed.main=id;area.spawn=[pipe.direction==='right'?pipe.entryTriggerX!-8:pipe.x-8,pipe.y];area.camera=Math.max(0,area.spawn[0]-112);
  const sim=new Simulation([observed]);sim.reset(true);sim.step([pipe.direction],pipe.direction==='right'?32:4);
  assert.equal(sim.phase,'pipe',id);sim.step([],pipe.transitionFrames!);
  assert.equal(sim.area.id,pipe.to,id);assert.equal(sim.lives,3,id);
 }
});
