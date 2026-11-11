import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import spawns from '../data/native-enemy-spawns.json';
import walkerCorrections from '../data/walker-corrections.json';

// Spawn corrections were measured from a read-only native trace of the recorded route (tools/derive-enemy-spawns.py); the
// compiled level data must carry every one of them (regenerate with tools/compile-levels.mjs).
// Area D: data/walker-corrections.json supersedes one derived spawn camera. The 1-2/area-2 Goomba at x 1168 was derived at camera 867, but
// on the recorded route the camera stands at 867 for 122 frames (frames 2956-3078: it cannot scroll back while Mario walks left and returns)
// and the native Goomba exists only from the frame the camera advances past 867; a trigger of 867 made the remake Goomba appear 122
// frames early. The native trace shows the old expectation wrong for that one entry, so its expected camera is the corrected 868.
const supersededCamera=(c:typeof spawns.corrections[number])=>{
 const w=walkerCorrections.corrections.find(w=>w.level===c.level&&w.area===c.area&&w.match.kind===c.match.kind&&w.match.x===c.replace.x&&w.match.y===c.match.y&&(w.replace as {x?:number}).x===undefined);
 return (w?.replace as {spawnCamera?:number}|undefined)?.spawnCamera;
};
test('every native-measured enemy spawn correction is present in the compiled levels',()=>{
 assert.ok(spawns.corrections.length>100);
 for(const c of spawns.corrections){
  const area=observedLevels().find(l=>l.id===c.level)?.areas.find(a=>a.id===c.area);
  assert.ok(area,`${c.level}/${c.area}`);
  const camera=supersededCamera(c)??c.replace.spawnCamera;
  const found=area!.enemies.some(e=>e.kind===c.match.kind&&e.x===c.replace.x&&(camera===undefined||e.spawnCamera===camera));
  assert.ok(found,`${c.level}/${c.area} ${c.match.kind} ${c.replace.x}`);
 }
});

test('a measured group spawns its members 24 px apart at the native camera, not 16 px apart on the default trigger',()=>{
 const main=observedLevels().find(l=>l.id==='2-1')!.areas.find(a=>a.id==='main')!;
 const goombas=main.enemies.filter(e=>e.kind==='goomba'&&e.x>=1380&&e.x<=1450).map(e=>e.x).sort((a,b)=>a-b);
 assert.deepEqual(goombas,[1392,1416,1440],'native first appearance of the 2-1 three-Goomba group (x 1392, 1416, 1440 at one frame)');
});
