import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import native from './fixtures/native-three-one-goomba-group.json';

function fixture(occupied:number){
 const level=structuredClone(observedLevels().find(l=>l.id==='3-1')!),area=level.areas.find(a=>a.id===level.main)!;
 const group=area.enemies.filter(e=>e.kind==='goomba'&&e.spawnCamera===595);
 area.enemies=[...Array.from({length:occupied},(_,i)=>({kind:'piranha' as const,x:700+i*24,y:184,direction:-1 as const})),...group];
 area.cannons=[];area.generators=[];area.firebars=[];area.platforms=[];
 const sim:any=new Simulation([level]);sim.reset(true);sim.loadArea(area.id,[720,120],595);sim.phase='play';sim.player.invincible=100000;
 return sim;
}

test('3-1 native group contains three Goombas, with the last member conditional on a free slot',()=>{
 for(const sample of native.births){
  const before=sample.rows[0].enemies,after=sample.rows[1].enemies;
  const occupied=before.length,expected=after.filter(e=>e.id===6&&e.x>=840&&e.x<=900).length;
  const sim=fixture(occupied);sim.step([],1);
  const group=sim.enemies.filter((e:any)=>e.kind==='goomba');
  assert.deepEqual(group.map((e:any)=>e.originX),[849,873,897]);
  assert.equal(group.filter((e:any)=>e.active).length,expected,`native mood${sample.mood}`);
  assert.ok(group.filter((e:any)=>e.active).every((e:any)=>e.age===1),'members are born together');
  if(expected===2)assert.equal(group[2].slotLost,true,'full group does not create its third member later');
 }
});

test('the omitted third Goomba supplies the native stomp at 3-1 mood0 row453',()=>{
 const sim=fixture(2);sim.step([],1);
 const third=sim.enemies.find((e:any)=>e.originX===897);assert.ok(third?.active);
 for(const e of sim.enemies)if(e!==third){e.active=false;e.dead=100;}
 const before=native.stomp['452'],contact=native.stomp['453'];
 Object.assign(third,{x:867,y:208,vx:-0.5,vy:0});
 Object.assign(sim.player,{x:contact.x,y:contact.feet,vy:before.vy,grounded:false});
 sim.broClock=609;sim.updateEnemies(before.feet);
 assert.equal(third.squashed,true);assert.equal(sim.player.vy,contact.vy);
 assert.ok(sim.events.includes('sfx_stomp'));
});
