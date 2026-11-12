import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';

/** spawnlead: enemies the remake activated 4-7 rows before their native first appearance (route trace slot flag 0 -> set) at
 * x < camera + 304; native camera (running max of x - 112) at that row. Native rows: 8-2 70762/71006/70820/70833, 5-2 41527. */
const NATIVE:[string,string,string,number,number][]=[
 ['8-2','main','paratroopa',2800,2509],['8-2','main','paratroopa',3248,2958],
 ['8-2','main','goomba',2944,2651],['8-2','main','goomba',2976,2684],['5-2','area-2','paratroopa',2608,2307],
];
test('enemies with a native spawn lag appear at the native camera',()=>{
 for(const [level,area,kind,x,camera] of NATIVE){
  const spec=observedLevels().find(l=>l.id===level)!.areas.find(a=>a.id===area)!.enemies.find(e=>e.kind===kind&&e.x===x)!;
  assert.equal(spec.spawnCamera,camera,`${level} ${kind} ${x}`);
 }
});
