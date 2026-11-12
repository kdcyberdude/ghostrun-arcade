import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import type {Level} from '../src/types.js';

// 8-4 main past the exit pipe (native collision map RAM 0x500-0x69f and enemy slots, explore-r4 8-4/mood5 replayed from the
// level checkpoint, unrolled +1024 per wrap; data/eight-four-native-alignment.json main.continuation): the stream continues to
// column 95 and then repeats columns 32-95 (1024 px) for every further lap, enemies included.
const level=()=>structuredClone(observedLevels().find(l=>l.id==='8-4')!);

function standing(spawn:[number,number],frames=6){
 const l:Level=level();l.main='main';const a=l.areas.find(x=>x.id==='main')!;a.spawn=spawn;a.camera=Math.max(0,spawn[0]-112);a.entryFall=undefined;a.spawnVelocity=[0,0];
 const sim=new Simulation([l]);sim.reset(true);sim.step([],frames);return sim;
}

test('8-4 main continues past the exit pipe and repeats columns 32-95 every 1024 px',()=>{
 const main=level().areas.find(a=>a.id==='main')!;
 assert.equal(main.width,1536);assert.deepEqual([main.maze!.loopTo,main.maze!.loopAt],[512,1536]);
});

// Native loop command (world 8, page 6): the corridor is not unrolled; every lap moves Mario and the screen back 1024 px (ExecGameLoopback), so a
// lap-2/3 row at unrolled x u stands at u - 1024 k on the same columns (tests/native-transitions.test.ts).
const rolled=(x:number)=>{while(x>=1536)x-=1024;return x;};
test('8-4 main: native standing rows past the exit pipe and in laps 2 and 3 are supported',()=>{
 // [unrolled x, feet] of native rows with vy 0 and the same y for three rows (mood5 rows 688, 723, 1371, 1529, 2024, 2100, 2220, 2503).
 for(const [x,feet] of [[1363,160],[1440,112],[2048,160],[2273,160],[2466,112],[2534,160],[2753,208],[2872,176]] as [number,number][]){
  const sim=standing([rolled(x),feet]);
  assert.equal(sim.player.y,feet,`feet at unrolled x ${x}`);assert.equal(sim.player.grounded,true,`grounded at unrolled x ${x}`);
 }
});

test('8-4 main: the Piranha pipes of the repeated columns (native 824/1304/1448, and 1848/2328/2472/2872 unrolled) stay in the one corridor',()=>{
 const sim=standing([rolled(2753),208],4);
 const piranhas=(sim as unknown as {area:{enemies:{kind:string;x:number}[]}}).area.enemies.filter(e=>e.kind==='piranha').map(e=>e.x);
 for(const x of [1848,2328,2472,2872])assert.ok(piranhas.includes(rolled(x)),`piranha at ${x} (rolled ${rolled(x)})`);
 assert.ok(piranhas.every(x=>x<1536),'no unrolled copies');
});
