import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import bulletData from '../data/native-bullets.json';
import type {Area,CannonSpec,GeneratorSpec,Level,Tile} from '../src/types.js';

// Native Bullet Bill (cannon object id 51, generator object id 8), read-only from the recorded route trace (docs/NATIVE_ROLES.md, Bullet Bill section).
function fixture(extra:Partial<Area>,spawn:[number,number]=[40,208]){
 const tiles:Tile[]=[];for(let x=0;x<256;x++)tiles.push([x,13,84]);
 const area:Area={id:'main',width:4096,palette:0,theme:'ground',tiles,enemies:[],spawn,evidence:'Synthetic bullet fixture',...extra};
 const level:Level={id:'fixture',time:400,main:'main',areas:[area],evidence:'Mechanic regression fixture'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;return sim;
}
const shots=(sim:Simulation)=>sim.enemies.filter(e=>e.kind==='bullet'&&e.nativeShot);
// Random bytes that make slot 0 pick table entry 0 and leave slots 1 and 2 without an entry.
const PICK_ENTRY_0=[0,0,7,7,0,0,0];
function attemptSim(cannon:CannonSpec,camera:number,mario:number,spawn?:[number,number]){
 const sim=fixture({cannons:[cannon]},spawn);
 sim.camera=camera;sim.player.x=mario;sim.random.bytes=[...PICK_ENTRY_0];
 (sim as any).updateGenerators();
 return sim;
}
const attempt=(cannon:CannonSpec,camera:number,mario:number)=>shots(attemptSim(cannon,camera,mario));

// Native attempts of id 51 (7-1, 8-2, 8-3 rows): [cannon x - camera, cannon x - Mario, became a Bullet Bill?]. The object is on screen for 0 <= x - camera <= 255
// and Mario at least 48 px away; every other attempt is the one-frame object.
const NATIVE_ATTEMPTS:[number,number,boolean][]=[
 [127,15,false],[93,-21,false],[85,-27,false],[76,-37,false],        // Mario within 37 px: flash
 [66,-58,true],[54,-59,true],[51,-61,true],[176,64,true],[45,-67,true], // 58 px and more: shot
 [249,137,true],[240,129,true],[0,-112,true],                         // on screen up to 249, and exactly at the camera
 [-29,-141,false],[258,146,false],[267,162,false],[282,199,false],     // off screen: flash
];
test('a cannon shot needs the cannon on screen and Mario 48 px away: all 16 native attempts of 7-1/8-2/8-3 classify',()=>{
 for(const [onScreen,distance,fired] of NATIVE_ATTEMPTS){
  const camera=1000,cannon:CannonSpec={x:camera+onScreen,y:176,native:true};
  assert.equal(attempt(cannon,camera,cannon.x-distance).length>0,fired,`x-camera ${onScreen}, x-Mario ${distance}`);
 }
});

// 7-1 shot of the cannon at x 448 (native row 55999, Mario x 362, camera 250): first rows x 448 446 445 443 442 440, +-1.5 px per frame afterwards, y 184.
const SHOT_7_1=[448,446,445,443,442,440,439,437,436,434];
test('a native shot holds the cannon x on its first row, then moves 1.5 px per frame toward Mario (7-1 rows 55999-56008)',()=>{
 const sim=attemptSim({x:448,y:192,native:true},250,362,[362,208]);
 const xs:number[]=[];
 for(let f=1;f<=SHOT_7_1.length;f++){sim.step([],1);xs.push(Math.floor(shots(sim)[0].x));}
 assert.deepEqual(xs,SHOT_7_1);
 const shot=shots(sim)[0];assert.equal(shot.y,208);assert.ok(shot.vx<0);
});
test('a shot moves away from a Mario who is to the right of the cannon (7-1 row 56083: Mario 560, cannon 448, x 448 -> 555 right)',()=>{
 const shot=attempt({x:448,y:192,native:true},448,560)[0];
 assert.ok(shot.vx>0);assert.equal(shot.x,448);
});

// Native table rows (8-3 mood0 rows 8-49, 7-1 and 5-2 alike): RAM 0x47D+entry restarts at 14 on an attempt and counts down once per free slot 0..2 whose random byte picks the entry.
function table(level:string,bytes:number[],busy:number[]=[]){
 const sim=fixture({cannons:[{x:300,y:176,native:true}]},[250,208]),s=sim as any;sim.level.id=level;sim.camera=100;
 for(const slot of busy)sim.enemies.push({...s.makeEnemy({kind:'goomba',x:0,y:0}),active:true,enemySlot:slot});
 s.updateNativeCannons();s.cannonTable[0].timer=5;sim.random.bytes=bytes;s.updateNativeCannons();return s.cannonTable[0].timer;
}
test('a cannon timer counts once per free slot 0..2 whose random byte picks it',()=>{
 assert.equal(table('5-2',[9,0,9,9,0,0,0]),4);assert.equal(table('5-2',[9,0,0,9,0,0,0]),3);
 assert.equal(table('5-2',[9,0,9,9,0,0,0],[0]),5,'a busy slot does not count');
 assert.equal(table('5-2',[0,9,9,9,0,0,0]),5,'slot 3 and byte 0 are not read');
 assert.equal(table('5-2',[9,8,9,9,0,0,0]),5,'mask 15 outside the hard worlds');assert.equal(table('7-1',[9,8,9,9,0,0,0]),4,'mask 7 in worlds 7 and 8');
});
// Native RAM of r4 free play (evidence/hazards2-findings-20261111.md): a cannon on a 32-px boundary loads on the row whose camera reaches x - 352 (7-1 mood2 rows 102/154: camera 93 -> 96 for x 448,
// 223 -> 226 for x 576) and is not picked on that row (picked by slot 2 on row 102, timer stays 0); the remake's step sees that row's camera on the next frame, before its pass. Between
// boundaries (x = 16 mod 32) the load comes at x - camera <= 358 (5-1 mood4 row 946 x 1776 camera 1416 -> 1419; 8-2 mood0 rows 741/906/931). The old 356 (route rows, any column) loaded a row early.
test('cannons take table entries in load order as their column loads (7-1 mood2 rows 102, 154)',()=>{
 const sim=fixture({cannons:[{x:304,y:176,native:true},{x:448,y:160,native:true},{x:448,y:192,native:true},{x:576,y:176,native:true}]}),s=sim as any;sim.level.id='7-1';
 sim.camera=95;s.updateNativeCannons();assert.equal(s.cannonTable.filter(Boolean).length,1,'x 304 (16 mod 32) is in at x - camera 209');
 sim.camera=96;s.updateNativeCannons();assert.deepEqual(s.cannonTable.map((e:any)=>[e.cannon.x,e.cannon.y]),[[304,176],[448,160],[448,192]]);
 sim.camera=223;s.updateNativeCannons();assert.equal(s.cannonTable.length,3);
 sim.camera=224;s.updateNativeCannons();assert.equal(s.cannonTable[3].cannon.x,576);
 const odd=fixture({cannons:[{x:1776,y:176,native:true}]}),o=odd as any;odd.level.id='5-1';
 odd.camera=1417;o.updateNativeCannons();assert.equal(o.cannonTable.length,0);odd.camera=1418;o.updateNativeCannons();assert.equal(o.cannonTable.length,1);
});
// 8-3 mood1 rows 48-50 (RAM 0x47D, slots 0x0F-0x13, register 0x7A7): timer 1; row 49 bytes 02 54 50 f8: slots 2 and 1 both pick entry 0, slot 2 counts it to 0 and slot 1 attempts (14; the
// one-row object, cannon off screen, sits in slot 1); row 50 bytes 81 2a 28 7c: slot 1 would pick entry 0 but still holds that object, so the timer stays 14 (rows 50-52: 14 14 14).
test('slots pick from 2 down to 0, and a failed attempt holds its slot on the next frame (8-3 mood1 rows 48-50)',()=>{
 const sim=fixture({cannons:[{x:288,y:176,native:true}]},[86,208]),s=sim as any;sim.level.id='8-3';sim.camera=3;
 sim.random.bytes=[0x04,0xa8,0xa1,0xf0,0xb3,0x52,0x34];s.updateNativeCannons();s.cannonTable[0].timer=1;s.cannonFlash.clear(); // native rows 47-48: no slot held
 sim.random.bytes=[0x02,0x54,0x50,0xf8,0x59,0xa9,0x1a];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,14);assert.equal(shots(sim).length,0,'x - camera 285: the one-row object');
 sim.random.bytes=[0x81,0x2a,0x28,0x7c,0x2c,0xd4,0x8d];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,14,'slot 1 is held');
 sim.random.bytes=[0xc0,0x95,0x14,0x3e,0x16,0x6a,0x46];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,14);
});
// 7-1 mood2/mood5 row 6, the first native row (engine 7, register 23 bf f8 87 ..): slot 1 picks entry 0 (cannon 304, loaded during the load screen) and attempts; the remake's first frame is
// row 7 (11 df fc 43 bb 3c 4a, no pick), where native shows timer 14, then 14, 13 (row 9).
test('the first native row of a level already runs a cannon pass on the register one frame back (7-1 row 6)',()=>{
 const sim=fixture({cannons:[{x:304,y:176,native:true}]},[40,208]),s=sim as any;sim.level.id='7-1';sim.camera=0;
 sim.random.bytes=[0x11,0xdf,0xfc,0x43,0xbb,0x3c,0x4a];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,14);
 sim.random.bytes=[0x88,0xef,0xfe,0x21,0xdd,0x9e,0x25];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,14,'row 8: no pick');
 sim.random.bytes=[0xc4,0x77,0xff,0x10,0xee,0xcf,0x12];s.updateNativeCannons();assert.equal(s.cannonTable[0].timer,13,'row 9: slot 2 counts');
});
test('the route comparison replays recorded cannon attempts, repeating the last gaps',()=>{
 const sim=fixture({cannons:[{x:200,y:176,native:true,fire:[5,12],loop:[3,4]}]},[40,208]);sim.recordedRoute=true;
 const frames:number[]=[];let count=0;
 for(let f=1;f<=40;f++){sim.step([],1);if(shots(sim).length>count){count=shots(sim).length;frames.push(f);}}
 assert.deepEqual(frames,[5,12,15,19,22,26,29,33,36,40]);
});

