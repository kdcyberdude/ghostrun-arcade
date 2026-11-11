import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import corrections from '../data/walker-corrections.json';

// Area D: walker direction/placement corrections measured from the native enemy slots of the recorded route (data/walker-corrections.json,
// applied by tools/compile-levels.mjs). Native walkers appear at the right screen edge walking left, in groups 24 px apart.
const area=(level:string,id='main')=>observedLevels().find(l=>l.id===level)!.areas.find(a=>a.id===id)!;
const walkers=['goomba','koopa','redKoopa'];

test('every walker correction and addition is present in the compiled levels',()=>{
 assert.ok(corrections.corrections.length>=17&&corrections.additions.length>=12);
 for(const c of corrections.corrections){
  const enemies=area(c.level,c.area).enemies;
  const replace=c.replace as unknown as Record<string,number>;
  assert.ok(enemies.some(e=>e.kind===c.match.kind&&Object.entries(replace).every(([k,v])=>(e as unknown as Record<string,unknown>)[k]===v)),`${c.level}/${c.area} ${c.match.kind} ${c.match.x}`);
 }
 for(const a of corrections.additions)assert.ok(area(a.level,a.area).enemies.some(e=>e.kind===a.spec.kind&&e.x===a.spec.x&&e.spawnCamera===a.spec.spawnCamera&&e.direction===-1),`${a.level}/${a.area} ${a.spec.kind} ${a.spec.x}`);
});

test('the 5-3 Goomba pair stands at the native x 704 and 736 with no spec at 672',()=>{
 const goombas=area('5-3').enemies.filter(e=>e.kind==='goomba'&&e.x<1000);
 assert.deepEqual(goombas.map(e=>e.x).sort((a,b)=>a-b),[704,736]);
 assert.ok(goombas.every(e=>e.direction===-1&&e.spawnCamera!==undefined));
});

test('the 3-2 Goomba trio appears together at x 1904, 1928 and 1952, all walking left',()=>{
 const trio=area('3-2').enemies.filter(e=>e.kind==='goomba'&&e.x>=1900&&e.x<=1960);
 assert.deepEqual(trio.map(e=>e.x).sort((a,b)=>a-b),[1904,1928,1952]);
 assert.ok(trio.every(e=>e.direction===-1&&e.spawnCamera===1647));
});

test('walkers specified inside a stair block appear above the step and walk away from it',()=>{
 // 2-1 Goomba 384, 3-1 Goomba 2240 and 3-1 Koopa 3008 were specified inside a stair block and never moved; natively they appear above the step and fall.
 const levels=observedLevels();
 for(const [level,kind,x,y] of [['2-1','goomba',384,112],['3-1','goomba',2240,128],['3-1','koopa',3008,112]] as const){
  const index=area(level).enemies.findIndex(e=>e.kind===kind&&e.x===x);
  assert.ok(index>=0,`${level} ${kind} ${x} present`);
  const spec=area(level).enemies[index];assert.equal(spec.y,y);
  const sim=new Simulation(levels);sim.reset(true);sim.levelIndex=levels.findIndex(l=>l.id===level);
  const camera=spec.spawnCamera??x-303;sim.loadArea('main',[camera+112,208],camera);sim.player.invincible=100000;
  // Mario is held above the screen at a fixed x so that the camera stays put and a pit under his start cannot end the attempt.
  for(let i=0;i<120;i++){sim.player.x=camera+112;sim.player.y=40;sim.player.vy=0;sim.step([],1);}
  const enemy=sim.enemies[index];
  assert.ok(enemy.active,`${level} ${kind} ${x} active`);
  assert.ok(Math.abs(enemy.x-x)>=20,`${level} ${kind} ${x} walked to ${enemy.x}`);
 }
});

test('support tiles under standing native walkers exist in the 4-2 and 1-2 secondary areas',()=>{
 const key=(t:readonly number[])=>t.join(',');
 for(const t of corrections.terrain){
  const tiles=area(t.level,t.area).tiles.map(key);
  assert.ok(tiles.includes(key(t.tile)),`${t.level}/${t.area} tile ${key(t.tile)}`);
 }
 assert.deepEqual(corrections.terrain.filter(t=>t.level==='4-2').map(t=>t.tile),[[43,9,82]]);
 assert.equal(corrections.terrain.filter(t=>t.level==='1-2').length,6);
});

test('only the measured exceptions walk right when they appear',()=>{
 // 1-1 Goomba 640 and 7-1 Koopa 1009 were verified walking right natively; the 8-2 Koopas are calibrated separately. 3-1 Koopa 419 was a stomped Paratroopa (route row 21011, slot 1 id 14 -> 0 in place), so it is no spec any more.
 const right:string[]=[];
 for(const level of observedLevels())if(level.id!=='8-2')for(const a of level.areas)for(const e of a.enemies)if(walkers.includes(e.kind)&&e.direction===1)right.push(`${level.id} ${e.kind} ${e.x}`);
 assert.deepEqual(right.sort(),['1-1 goomba 640','7-1 koopa 1009']);
});
