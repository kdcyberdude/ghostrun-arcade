import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import manifest from '../assets/graphics/graphics-manifest.json';
import {Simulation} from '../src/simulation.js';
import optionalRooms from '../data/optional-rooms.json';

const levels=observedLevels();
const ids=new Set(manifest.metatiles.map(t=>t.id));

test('campaign contains 32 distinct ordered maps with valid connected rooms and exits',()=>{
 assert.deepEqual(levels.map(l=>l.id),Array.from({length:32},(_,i)=>`${Math.floor(i/4)+1}-${i%4+1}`));
 const geometries=new Set();
 for(const level of levels){
  assert.ok(level.areas.some(a=>a.id===level.main));
  assert.equal(new Set(level.areas.map(a=>a.id)).size,level.areas.length);
  assert.ok(level.time===300||level.time===400);
  assert.ok(level.areas.some(a=>a.exit?.kind===(level.id.endsWith('-4')?'axe':'flag')),level.id);
  for(const area of level.areas){
   assert.ok(area.width>=256);assert.equal(area.spawn.length,2);
   const cells=new Set();
   for(const tile of area.tiles){
    assert.equal(tile.length,3);assert.ok(tile.every(Number.isInteger));assert.ok(ids.has(tile[2]));
    const key=`${tile[0]},${tile[1]}`;assert.ok(!cells.has(key),`${level.id}/${area.id} duplicate ${key}`);cells.add(key);
   }
   for(const pipe of area.pipes??[]){
    const destination=pipe.targetLevel?levels.find(l=>l.id===pipe.targetLevel):level;
    assert.ok(destination?.areas.some(a=>a.id===pipe.to),`${level.id} unknown pipe destination`);
   }
   if(area.exit?.kind==='axe'){
    assert.equal(area.exit.y,128);assert.ok(area.exit.retainerX!>area.exit.x);assert.ok(area.exit.stopX!<area.exit.retainerX!);
    // Every castle's 208px bridge was directly verified by the screenshot extractor.
    assert.equal(area.tiles.filter(t=>t[2]===137).length,13);
   }
  }
  geometries.add(JSON.stringify(level.areas.map(a=>({tiles:a.tiles,enemies:a.enemies,palette:a.palette}))));
 }
 assert.equal(geometries.size,32,'complete level content must be distinct, including shared entrance scenes');
});

test('every recorded area and campaign exit has a structural route from its level entry',()=>{
 // Graph reachability does not prove that a player can physically traverse an edge.
 for(const level of levels){
  const areas=new Map(level.areas.map(area=>[area.id,area]));
  const reachable=new Set([level.main]);const pending=[level.main];
  while(pending.length){
   const area=areas.get(pending.pop()!)!;
   const targets=[...(area.pipes??[]).filter(pipe=>!pipe.targetLevel).map(pipe=>pipe.to),...(area.vines??[]).flatMap(vine=>vine.to?[vine.to]:[]),...(area.fallExit?[area.fallExit.to]:[])];
   for(const target of targets){
    assert.ok(areas.has(target),`${level.id}/${area.id} points to missing ${target}`);
    if(!reachable.has(target)){reachable.add(target);pending.push(target);}
   }
  }
  assert.deepEqual([...areas.keys()].filter(id=>!reachable.has(id)),[],`${level.id} unreachable areas`);
  assert.ok(level.areas.some(area=>reachable.has(area.id)&&area.exit?.kind===(level.id.endsWith('-4')?'axe':'flag')),`${level.id} unreachable exit`);
 }
});

test('fresh campaign reset cannot inherit a bonus-room return position',()=>{
 const sim=new Simulation(levels);sim.reset(true);
 assert.equal(sim.level.id,'1-1');assert.equal(sim.area.id,'main');assert.equal(sim.player.x,40);assert.equal(sim.player.y,208);assert.equal(sim.camera,0);
});

test('underground masonry uses solid brick semantics while outdoor castle walls stay decorative',()=>{
 const level=levels.find(l=>l.id==='1-2')!;
 const area=level.areas.find(a=>a.id==='area-2')!;
 assert.equal(area.tiles.filter(t=>t[2]===71).length,0);
 const brick=area.tiles.find(t=>t[2]===82&&t[1]===9&&t[0]>30)!;
 assert.ok(brick,'observed suspended brick floor must exist');
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea(area.id,[brick[0]*16,brick[1]*16-2]);
 sim.player.vy=3;sim.player.grounded=false;sim.step([],1);
 assert.equal(sim.player.y,brick[1]*16);assert.equal(sim.player.grounded,true);
 assert.ok(levels.find(l=>l.id==='2-1')!.areas[0].tiles.some(t=>t[2]===71));
});

test('each automatic entry scene reaches its actual connected room under ordinary neutral input',()=>{
 // These are isolated transition fixtures, not claimed campaign traversals.
 for(const level of levels.filter(l=>l.areas.find(a=>a.id===l.main)?.autoWalk)){
  const sim=new Simulation([level]);sim.reset(true);const destination=sim.area.pipes![0].to;
  sim.step([],400);assert.equal(sim.area.id,destination,level.id);assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
 }
});

test('observed optional rooms retain their actual entry and return connections',()=>{
 for(const room of optionalRooms.rooms){
  const level=levels.find(l=>l.id===room.level)!;
  const area=level.areas.find(a=>a.id===room.id)!;assert.ok(area,room.level);
  assert.ok(area.tiles.length>=90);
  for(const connection of room.connections){
   const source=level.areas.find(a=>a.id===connection.from)!;
   const pipe=source.pipes?.find(p=>p.to===connection.to);assert.ok(pipe,`${room.level}/${connection.from}`);
   if(connection.to===room.id&&room.role==='optional-coin-room')assert.deepEqual(pipe.spawn,[24,64.5]);
   // 4-2 coin room return: the image registration (2120) is 16 px right of the native first-row x 2104 (tests/coin-room-return-spawn.test.ts)
   else {assert.equal(pipe.spawn[0],room.level==='4-2'&&connection.to==='area-3'?2104:connection.target.x);assert.ok(Math.abs(pipe.spawn[1]-connection.target.feetY)<=2);}
  }
 }
});

test('compiled mazes use measured stream repeats and water entry targets use fitted falling spawns',()=>{
 assert.equal(levels.find(l=>l.id==='4-4')!.areas[0].mazes?.length,1);
 assert.equal(levels.find(l=>l.id==='7-4')!.areas[0].mazes?.length,2);
 for(const id of ['2-2','7-2']){
  const level=levels.find(l=>l.id===id)!,water=level.areas.find(a=>a.theme==='water')!;
  assert.deepEqual(water.spawn,[40,32.875]);assert.equal(water.waterEntryFall,true);
  assert.deepEqual(level.areas.find(a=>a.pipes?.some(p=>p.to===water.id))!.pipes!.find(p=>p.to===water.id)!.spawn,water.spawn);
 }
 const repeated=levels.find(l=>l.id==='8-4')!.areas.find(a=>a.maze)!;
 assert.ok(repeated.enemies.every(e=>e.x<repeated.width));
 assert.ok(levels.some(l=>l.areas.some(a=>(a.cannons?.length??0)>0)));
});