// 5-3 generator (native id 8): one Bullet Bill at a time at camera + 287, recorded heights (native y 40 88 120 ...), the next one right after the previous one left the screen
// (native spawn rows 42652, 42775, 42899: 123 and 124 frames apart at the start, then 91-92 while Mario runs; the camera then moves 2.5 px per frame).
test('the 5-3 generator spawns a bullet at camera + 287 at the recorded heights as soon as the previous one is gone',()=>{
 const generator:GeneratorSpec={kind:'bullet',from:0,to:99999,interval:1,heights:[40,88,120],fromCamera:0,toCamera:1e9};
 const sim=fixture({generators:[generator]});
 const spawns:{frame:number;x:number;camera:number;y:number}[]=[];let count=0;
 for(let f=1;f<=330;f++){
  if(f>1)sim.camera+=2.5;
  sim.step([],1);
  if(shots(sim).length>count){count=shots(sim).length;const s=shots(sim)[count-1];spawns.push({frame:f,x:s.x,camera:sim.camera,y:s.y});}
 }
 assert.equal(spawns.length,4);
 assert.deepEqual(spawns.slice(0,3).map(s=>s.y),[64,112,144]); // native y + 24
 spawns.forEach(s=>assert.ok(Math.abs(s.x-(s.camera-2.5*(s.frame>1?1:0)+287))<=3,`x ${s.x} camera ${s.camera}`));
 const gaps=spawns.slice(1).map((s,i)=>s.frame-spawns[i].frame);
 gaps.forEach(g=>assert.ok(g>=89&&g<=93,`gap ${g}`));
});

