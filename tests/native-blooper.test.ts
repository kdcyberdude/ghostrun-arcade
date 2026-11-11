import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import water from '../data/native-water-actors.json';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

// Native Blooper of 2-2 (read-only trace of the recorded route, slot 0 from row 12527): [frames since it appeared, native x, native y].
// Two 24-frame strokes (32 px up and sideways in thirds of 1, 2, 1 px per frame), the second 32 frames after the first ended, and the sink between them.
const NATIVE_2_2_ROW_12527:[number,number,number][]=[[0,352,184],[6,351,183],[14,342,174],[22,327,159],[29,320,152],[32,320,153],[56,320,165],[61,320,166],
 [62,319,165],[70,310,156],[78,295,141],[85,288,134],[100,288,141],[125,288,152],[126,287,151]];

function fixture(enemy:Partial<EnemySpec>,playerX:number){
 const tiles:Tile[]=[];for(let x=0;x<64;x++)tiles.push([x,10,84]); // the player stands at feet y 160, level with the native cases (Blooper y - player y + 8 >= -16)
 const area:Area={id:'main',width:1024,palette:12,theme:'water',tiles,enemies:[{kind:'blooper',x:352,y:208,palette:'0f-0f-30-10',direction:-1,spawnCamera:0,stroke:{first:6,firstDir:-1},...enemy}],spawn:[playerX,160],evidence:'Synthetic water fixture'};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}

test('a measured Blooper strokes and sinks like the native one through two strokes',()=>{
 const sim=fixture({},100);
 sim.random.frame=1;sim.step([],1);const blooper=sim.enemies[0]; // step 1 = the frame it appeared (k 0), on native counter low bits 2
 let k=0;
 for(const [at,x,y] of NATIVE_2_2_ROW_12527){
  if(at>k){sim.step([],at-k);k=at;}
  assert.ok(Math.abs(blooper.x-x)<=1,`k ${at}: x ${blooper.x} vs ${x}`);
  assert.ok(Math.abs(blooper.y-24-y)<=1,`k ${at}: y ${blooper.y-24} vs ${y}`);
 }
});

// Native turns (2-2 and 7-2 model-play rows): with the low bits of random byte slot+1 clear an even slot turns toward Mario and an odd one follows his motion; otherwise it keeps going.
function turning(slot:number,playerX:number,bits:number){
 const sim=fixture({},playerX),s=sim as any;sim.step([],1);
 const blooper=sim.enemies[0];blooper.y=150;blooper.enemySlot=slot;blooper.nativeDir=-1;s.marioMotion=1;
 sim.random.bytes=[0,0,0,0,0,0,0];sim.random.bytes[slot+1]=bits;s.nativeBlooperTurn(blooper);return blooper.nativeDir;
}
test('a Blooper turns only when its random bits are clear: toward Mario in an even slot, with his motion in an odd one',()=>{
 assert.equal(turning(0,500,0),1);assert.equal(turning(0,100,0),-1);assert.equal(turning(1,100,0),1);
 assert.equal(turning(0,500,1),-1);assert.equal(turning(1,100,32),-1);assert.equal(turning(0,500,64),1); // 2-2 mask 63: bit 6 does not stop a turn
});

test('a Blooper starts its first stroke on the 8-frame tick of the frame counter',()=>{
 for(const [frame,first] of [[2,6],[7,1],[0,8]] as const){ // native rows 2-2: counter low bits on the first row, frames until the stroke
  const sim=fixture({},100);sim.random.frame=(frame-1)&255;sim.step([],1);const b=sim.enemies[0],y=b.y;
  sim.step([],first-1);assert.equal(b.y,y,`frame ${frame}: still before the stroke`);
  sim.step([],1);assert.equal(b.y,y-1,`frame ${frame}: stroke at ${first}`);
 }
});

test('the compiled measured water areas carry a stroke start for every Blooper',()=>{
 const bloopers=water.areas.flatMap(a=>a.enemies.filter(e=>e.kind==='blooper'));
 assert.equal(bloopers.length,5+12+3);
 assert.ok(bloopers.every(b=>(b as {stroke?:{first:number}}).stroke!==undefined));
});
