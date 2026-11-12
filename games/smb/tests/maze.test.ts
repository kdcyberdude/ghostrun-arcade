import {test} from 'node:test';
import assert from 'node:assert/strict';
import observations from '../data/maze-observations.json';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,MazeSpec,Tile} from '../src/types.js';

const four=observations.levels[0].firstMaze.runtimeCandidate as MazeSpec;
const seven=[observations.levels[1].firstMaze.runtimeCandidate,observations.levels[1].secondMaze!.runtimeCandidate] as MazeSpec[];
function fixture(mazes:MazeSpec[]):Level{
 const tiles:Tile[]=[];for(let x=0;x<256;x++)tiles.push([x,13,84]);
 tiles.push([32,5,136],[96,5,192]);
 const area:Area={id:'main',width:4096,palette:6,theme:'castle',tiles,spawn:[740,208],
  mazes:structuredClone(mazes),enemies:[{kind:'goomba',x:400,y:208},{kind:'koopa',x:3500,y:208,spawnCamera:3200}],
  freeTiles:[{x:400,y:80,id:136,palette:6},{x:2000,y:80,id:136,palette:6}],
  decorations:[{x:432,y:64,id:1,palette:6},{x:2032,y:64,id:1,palette:6}],
  patternOverrides:[[50,8,1,'test.png'],[250,8,2,'test.png']],
  solidRects:[{x:1200,y:48,width:160,height:16,id:136}],
  firebars:[{x:448,y:100,length:6,speed:0.03},{x:2048,y:100,length:6,speed:0.03}],
  platforms:[{x:464,y:180,width:32,axis:'x',range:16,speed:0.5},{x:2064,y:180,width:32,axis:'y',range:16,speed:0.5}],
  pipes:[{x:480,y:128,direction:'down',to:'next',spawn:[32,0]},{x:2080,y:128,direction:'down',to:'next',spawn:[32,0]}],
  springs:[{x:496,y:200},{x:2096,y:200}],cannons:[{x:512,y:160},{x:2112,y:160}],
  generators:[{kind:'bullet',from:1152,to:1408,interval:160}],
  exit:{x:3800,y:144,kind:'axe',retainerX:3936,stopX:3920},
  evidence:'Synthetic collision fixture using image-measured candidate gate coordinates; not campaign gameplay evidence.'};
 return {id:'maze-test',time:400,main:'main',areas:[area],evidence:area.evidence};
}
// Explicit state setup isolates gate rules. These are unit tests, not claimed
// ordinary-control campaign runs or evidence of exact native gate thresholds.
function cross(sim:Simulation,x:number,feet:number){
 Object.assign(sim.player,{x:x-0.5,y:feet,vx:2.5,vy:0,grounded:false});sim.camera=x-112;
 sim.step([],1);
}
test('wrong 4-4 corridor streams its observed repeat before the seam is visible, without moving the player backwards',()=>{
 const sim=new Simulation([fixture([four])]);sim.reset(true);
 const beforeWidth=sim.area.width;let oldX=sim.player.x,oldCamera=sim.camera,inserted=false;
 for(let frame=0;frame<50;frame++){
  sim.step(['right','b'],1);
  assert.ok(sim.player.x>=oldX&&sim.player.x-oldX<=2.5,'player movement stays continuous');
  assert.ok(sim.camera>=oldCamera&&sim.camera-oldCamera<=2,'camera never teleports backwards');
  if(sim.area.width>beforeWidth){assert.ok(sim.camera+256<four.loopAt,'copy is inserted ahead of the viewport');inserted=true;break;}
  oldX=sim.player.x;oldCamera=sim.camera;
 }
 assert.equal(inserted,true);assert.equal(sim.area.width,beforeWidth+1024);
 assert.equal(sim.tiles.get('96,5'),136,'source x512 terrain appears at the seam copy x1536');
 assert.equal(sim.tiles.get('160,5'),192,'future original x1536 terrain moves to x2560');
 assert.equal(sim.area.exit?.x,4824);assert.equal(sim.player.dead,false);
 const correct=new Simulation([fixture([four])]);correct.reset(true);cross(correct,768,96);
 assert.equal(correct.area.width,beforeWidth,'the observed upper corridor proceeds into the original distinct later map');
});
test('an inserted section shifts future collision, artwork, hazards and actors without resetting existing actors or items',()=>{
 const sim=new Simulation([fixture([four])]);sim.reset(true);
 sim.enemies[0].age=17;sim.items.push({kind:'fireball',x:900,y:40,vx:0,vy:0,age:3,life:60});
 cross(sim,768,208);
 assert.ok(sim.freeTiles.some(p=>p.x===1424));assert.ok(sim.freeTiles.some(p=>p.x===3024));
 assert.ok(sim.area.decorations?.some(p=>p.x===1456));assert.ok(sim.area.decorations?.some(p=>p.x===3056));
 assert.ok(sim.area.patternOverrides?.some(p=>p[0]===178));assert.ok(sim.area.patternOverrides?.some(p=>p[0]===378));
 assert.ok(sim.area.solidRects?.some(r=>r.x===1200&&r.width===80));
 assert.ok(sim.area.solidRects?.some(r=>r.x===2224&&r.width===80));
 assert.ok(sim.area.solidRects?.some(r=>r.x===2304&&r.width===80));
 for(const [field,sourceX,futureX]of[['firebars',448,2048],['platforms',464,2064],['pipes',480,2080],['springs',496,2096],['cannons',512,2112]] as const){
  assert.ok(sim.area[field]?.some(p=>p.x===sourceX+1024),`${field} source copy`);
  assert.ok(sim.area[field]?.some(p=>p.x===futureX+1024),`${field} future shift`);
 }
 assert.ok(sim.enemies.some(e=>e.originX===1424&&e.age===0));
 assert.equal(sim.enemies.find(e=>e.kind==='koopa')?.originX,4524);
 assert.equal(sim.enemies.find(e=>e.kind==='koopa')?.spawnCamera,4224);
 assert.equal(sim.enemies[0].age,17,'actors behind the player retain their state');
 assert.ok(sim.items.some(i=>i.kind==='fireball'&&i.x===900&&i.age===4),'in-flight items are not discarded');
 assert.equal(sim.area.exit?.retainerX,4960);assert.equal(sim.area.exit?.stopX,4944);
 assert.deepEqual(sim.area.generators?.map(g=>[g.from,g.to]),[[1152,1280],[2304,2432],[2176,2304]]);
});
test('correct corridor samples keep the original map and the two 7-4 mazes advance independently',()=>{
 const sim=new Simulation([fixture(seven)]);sim.reset(true);const width=sim.area.width;
 for(const [x,feet]of[[704,208],[960,160],[1248,96],[1728,96],[2016,160],[2320,96]])cross(sim,x,feet);
 assert.equal(sim.area.width,width);assert.equal(sim.area.exit?.x,3800);
});
test('failure in each 7-4 maze repeats its own source section and shifts later gate coordinates',()=>{
 const sim=new Simulation([fixture(seven)]);sim.reset(true);const width=sim.area.width;
 cross(sim,704,96);assert.equal(sim.area.width,width+1024);
 assert.equal(sim.area.mazes?.[1].loopTo,2560);assert.equal(sim.area.mazes?.[1].loopAt,3584);
 for(const [x,feet]of[[1728,208],[1984,160],[2272,96],[2752,96],[3040,160]])cross(sim,x,feet);
 assert.equal(sim.area.width,width+1024,'passing the repeated first maze does not duplicate it again');
 cross(sim,3344,208);assert.equal(sim.area.width,width+2048);
 assert.equal(sim.area.mazes?.[0].loopAt,2560,'completed first section keeps its own state');
 assert.equal(sim.area.mazes?.[1].loopAt,4608);assert.equal(sim.area.exit?.x,5848);
 assert.equal(sim.enemies.find(e=>e.kind==='koopa')?.originX,5548);
});
test('the independently observed wrong third choice also repeats the first 7-4 section',()=>{
 const sim=new Simulation([fixture(seven)]);sim.reset(true);
 cross(sim,704,208);cross(sim,960,160);assert.equal(sim.area.width,4096);
 cross(sim,1248,208);assert.equal(sim.area.width,5120);
 assert.ok(sim.camera+256<1536,'the third-choice failure is resolved before the repeat edge enters view');
 assert.equal(sim.area.mazes?.[0].loopAt,2560);
});
test('the unconditional 8-4 candidate preloads each repeated section before its edge enters view',()=>{
 const level=fixture([]),area=level.areas[0];area.width=992;area.mazes=undefined;
 area.maze={loopTo:0,loopAt:992,evidence:'Unconditional room loop candidate, native wrong-pipe behavior still unmeasured.'};
 const sim=new Simulation([level]);sim.reset(true);sim.player.x=832;sim.camera=720;
 sim.step([],1);assert.equal(sim.area.width,1984);assert.equal(sim.player.x,832);assert.equal(sim.camera,720);
 assert.ok(sim.camera+256<992);assert.equal(sim.area.maze?.loopAt,1984);
 sim.player.x=1824;sim.camera=1712;sim.step([],1);assert.equal(sim.area.width,2976);assert.equal(sim.player.x,1824);assert.equal(sim.camera,1712);
});
test('fresh reset restores explicit data after one or more streamed failures',()=>{
 const level=fixture(seven),original=structuredClone(level),sim=new Simulation([level]);sim.reset(true);
 cross(sim,704,96);cross(sim,1728,96);assert.equal(sim.area.width,6144);
 assert.deepEqual(level,original,'streaming never mutates editable source level data');
 sim.reset(true);assert.equal(sim.area.width,4096);assert.deepEqual(sim.area,original.areas[0]);
 assert.equal(sim.enemies.length,2);assert.equal(sim.player.x,740);assert.equal(sim.player.y,208);
});