test('the generator stops outside its camera range (5-3 recorded range 0 to 1802)',()=>{
 const generator:GeneratorSpec={kind:'bullet',from:0,to:99999,interval:1,heights:[40],fromCamera:100,toCamera:200};
 const sim=fixture({generators:[generator]});
 sim.step([],5);assert.equal(shots(sim).length,0);
 sim.camera=150;sim.step([],1);assert.equal(shots(sim).length,1);
 sim.camera=300;sim.step([],400);assert.equal(shots(sim).length,1);
});

// Contact box: native Mario never touches a Bullet Bill that he only passes at its top edge (5-3 row 43124: rising feet 184 beside a bullet with feet 192, x 1032 / 1039)
// and stomps one when his feet go from 167 to 171 over a bullet with feet 176 (7-1 rows 56844-56845, vy 4 then -3): the box is about 9 px tall (6 < height <= 10).
function contact(bulletFeet:number,marioFeet:number,oldFeet:number,vy:number,dx:number){
 const sim=fixture({});sim.player.invincible=0;sim.camera=900;
 (sim as any).spawnNativeBullet(1000,bulletFeet,-1);
 const bullet=shots(sim)[0];bullet.age=5;sim.player.x=1000-dx;sim.player.y=marioFeet;sim.player.vy=vy;
 (sim as any).updateEnemies(oldFeet);
 return {sim,bullet};
}
test('a bullet passed at its top edge does not hurt Mario (5-3 row 43124)',()=>{
 const {sim,bullet}=contact(192,184,188,-5,7);
 assert.equal(sim.phase,'play');assert.equal(bullet.dead,0);assert.equal(sim.player.dead,false);
});
test('falling Mario stomps a bullet when his feet cross its 9 px box (7-1 rows 56844-56845)',()=>{
 const before=contact(176,167,163,4,4);
 assert.equal(before.bullet.dead,0);assert.equal(before.sim.player.dead,false);
 const stomp=contact(176,171,167,4,4);
 assert.ok(stomp.bullet.dead>0);assert.equal(stomp.sim.player.dead,false);assert.ok(stomp.sim.player.vy<0);
});

// Data produced by tools/derive-bullet-schedule.mjs from the route trace and attached by tools/compile-levels.mjs.
test('the compiled levels mark the native cannons and carry the generator heights of the route',()=>{
 const levels=observedLevels();
 const cannon=levels.find(l=>l.id==='7-1')!.areas.find(a=>a.id==='main')!.cannons!.find(c=>c.x===448&&c.y===192)!;
 assert.equal(cannon.native,true);
 // native rows 55999 and 56083 are visit-start rows 153 and 237 of the cannon object at (448, 184)
 assert.ok(cannon.fire!.includes(153)&&cannon.fire!.includes(237),`fire ${cannon.fire}`);
 const generator=levels.find(l=>l.id==='5-3')!.areas.find(a=>a.id==='main')!.generators!.find(g=>g.kind==='bullet')!;
 assert.deepEqual(generator.heights!.slice(0,5),[40,88,120,104,168]);
 // static screenshot-era bullet sightings are gone: the shots come from the cannons
 for(const id of ['7-1','8-2','8-3'])assert.equal(levels.find(l=>l.id===id)!.areas.find(a=>a.id==='main')!.enemies.filter(e=>e.kind==='bullet').length,0);
 assert.equal(bulletData.rules.cannonMinDistance,48);
});
