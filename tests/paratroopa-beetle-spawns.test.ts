/** The measured Paratroopa and Beetle spawn state (data/native-paratroopa-beetle-spawns.json, derived by
 * tools/derive-paratroopa-beetle-spawns.mjs from the native enemy slots) must be what the compiled levels carry.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {observedLevels} from '../src/levels.js';
import type {EnemySpec} from '../src/types.js';

const data=JSON.parse(fs.readFileSync(new URL('../data/native-paratroopa-beetle-spawns.json',import.meta.url),'utf8')) as {
 corrections:{level:string;area:string;match:{kind:string;x:number;y:number};replace:Partial<EnemySpec>}[];
 additions:{level:string;area:string;spec:EnemySpec}[];
};
const enemies=(level:string,area:string)=>observedLevels().find(l=>l.id===level)!.areas.find(a=>a.id===area)!.enemies;

test('every measured correction is present in the compiled levels',()=>{
 assert.ok(data.corrections.length>0);
 for(const c of data.corrections){
  const x=c.replace.x??c.match.x,y=c.replace.y??c.match.y;
  const spec=enemies(c.level,c.area).find(e=>e.kind===c.match.kind&&e.x===x&&e.y===y);
  assert.ok(spec,`${c.level} ${c.match.kind} x${x} y${y}`);
  for(const [key,value] of Object.entries(c.replace))assert.deepEqual((spec as unknown as Record<string,unknown>)[key],value,`${c.level} ${c.match.kind} x${x} ${key}`);
 }
});

test('native-only Paratroopas and Beetles are added with their measured spawn camera and vertical state',()=>{
 assert.ok(data.additions.length>0);
 for(const a of data.additions){
  const spec=enemies(a.level,a.area).find(e=>e.kind===a.spec.kind&&e.x===a.spec.x&&e.y===a.spec.y);
  assert.ok(spec,`${a.level} ${a.spec.kind} x${a.spec.x} y${a.spec.y}`);
  assert.deepEqual({...spec,evidence:undefined},{...a.spec,evidence:undefined});
 }
});

test('Paratroopa and Beetle specs sit on the floor they were measured on, not on screenshot heights',()=>{
 // 2-1: the Paratroopas measured at screenshot height y160 first appear natively at floor level with a fitted fall fraction.
 const twoOne=enemies('2-1','main').filter(e=>e.kind==='paratroopa');
 assert.ok(twoOne.length>=3);assert.equal(twoOne.filter(e=>e.y===160).length,0);
 assert.ok(twoOne.every(e=>e.spawnYFraction!==undefined));
});
