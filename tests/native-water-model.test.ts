import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {nativeWrapY,type NativePlatformObject} from '../src/platform-motion.js';
import type {Button} from '../src/types.js';

// Area water2: rows from replays of the model runs in 2-2 and 7-2 with full RAM (tools/harness/model-water-rows.mjs) and two branching probes of the reference
// process: S = speed byte 0x9f, F = force 0x433, D = fraction 0x416, T = timer 0x782, sub = x sub-pixel 0x400, vx = speed byte * 256 + 0x705. evidence/water2-findings-20261111.md.

type Seed={x:number;sub:number;y:number;vx:number;S:number;F:number;D:number;T:number;fall?:number};
/** A level whose water area is the start, past its first control frame, with a swimmer placed on a native row. */
function swimmer(id:string,area:string,s:Seed,previous:Button[],now:Button[],parity=0){
 const level=structuredClone(observedLevels().find(l=>l.id===id)!);level.main=area;
 const water=level.areas.find(a=>a.id===area)!;water.enemies=[];water.waterEntryFall=false;water.entryFall=undefined;
 const sim=new Simulation([level]) as any;sim.reset(true);sim.step([],1);
 if((sim.frame+parity)%2)sim.step([],1);
 sim.player.x=s.x+s.sub/256;sim.player.y=s.y+32;sim.player.vx=s.vx/4096;sim.player.grounded=false;sim.camera=Math.max(0,s.x-100);
 sim.seedSwim({speed:s.S,force:s.F,frac:s.D,rise:s.fall??10,fall:s.fall??10,timer:s.T});
 sim.previous=new Set(previous);sim.inputs=[new Set(now),new Set(now)];
 return sim;
}
const speed=(sim:any)=>Math.round(sim.player.vx*4096),y=(sim:any)=>Math.floor(sim.player.y)-32,x=(sim:any)=>Math.floor(sim.player.x);

test('A held through the entry fall strokes on the first control row (7-2 model rows 1292..1296: y 49, hold 49, 47, 46, 44)',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='7-2')!);level.main='area-4';
 const water=level.areas.find(a=>a.id==='area-4')!;water.enemies=[];
 const sim=new Simulation([level]) as any;sim.reset(true);
 let guard=0;while(y(sim)<49&&guard++<200)sim.step(['a'],1);
 assert.equal(y(sim),49);
 const rows:number[]=[];for(let i=0;i<4;i++){sim.step(['a'],1);rows.push(y(sim));}
 assert.deepEqual(rows,[49,47,46,44]);
});

test('below the map the controller no longer acts: speed kept, no stroke (2-2 pit rows 783..784 and branch probe)',()=>{
 const sim=swimmer('2-2','area-2',{x:1120,sub:16,y:209,vx:456,S:1,F:0,D:234,T:0},[],['right','a']);
 sim.step(['right','a'],1);
 assert.equal(speed(sim),456);assert.equal(sim.water.speed,1);assert.equal(y(sim),211);
});

test('at native y 207 the controller still acts (2-2 pit row 782 -> 783: speed 304 -> 456)',()=>{
 const sim=swimmer('2-2','area-2',{x:1121,sub:0,y:207,vx:304,S:1,F:104,D:16,T:0},['right'],['right']);
 sim.step(['right'],1);
 assert.equal(speed(sim),456);
});

test('a swimmer below the map dies only at screen page 6 (2-2 model rows 1219..1220: y 255 page 5 alive, y 1 page 6 dying)',()=>{
 const sim=swimmer('2-2','area-2',{x:1089,sub:80,y:1279-256,vx:456,S:1,F:0,D:106,T:0},[],[]);
 sim.step([],1);assert.equal(sim.phase,'play');
 const late=swimmer('2-2','area-2',{x:1089,sub:80,y:1279,vx:456,S:1,F:0,D:106,T:0},[],[]);
 late.step([],1);assert.notEqual(late.phase,'play');
});

test('the whirlpool pull follows where the move lands (2-2 model rows 718 -> 719: x 1087 + 2 lands past the centre 1088, pull -1 gives 1088)',()=>{
 const seen=[0,1].map(parity=>{
  const sim=swimmer('2-2','area-2',{x:1087,sub:176,y:19,vx:6184,S:-1,F:120,D:112,T:27,fall:10},['up','right','a'],['up','right','a'],parity);
  sim.step(['up','right','a'],1);return x(sim);
 }).sort((a,b)=>a-b);
 assert.deepEqual(seen,[1088,1089]);
});

