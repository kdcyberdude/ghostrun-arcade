import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nativeSwimCheepPick,Simulation} from '../src/simulation.js';
import waterActors from '../data/native-water-actors.json';
import type {Area,Level,Tile} from '../src/types.js';

// Native swimming Cheep Cheep spawns (ids 10/11) of two free-play model runs, first life: [random register RAM 0x7A7-0x7AD on the spawn row, slot, id, native y]
// (SWIMSPAWN=<level> in tools/campaign-compare.ts over evidence/local/model-play/explore-w0/{2-2,7-2}/mood{3,5}).
const W0_2_2_MOOD3:[string,number,number,number][]=[['efa47b33c5a229',0,11,120],['62a06525efa47b',1,10,72],['48d041e162a065',2,10,56],['17052b217735db',0,10,152],['a97220c4850c06',1,10,88],
 ['6b855258fc4db5',2,10,40],['d30caab3e6814c',0,11,104],['1082a3a6e1ac6f',1,10,168],['ff12ecc91082a3',2,11,40],['36365a3682efea',0,10,168],['28e6b77a14e0c9',2,11,120],['09d3c067e728e6',1,11,88],
 ['a7400e8e938ea9',0,10,72],['03090f1d03393f',2,10,56],['8003030503090f',1,10,104],['2f732dcb900727',0,10,152],['d65bf740ae2f73',2,11,120],['bd463cb0c9a83b',1,10,168],['aae5b07b1bedda',2,11,72],
 ['cb1086a7aae5b0',0,11,88],['867d718b687eae',1,10,104]];
const W0_7_2_MOOD5:[string,number,number,number][]=[['3e82fffa05f1fa',0,11,168],['43b7305e3e82ff',2,11,72],['e5905b7bcd3aa0',0,10,104],['ffec13cbec7ba3',0,10,120],['084e5ec27ffb04',2,11,56],
 ['be85f8f302e4e1',2,10,152],['d550fa5baf1846',0,10,88],['157f55ab005656',2,11,40],['dc59e152903515',0,10,40],['04c6cf42dc59e1',1,10,168],['44b8314123a1e6',2,11,56],['26b0fd9c675f91',0,11,120],
 ['741ef6cb26b0fd',1,11,72],['7ee21fdbe4539b',2,11,152],['a192d1f457bf10',0,11,88],['f6fb16e0cd0c96',1,10,104]];
const bytesOf=(hex:string)=>hex.match(/../g)!.map(h=>parseInt(h,16));

for(const [level,rows] of [['2-2',W0_2_2_MOOD3],['7-2',W0_7_2_MOOD5]] as const){
 test(`native ${level} swimming Cheep id and height follow random byte s and the eight-height bag`,()=>{
  let bag=0;
  for(const [hex,slot,id,y] of rows){
   const pick=nativeSwimCheepPick(bytesOf(hex)[slot],bag,level);
   assert.deepEqual([pick.id,pick.y],[id,y],`${level} ${hex} slot ${slot}`);bag=pick.bag;
  }
 });
}

function fixture(){
 const tiles:Tile[]=[];for(let x=0;x<256;x++)tiles.push([x,13,84]);
 const cheep={kind:'cheep' as const,x:1219,y:112,direction:-1,palette:'0f-10-30-27',spawnCamera:935,swim:{}};
 const area:Area={id:'area-2',width:4096,palette:0,theme:'water',tiles,enemies:[cheep],spawn:[1050,120],evidence:'Synthetic water fixture'};
 const level:Level={id:'2-2',time:400,main:'area-2',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}

test('native swimming Cheep generator: camera range, lowest free slot below 3, 32-frame timer, spawn at camera + 287',()=>{
 const sim=fixture(),s=sim as any,rule=waterActors.rules.swimCheepGenerator;
 s.camera=rule.levels['2-2'].fromCamera-1;s.updateSwimGenerator();
 assert.equal(sim.enemies.filter(e=>e.kind==='cheep').length,0,'the recorded route list is dropped in free play and nothing spawns before the start camera');
 s.camera=rule.levels['2-2'].fromCamera;sim.random.bytes=bytesOf(W0_2_2_MOOD3[0][0]);s.updateSwimGenerator();
 const first=sim.enemies.filter(e=>e.kind==='cheep');
 assert.equal(first.length,1);assert.equal(first[0].x,s.camera+287);assert.equal(first[0].y,120+24);assert.equal(first[0].enemySlot,0);assert.equal(first[0].palette,'0f-16-30-27');
 for(let k=1;k<32;k++)s.updateSwimGenerator();
 assert.equal(sim.enemies.length,1,'31 frames later the timer still runs');
 s.updateSwimGenerator();assert.equal(sim.enemies.length,2,'the next fish 32 frames after the last');assert.equal(sim.enemies[1].enemySlot,1);
 for(let k=0;k<32;k++)s.updateSwimGenerator();assert.equal(sim.enemies[2].enemySlot,2);
 for(let k=0;k<64;k++)s.updateSwimGenerator();assert.equal(sim.enemies.length,3,'slots 3 and 4 never take a swimming Cheep');
 s.camera=rule.levels['2-2'].toCamera+1;sim.enemies[0].dead=100;for(let k=0;k<64;k++)s.updateSwimGenerator();
 assert.equal(sim.enemies.filter(e=>!e.dead).length,2,'no spawn past the stop camera');
});

test('the recorded route keeps its replayed swimming Cheeps',()=>{
 const sim=fixture(),s=sim as any;sim.recordedRoute=true;s.camera=1000;s.updateSwimGenerator();
 assert.equal(sim.enemies.length,1);assert.equal(sim.enemies[0].active,false);
});
