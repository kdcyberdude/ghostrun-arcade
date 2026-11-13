import {test} from 'node:test';
import assert from 'node:assert/strict';
import plants from '../data/native-piranhas.json';
import births from './fixtures/native-pipe-births.json';
import {decodeNativePipes} from '../tools/harness/native-pipes.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Level} from '../src/types.js';

test('every retained native Piranha birth comes from its ROM pipe column and row',()=>{
 assert.equal(births.births.length,140);
 for(const b of births.births){
  const matched=plants.areas.some(a=>a.level===b.level&&a.source.some(s=>s.pointer===b.pointer&&a.plants.some(p=>p.x-s.offset*16===b.x&&p.y===b.y)));
  assert.ok(matched,`${b.level} row${b.row} x${b.x}`);assert.equal(b.down,b.y);assert.equal(b.up,b.y-24);
 }
});

test('native ROM pipe decoder applies page selection and both warp/decorative pipe encodings',()=>{
 const rom=new Uint8Array(64).fill(0xfd);rom.set([0x0d,2,0x48,0x71,0x7a,0xf9,0xfd],16);
 assert.deepEqual(decodeNativePipes(rom,0x8000),[{x:584,y:160,offset:2,bytes:[0x48,0x71]},{x:888,y:192,offset:4,bytes:[0x7a,0xf9]}]);
});

test('parser-created plants expose native hidden state on the birth row without moving',()=>{
 for(const b of births.births){
  const level:Level={id:'native-pipe-fixture',time:400,main:'main',evidence:'Native parser birth component',areas:[{id:'main',width:b.x+1000,theme:'ground',palette:0,evidence:'Native parser birth component',tiles:[],enemies:[{kind:'piranha',x:b.x,y:b.y+24}],spawn:[40,208]}]};
  const sim:any=new Simulation([level]);sim.reset(true);const plant=sim.enemies[0];
  for(const [slot,flag]of b.flags.entries())if(flag&&slot!==b.slot){const e=sim.makeEnemy({kind:'goomba',x:b.camera+100,y:208});Object.assign(e,{active:true,enemySlot:slot});sim.enemies.push(e);}
  if(b.level==='8-3'&&b.row===254){const erased=sim.makeEnemy({kind:'bullet',x:b.camera-75,y:176});Object.assign(erased,{active:true,dead:100,enemySlot:b.slot});sim.enemies.push(erased);}
  sim.camera=b.camera;sim.piranhaColumns.through=b.x;sim.birthParserPiranhas();
  assert.deepEqual([plant.active,plant.enemySlot,plant.age,plant.y],[true,b.slot,0,b.y+24],`${b.level} row${b.row}`);
  assert.deepEqual(plant.pir,{y:b.y,speed:1,flag:0,up:b.up,down:b.down,timer:0});
 }
});

test('source pipe actors replace sighting heights and include pipes not visited with a free slot',()=>{
 for(const a of plants.areas){const area=observedLevels().find(l=>l.id===a.level)!.areas.find(ar=>ar.id===a.area)!;
  assert.deepEqual(area.enemies.filter(e=>e.kind==='piranha').map(e=>[e.x,e.y]),a.plants.map(p=>[p.x,p.y+24]));}
 const area=observedLevels().find(l=>l.id==='5-2')!.areas.find(a=>a.id==='area-2')!;
 assert.equal(area.enemies.find(e=>e.kind==='piranha'&&e.x===888)!.y,184);assert.equal(area.enemies.find(e=>e.kind==='piranha'&&e.x===2776)!.y,200);
});
