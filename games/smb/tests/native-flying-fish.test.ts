import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {NativeRandom} from '../src/native-random.js';
import {observedLevels} from '../src/levels.js';
import flyingFish from '../data/native-flying-fish.json';
import type {Area,GeneratorSpec,Level,Tile} from '../src/types.js';

// Native leaping Cheep Cheep (object id 20), rows of a read-only trace of the recorded route: 2-3 slot 1, first row 17025, Mario x 424 (the
// fish appeared at Mario's x minus 32 and moves right at 1.875 px/frame). Samples are every sixth row: [native x - first x, native y].
const NATIVE_2_3_ROW_17025:[number,number][]=[[0,248],[11,219],[22,192],[33,166],[45,143],[56,122],[67,103],[78,85],[90,69],[101,56],[112,44],[123,34],[135,26],[146,21],[157,18],[168,17],
 [180,17],[191,20],[202,24],[213,30],[225,38],[236,48],[247,61],[258,75],[270,91],[281,109],[292,129],[303,151],[315,175],[326,201],[337,229]];

// Launch rows of model-play runs and standing branch probes: random = RAM 0x7A7-0x7AD on the launch row, speed = RAM 0x57, wait = RAM 0x78F.
const NATIVE_LAUNCHES=[
 {run:'2-3 mood0 row 198',slot:0,speed:40,random:'5ebc01797b897e',offset:128,vx:1.5,wait:16},
 {run:'2-3 mood0 row 214',slot:1,speed:40,random:'57f15ebc01797b',offset:-64,vx:2.125,wait:32},
 {run:'2-3 mood0 row 663',slot:0,speed:32,random:'438304020a0e1a',offset:160,vx:1.25,wait:72},
 {run:'2-3 mood0 row 831',slot:2,speed:13,random:'4fe778b6472ba5',offset:-48,vx:1.75,wait:32},
 {run:'2-3 mood0 row 975',slot:1,speed:0,random:'eb6abc6911c3e0',offset:64,vx:-0.375,wait:16},
 {run:'2-3 mood0 row 1618',slot:0,speed:24,random:'8285808b8a9d88',offset:80,vx:1,wait:96},
 {run:'2-3 mood0 row 1730',slot:2,speed:24,random:'a5c08b0a1c0830',offset:112,vx:0.75,wait:32},
 {run:'2-3 mood0 row 1858',slot:0,speed:19,random:'0937254b019794',offset:-80,vx:2,wait:72},
 {run:'2-3 mood3 row 660',slot:0,speed:40,random:'1c1820105070d0',offset:-32,vx:1.875,wait:16},
 {run:'7-3 mood0 row 1688',slot:0,speed:0,random:'73856268ac7d25',offset:64,vx:-0.875,wait:96},
 {run:'7-3 mood0 row 1784',slot:1,speed:236,random:'099182a1a4e7ae',offset:-64,vx:2.125,wait:32},
 {run:'7-3 standing probe row 444',slot:1,speed:0,random:'f37096775bb502',offset:112,vx:-0.875,wait:32},
 {run:'7-3 standing probe row 524',slot:0,speed:0,random:'395b299fccf36a',offset:-64,vx:0.3125,wait:72},
];
const bytesOf=(hex:string)=>hex.match(/../g)!.map(h=>parseInt(h,16));

function fixture(generator:Partial<GeneratorSpec>={}){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:1024,palette:0,theme:'ground',tiles,enemies:[],spawn:[500,208],evidence:'Synthetic flying fish fixture',generators:[{kind:'flyingFish',from:0,to:1024,interval:80,fromCamera:0,maxFish:3,...generator}]};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}
// One frenzy step on a native launch row, with the lower slots taken by placeholder fish.
function launch(sim:Simulation,row:typeof NATIVE_LAUNCHES[number]){
 const s=sim as any;
 for(let slot=0;slot<row.slot;slot++)sim.enemies.push({...s.makeEnemy({kind:'cheep',x:0,y:0}),active:true,enemySlot:slot});
 sim.random.bytes=bytesOf(row.random);sim.player.vx=(row.speed<128?row.speed:row.speed-256)/16;s.fishTimer=0;
 s.updateFishFrenzy(sim.area.generators![0]);
 return sim.enemies[row.slot];
}

test('the random register steps like the native one',()=>{
 const random=new NativeRandom();
 // consecutive native rows of the 3-1 probe; every 8 frames each byte moves on one place
 random.bytes=bytesOf('bdc2b93c4e36aa');random.tick();assert.deepEqual(random.bytes,bytesOf('dee15c9e271b55'));
 random.bytes=bytesOf('5ebc01797b897e');for(let i=0;i<16;i++)random.tick();
 assert.deepEqual(random.bytes.slice(2),bytesOf('5ebc01797b'));
});

for(const row of NATIVE_LAUNCHES)test(`a flying fish launches as native on ${row.run}`,()=>{
 const sim=fixture(),fish=launch(sim,row);
 assert.equal(fish.x-sim.player.x,row.offset);assert.equal(fish.vx,row.vx);assert.equal(fish.y,272);assert.equal((sim as any).fishTimer,row.wait); // native y 248 + 24
});

test('a launched fish follows the native arc and speed and is gone after 187 frames',()=>{
 const sim=fixture(),fish=launch(sim,NATIVE_LAUNCHES[8]),x0=fish.x;
 sim.step([],1);
 NATIVE_2_3_ROW_17025.forEach(([dx,y],index)=>{
  if(index)sim.step([],6);
  assert.ok(Math.abs(fish.x-x0-dx)<=1,`row +${index*6}: x ${fish.x-x0} vs ${dx}`);
  assert.ok(Math.abs(fish.y-24-y)<=2,`row +${index*6}: y ${fish.y-24} vs ${y}`);
 });
 sim.step([],20);assert.ok(fish.dead>0);
});