test('in a whirlpool zone the ceiling is tested before the whirlpool pass: A every second frame under a ceiling repeats every 4 frames (2-2 model r4 mood0 rows 2595..2602)',()=>{
 // Native y 79 -> 77 (rising, no bump: the ordinary pass ends at feet - ceiling 14), 77 bump without moving, 79, 77, 77 bump, 77 stroke blocked, 79.
 const sim=swimmer('2-2','area-2',{x:2590,sub:144,y:79,vx:4696,S:-1,F:20,D:4,T:30,fall:9},['down','left','a'],['down','left','a']);
 const pads:Button[][]=[['down','left'],['down','left','a'],['down','left'],['down','left','a'],['down','left'],['down','left','a'],['down','left']];
 sim.inputs=[new Set(pads[0]),new Set(pads[1])]; // the input queue is two frames deep: step k applies pads[k]
 const ys=pads.map((_,k)=>{sim.step(pads[k+2]??[],1);return y(sim);});
 assert.deepEqual(ys,[77,77,79,77,77,77,79]);
});

test('feet inside a tile block a swimmer only when it is not rising (2-2 pillar probe d0R rows 9 -> 10 pass, 11 -> 12 block)',()=>{
 const rising=swimmer('2-2','area-2',{x:163,sub:176,y:133,vx:1376,S:-1,F:235,D:171,T:3},['right'],['right']);
 rising.step(['right'],1);
 assert.equal(x(rising),164);assert.equal(speed(rising),1528);
 const turning=swimmer('2-2','area-2',{x:164,sub:96,y:133,vx:1680,S:-1,F:255,D:139,T:1},['right'],['right']);
 turning.step(['right'],1);
 assert.equal(x(turning),163);assert.equal(speed(turning),40);assert.equal(y(turning),133);assert.equal(turning.water.speed,0);
});

test('feet three pixels inside a tile land on it (7-2 model rows 1555 -> 1556: y 131 -> 128)',()=>{
 const sim=swimmer('7-2','area-4',{x:1410,sub:176,y:131,vx:6320,S:0,F:106,D:21,T:0},['a'],['a']);
 sim.step(['a'],1);
 assert.equal(y(sim),128);assert.equal(sim.player.grounded,true);assert.equal(sim.water.speed,0);assert.equal(sim.water.force,0);
});

test('the 5-2 room lifts are id 39 wrapping lifts: 15 pixel steps then one idle step, from y 96 and 192 (room probes)',()=>{
 const lift:NativePlatformObject={kind:'wrap',spec:[364,96],x:364,y:96,direction:'down',phase:0,spawnCamera:49};
 const rows=Array.from({length:19},(_,age)=>nativeWrapY(lift,age));
 assert.deepEqual(rows,[96,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,111,112]);
 const level=observedLevels().find(l=>l.id==='5-2')!,room=level.areas.find(a=>a.id==='optional-water')!;
 assert.deepEqual(room.platforms!.map(p=>[p.x,p.y,p.width]),[[364,96,48],[460,192,48]]);
});

test('rising into a lift bumps the swimmer inside a whirlpool zone (5-2 room big Mario, sweep-c10 rows 335 -> 336: y 22 -> 23, S -1 -> 1, F 120 -> 0)',()=>{
 const sim=swimmer('5-2','optional-water',{x:399,sub:192,y:22,vx:3112,S:-1,F:120,D:244,T:28,fall:9},['right','b'],['right','b']);
 sim.player.size=1;
 sim.swimUnderLift=()=>true; // the lift position is the row's (y 18); its clock is covered by the wrap test above
 sim.step(['right','b'],1);
 assert.equal(y(sim),23);assert.equal(sim.water.speed,1);assert.equal(sim.water.force,0);
});

test('a Down+A stroke from the water floor keeps speed byte 16 (7-2 r5 mood0 rows 796 -> 797: 4168 -> 4168, y 176 -> 174)',()=>{
 const sim=swimmer('7-2','area-4',{x:1001,sub:96,y:176,vx:4168,S:0,F:0,D:0,T:0},['up','right'],['down','right','a']);
 sim.player.grounded=true;sim.player.vy=0;
 sim.step(['down','right','a'],1);
 assert.equal(speed(sim),4168);assert.ok(y(sim)<176);
});
