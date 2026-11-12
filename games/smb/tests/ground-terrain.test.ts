import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('2-1 walkers stay on the two ground cells obscured by enemy toes during map extraction',()=>{
 for(const [col,origin,camera]of [[58,944,800],[88,1424,1280]]){
  const level=structuredClone(observedLevels().find(l=>l.id==='2-1')!);
  const main=level.areas.find(a=>a.id===level.main)!;
  // Start away from the walker in its actual map segment. No actor floor snap.
  main.spawn=[camera+32,208];main.camera=camera;
  main.enemies=[{kind:'goomba',x:origin,y:208,direction:-1}];
  assert.equal(main.tiles.find(t=>t[0]===col&&t[1]===13)?.[2],84);
  const sim=new Simulation([level]);sim.reset(true);
  for(let frame=0;frame<48;frame++){
   sim.step([],1);assert.equal(sim.enemies[0].y,208,`col${col},frame${frame+1}`);
  }
  assert.ok(sim.enemies[0].x<col*16);assert.equal(sim.phase,'play');
 }
});

test('the 2-1 pipe-top Goomba walks off its observed144px cap instead of remaining trapped inside',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='2-1')!);
 const main=level.areas.find(a=>a.id===level.main)!,actor=main.enemies.find(e=>e.kind==='goomba'&&e.x===1648)!;
 assert.equal(actor.y,144);main.enemies=[actor];main.spawn=[1400,208];main.camera=1390;
 const sim=new Simulation([level]);sim.reset(true);
 sim.step([],80);
 assert.equal(sim.enemies[0].y,208);assert.ok(sim.enemies[0].x<1640);assert.equal(sim.phase,'play');
});

test('1-3 keeps the original paratroopa and omits its two later falling sightings as separate spawns',()=>{
 const level=observedLevels().find(l=>l.id==='1-3')!,main=level.areas.find(a=>a.id===level.main)!;
 assert.equal(main.enemies.filter(e=>e.kind==='paratroopa'&&e.x===1184).length,1);
 assert.equal(main.enemies.filter(e=>e.kind==='redKoopa'&&[1200,1216].includes(e.x)).length,0);
});