test('a full frenzy launches nothing but still draws its next wait from the first free slot',()=>{
 // 2-3: three fish in flight, first free slot 3: no launch, wait from byte 4
 const sim=fixture(),before=launch(sim,{run:'blocked',slot:3,speed:40,random:'00000000030000',offset:0,vx:0,wait:0});
 assert.equal(before,undefined);assert.equal(sim.enemies.length,3);assert.equal((sim as any).fishTimer,72);
});

test('the wait counts down to the next launch and the frenzy starts at its camera',()=>{
 const sim=fixture({fromCamera:1000}),s=sim as any;
 s.updateFishFrenzy(sim.area.generators![0]);assert.equal(sim.enemies.length,0);
 sim.area.generators![0].fromCamera=0;s.fishTimer=2;
 s.updateFishFrenzy(sim.area.generators![0]);assert.equal(sim.enemies.length,0);
 s.updateFishFrenzy(sim.area.generators![0]);assert.equal(sim.enemies.length,1);
});

test('compiled bridge levels carry the native frenzy limits',()=>{
 for(const a of flyingFish.areas){
  const g=observedLevels().find(l=>l.id===a.level)!.areas.find(x=>x.id===a.area)!.generators!.find(x=>x.kind==='flyingFish')!;
  assert.equal(g.fromCamera,a.fromCamera);assert.equal(g.maxFish,a.maxFish);
 }
});

// The route comparison replays the recorded launches.
function recorded(generator:Partial<GeneratorSpec>){const sim=fixture({maxFish:undefined,schedule:[[3,1]],...generator});sim.recordedRoute=true;return sim;}
test('a scheduled flying fish launches at its recorded frame at Mario x plus the class offset',()=>{
 const sim=recorded({});
 sim.step([],2);assert.equal(sim.enemies.length,0);
 sim.step([],1);assert.equal(sim.enemies.length,1);
 assert.equal(sim.enemies[0].x,sim.player.x+flyingFish.rules.classes[1].offsetX);assert.equal(sim.enemies[0].y,272);
});
test('the schedule repeats every period for a slower run',()=>{
 const sim=recorded({schedule:[[3,0],[10,3]],period:100});
 sim.step([],120);assert.equal(sim.enemies.length,4);
 assert.deepEqual(sim.enemies.map(e=>e.vx),[2.125,1.25,2.125,1.25]);
});
test('compiled bridge levels carry the recorded native launch schedules',()=>{
 for(const s of flyingFish.schedules){
  const g=observedLevels().find(l=>l.id===s.level)!.areas.find(a=>a.id===s.area)!.generators!.find(g=>g.kind==='flyingFish')!;
  assert.deepEqual(g.schedule,s.events);assert.equal(g.period,s.period);
 }
 assert.equal(flyingFish.schedules.reduce((n,s)=>n+s.events.length,0),34);
});

// Free play, 2-3 / 7-3 level checkpoints: the first native launch is exactly 2 rows after the first row with camera >= 64 (42 of 42 runs, explore-r1/r2/r3,
// evidence/leaper3-findings-20261111.md); the old 68 made up for a model-local seeding that fed the first control row and ran the remake one row ahead
// (evidence/levelstart-lead-findings-20261111.md). An activated koopa/paratroopa holds its native slot, so a later fish sees the real free slot.
test('the frenzy starts at camera 64 in 2-3 and 7-3, and an active enemy takes its slot on activation',()=>{
 for(const level of ['2-3','7-3'])assert.equal(flyingFish.areas.find(a=>a.level===level)!.fromCamera,64);
 const sim=fixture(),s=sim as any;
 const koopa=sim.enemies[sim.enemies.push(s.makeEnemy({kind:'koopa',x:600,y:208}))-1];koopa.active=true;
 s.updateFishFrenzy(sim.area.generators![0]);
 assert.equal(koopa.enemySlot,0);
 assert.equal(sim.enemies.filter(e=>e.kind==='cheep')[0].enemySlot,1);
});

// Native 0x71F/0x78F (evidence/leaper3-findings-20261111.md): the timer is not read on the row after the camera crosses a multiple of 32 px; a wait expiring there
// launches one row late (15 of 15). Native level start: camera 61, 64 (crossing), first launch on the 2nd row after it (42 of 42 runs).
test('the fish timer is skipped on the row the camera crosses a multiple of 32, so the first launch comes 2 rows after camera 64',()=>{
 const sim=fixture({fromCamera:64}),s=sim as any,gen=sim.area.generators![0];
 const row=(camera:number)=>{sim.camera=camera;s.updateFishFrenzy(gen);return sim.enemies.length;};
 assert.equal(row(61),0);assert.equal(row(64),0);assert.equal(row(66),1);
 const later=fixture(),t=later as any,g=later.area.generators![0];
 const step=(camera:number)=>{later.camera=camera;t.updateFishFrenzy(g);return later.enemies.length;};
 t.fishTimer=3;
 assert.equal(step(90),0);assert.equal(step(93),0);assert.equal(t.fishTimer,1);
 assert.equal(step(96),0);assert.equal(t.fishTimer,0); // expires on the crossing row: not read
 assert.equal(step(98),1);
});
