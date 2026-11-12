import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import hammerData from '../data/native-hammer-bros.json';

// Native Hammer Bros (object id 5) read from the recorded route trace and from full-RAM probes (docs/NATIVE_ROLES.md, Hammer Bro section): a Bro walks 0.25 px/frame on the area
// frame counter, jumps strong (-6) / weak (-3) with gravity 61/256, and holds a hammer 14 frames at (+2, -10) before it flies 1 px/frame with vy -2, +1/16 per frame.
function fixture(levelId:string,areaId:string,specX:number,camera:number,mario:number){
 const level=structuredClone(observedLevels().find(l=>l.id===levelId)!),area=level.areas.find(a=>a.id===areaId)!;
 area.enemies=area.enemies.filter(e=>e.kind==='hammerBro'&&e.x===specX);area.cannons=[];area.generators=[];area.firebars=[];
 const sim=new Simulation([level]);sim.reset(true);sim.player.invincible=100000;sim.loadArea(areaId,[mario,208],camera);
 return {sim,bro:sim.enemies[0]};
}

// 8-3 first Bro (route rows 73220-73347; native x per row, first row = its first appearance at area clock 498). Integer native x vs the remake's sub-pixel x: within 1 px.
const X_8_3=[1008,1008,1008,1007,1007,1007,1007,1006,1006,1006,1006,1005,1005,1005,1005,1005,1005,1005,1006,1006,1006,1006,1007,1007,1007,1007,1008,1008,1008,1008,1009,1009,1009,1009,1010,1010,1010,1010,1011,1011,1011,1011,1012,1012,1012,1012,1013,1013,1013,1013,1014,1014,1014,1014,1015,1015,1015,1015,1016,1016,1016,1016,1017,1017,1017,1017,1018,1018,1018,1018,1019,1019,1019,1019,1020,1020,1020,1020,1021,1020,1020,1020,1020,1019,1019,1019,1019,1018,1018,1018,1018,1017,1017,1017,1017,1016,1016,1016,1016,1015,1015,1015,1015,1014,1014,1014,1014,1013,1013,1013,1013,1012,1012,1012,1012,1011,1011,1011,1011,1010,1010,1010,1010,1009,1009,1009,1009,1008];
// Its first jump (strong, from the ground at native y 184, landing on the 144 ledge at y 120) and a weak jump of another Bro (8-3 row 73566, from the ledge down to the ground at y 184).
const Y_STRONG=[184,178,172,166,161,156,151,147,142,138,134,131,127,124,121,119,116,114,112,110,109,108,107,106,105,105,105,105,106,106,107,108,110,111,113,115,118,120,120,120,120,120];
const Y_WEAK=[120,117,114,112,109,107,106,104,103,102,101,100,100,100,100,100,101,101,102,104,105,107,109,111,114,116,119,123,126,129,132,136,139,142,145,148,152,155,158,161,165,168,171,175,178,181,184,184,184,184];
// A native thrown hammer (8-3 probe, released at y 46, Mario to the left): y per row from the release row, x one pixel left per row.
const HAMMER_Y=[46,44,42,40,38,36,34,33,31,30,28,27,26,24,23,22,21,20,19,18,17,17,16,15,15,14,14,13,13,13,13,13,13,13,13,13,13,13,13,14,14,15,15,16,17,17,18,19,20,21];

test('the roster binds each Bro of the observed levels to a recorded native spawn and the data file matches the specs one to one',()=>{
 const counts:Record<string,number>={};
 for(const b of hammerData.bros)counts[`${b.level}/${b.area}`]=(counts[`${b.level}/${b.area}`]??0)+1;
 const expected:Record<string,number>={'3-1/main':2,'5-2/area-2':4,'7-1/main':4,'8-3/main':8,'8-4/area-5':1};
 assert.equal(JSON.stringify(counts),JSON.stringify(expected));
 for(const key of Object.keys(expected)){
  const [levelId,areaId]=key.split('/'),level=observedLevels().find(l=>l.id===levelId)!,specs=level.areas.find(a=>a.id===areaId)!.enemies.filter(e=>e.kind==='hammerBro');
  assert.equal(specs.length,expected[key],key);
  const sim=new Simulation([structuredClone(level)]);sim.reset(true);sim.loadArea(areaId,[40,208],0);
  assert.equal(sim.enemies.filter(e=>e.kind==='hammerBro'&&e.nativeBro!==undefined).length,expected[key],`${key} bound`);
 }
});

