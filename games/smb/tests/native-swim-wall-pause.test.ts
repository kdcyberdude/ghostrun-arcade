import {test} from 'node:test';
import assert from 'node:assert/strict';
import excerpts from './fixtures/native-swim-wall-pause.json';
import branches from './fixtures/native-swim-wall-branches.json';
import {Simulation} from '../src/simulation.js';
import {NativeWater} from '../src/native-water.js';
import {observedLevels} from '../src/levels.js';
import type {Button} from '../src/types.js';

const names:Button[]=['up','down','left','right','a','b','start','select'];
const buttons=(mask:number)=>names.filter((_,i)=>mask&(1<<i));
for(const excerpt of excerpts)test(`swimming wall back-out keeps the native pause: ${excerpt.source} row ${excerpt.release}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id===excerpt.level)!);
 level.main=excerpt.area;
 const area=level.areas.find(a=>a.id===excerpt.area)!;
 area.enemies=[];area.waterEntryFall=false;area.entryFall=undefined;
 const sim:any=new Simulation([level]);sim.reset(true);sim.step([],1);
 const [seed,...rows]=excerpt.rows;
 Object.assign(sim.player,{x:seed.x+seed.sub/256,y:seed.y+32,vx:seed.vx/4096,vy:seed.S+seed.F/256,grounded:seed.ground});
 sim.camera=Math.max(0,seed.x-112);sim.swimLock=0;sim.swimFreshA=false;
 sim.seedSwim({speed:seed.S,force:seed.F,frac:seed.D,rise:seed.rise,fall:seed.fall,timer:seed.T});
 sim.water.moving=1;sim.water.lastDirection=1;
 sim.water.motor.facing=1;sim.water.motor.moving=1;
 if('frame' in excerpt)sim.frame=excerpt.frame;
 if('whirl' in excerpt)sim.water.whirl=excerpt.whirl;
 sim.previous=new Set(buttons(seed.mask));
 sim.inputs=[new Set(buttons(rows[0].mask)),new Set(buttons(rows[1].mask))];
 for(const [i,row]of rows.entries()){
  sim.step(buttons(rows[i+2]?.mask??0),1);
  assert.equal(Math.round(sim.player.vx*4096),row.vx,`native speed row ${row.i}`);
  assert.equal(sim.player.x,row.x+row.sub/256,`native x row ${row.i}`);
  if('whirl' in excerpt)assert.equal(sim.player.y,row.y+32,`native y row ${row.i}`);
 }
});

for(const branch of branches.cases)test(`native swimming wall-pause input branch: ${branch.name}`,()=>{
 // Branches from native7-2 r8/mood0 after row833, the final back-out row. Neutral
 // frames consume the pause; a turn away acts immediately and drops the residue.
 const water=new NativeWater();water.moving=1;water.lastDirection=1;
 water.motor.facing=1;water.motor.moving=1;
 water.wall(branches.initial.vx);
 const actual=branch.pads.map(mask=>water.horizontal(((mask&8?1:0)-(mask&4?1:0)) as -1|0|1,false));
 assert.deepEqual(actual,branch.rows.map(row=>row.vx));
});
