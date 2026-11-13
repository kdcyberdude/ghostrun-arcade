import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation,swimBobOffset} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import water from '../data/native-water-actors.json';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

// Native swimming Cheep Cheeps of 2-2 (read-only trace of the recorded route): [frames since the fish appeared, native y]. They move 1 px every 8 frames,
// 15 steps in the first leg and 30 in every later one, one frame more at each turn.
const BOB_UP_FIRST={y0:56,first:1,dir:-1,samples:[[0,56],[1,55],[9,54],[57,48],[113,41],[114,42],[122,43],[202,53]]}; // row 13366
const BOB_DOWN_FIRST={y0:40,first:8,dir:1,samples:[[0,40],[8,41],[120,55],[121,54],[353,25],[354,26],[586,55],[587,54],[820,26]]}; // row 13999

test('a bobbing swimming fish follows the native height at every sampled frame, long after the first leg',()=>{
 for(const c of [BOB_UP_FIRST,BOB_DOWN_FIRST])
  for(const [k,y] of c.samples)assert.equal(c.y0+swimBobOffset({dir:c.dir,first:c.first},k),y,`k ${k}`);
 assert.equal(swimBobOffset(undefined,300),0);
});

function fixture(enemy:Partial<EnemySpec>){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:1024,palette:12,theme:'water',tiles,enemies:[{kind:'cheep',x:400,y:100,palette:'0f-10-30-27',direction:-1,spawnCamera:0,...enemy}],spawn:[200,208],evidence:'Synthetic water fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.camera=100;sim.player.invincible=100000;return sim;
}

test('native swimming slot 0 holds height; slot 2 bobs from its fraction and random direction',()=>{
 const flat=fixture({swim:{}});flat.step([],200);
 assert.equal(flat.enemies[0].y,100);assert.equal(flat.enemies[0].x,400-0.25*200);
 const bob=fixture({swim:{bob:{dir:-1,first:1}}});bob.enemies[0].active=true;bob.enemies[0].enemySlot=2;bob.random.bytes=[0,0,0,0,0,0,0];
 bob.step([],113);assert.equal(bob.enemies[0].y,100-15);bob.step([],1);assert.equal(bob.enemies[0].y,100-14);
 const legacy=fixture({});legacy.step([],16);assert.equal(legacy.enemies[0].y,100+Math.sin(16/40)*24); // unmeasured fish keep the old motion
});

test('a fish with a spawn frame waits for it even when the camera condition holds',()=>{
 const sim=fixture({swim:{},spawnFrame:50});
 sim.step([],49);assert.equal(sim.enemies[0].active,false);
 sim.step([],1);assert.equal(sim.enemies[0].active,true);
});

test('measured water areas carry the native populations',()=>{
 const counts:Record<string,number>={'8-4/area-4':3,'2-4/main':2,'4-4/main':1,'5-4/main':6,'3-4/main':6,'6-4/main':3,'7-4/main':2,'8-4/area-5':1};
 for(const entry of water.areas){
  const area=observedLevels().find(l=>l.id===entry.level)!.areas.find(a=>a.id===entry.area)!;
  const fish=area.enemies.filter(e=>entry.replaceKinds.includes(e.kind));
  assert.equal(fish.length,counts[`${entry.level}/${entry.area}`]);assert.equal(fish.length,entry.enemies.length);
  for(const spec of entry.enemies)assert.ok(fish.some(e=>e.kind===spec.kind&&e.x===spec.x&&e.y===spec.y&&e.spawnCamera===spec.spawnCamera));
 }

});