test('an 8-3 Bro patrols 0.25 px/frame on the area clock: 128 native rows within 1 px (turn at clock 64 and 128, 16 px range)',()=>{
 const {sim,bro}=fixture('8-3','main',1008,770,807);
 (sim as any).broClock=497; // the native area clock reads 498 on the Bro's first row
 for(let t=0;t<X_8_3.length;t++){
  sim.step([],1);
  assert.ok(bro.active&&!bro.dead,`active at row ${t}`);
  assert.ok(Math.abs(bro.x-X_8_3[t])<=1,`row ${t}: native ${X_8_3[t]} remake ${bro.x}`);
 }
});

test('the patrol does not depend on the Bro: every Bro of an area follows the same clock (a turn at clock multiples of 64)',()=>{
 const {sim,bro}=fixture('8-3','main',1008,770,807);
 (sim as any).broClock=0;sim.step([],1);
 const x0=bro.x;sim.step([],62);const right=bro.x-x0;
 sim.step([],64);const left=bro.x-x0-right;
 assert.equal(right,15.5);assert.equal(left,-15.5); // right while clock mod 128 < 64 (62 steps after the first), then clock 63 still right and 63 steps left
});

test('a native strong jump from the ground lands on the ledge and a weak jump drops through its row (8-3 rows 73220 and 73566, within 1 px)',()=>{
 const strong=fixture('8-3','main',1008,770,807);(strong.sim as any).broClock=497;
 for(let t=0;t<Y_STRONG.length;t++){
  strong.sim.step([],1);
  assert.ok(Math.abs(strong.bro.y-24-Y_STRONG[t])<=1,`strong row ${t}: native ${Y_STRONG[t]} remake ${strong.bro.y-24}`);
 }
 const weak=fixture('8-3','main',1856,1700,1650);(weak.sim as any).broClock=843;
 for(let t=0;t<Y_WEAK.length;t++){
  weak.sim.step([],1);
  assert.ok(Math.abs(weak.bro.y-24-Y_WEAK[t])<=1,`weak row ${t}: native ${Y_WEAK[t]} remake ${weak.bro.y-24}`);
 }
});

test('a Bro holds its hammer 14 frames at (+2, -10) and throws it toward Mario along the native arc (y per row within 1 px, x one pixel per row)',()=>{
 const {sim,bro}=fixture('8-3','main',1008,770,807);
 // First throw cycle: the Bro is on screen (x - camera <= 245) from its first row, its recorded cycles are 29 and 58 frames later.
 let hammer;for(let t=0;t<40&&!(hammer=sim.items.find(i=>i.kind==='hammer'));t++)sim.step([],1);
 assert.ok(hammer);assert.equal(bro.age-1,29);
 for(let k=0;k<14;k++){
  assert.equal(hammer.x,bro.x+2);assert.equal(hammer.y,bro.y-24-10);
  sim.step([],1);
 }
 const y0=hammer.y,x0=hammer.x;
 for(let k=1;k<HAMMER_Y.length;k++){
  sim.step([],1);
  assert.ok(Math.abs(hammer.y-y0-(HAMMER_Y[k]-HAMMER_Y[0]))<=1,`flight row ${k}: native ${HAMMER_Y[k]-HAMMER_Y[0]} remake ${hammer.y-y0}`);
  assert.equal(hammer.x,x0-k);
 }
});

test('a Bro that has recorded no throw still throws every 49 frames in worlds 1-5 and every 29 later (3-1 and 7-1 roster entries without a list)',()=>{
 const early=fixture('3-1','main',1856,1700,1650),late=fixture('7-1','main',2160,2000,1900);
 for(const [f,period] of [[early,49],[late,29]] as const){
  const {sim,bro}=f;bro.nativeBro={...bro.nativeBro!,throws:[]};
  const created:number[]=[];const seen=new Set<unknown>();
  for(let t=0;t<period*3+3;t++){sim.step([],1);for(const i of sim.items)if(i.kind==='hammer'&&!seen.has(i)){seen.add(i);created.push(bro.age-1);}}
  assert.deepEqual(created,[period,period*2,period*3]);
 }
});

test('stomping a Bro scores 1000, as in the three native stomps (score digits of the 3-1, 5-2 and 7-1 probes: +1000 each)',()=>{
 const {sim,bro}=fixture('8-3','main',1008,770,807);sim.player.invincible=0;
 sim.step([],1);
 Object.assign(sim.player,{x:bro.x,y:bro.y-16,vx:0,vy:3,grounded:false});
 sim.step([],1);
 assert.ok(bro.dead>0);assert.equal(sim.score,1000);
});
