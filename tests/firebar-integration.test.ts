import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {FirebarSpec,Level} from '../src/types.js';
import fixtures from '../data/firebar-motion-regressions.json';

const first:FirebarSpec={x:488,y:168,length:6,speed:-0.0321,motor:{direction:-1,initialUnits:768,evidence:'Measured first1-4 object'}};
// Isolated physical fixture, not a traversal or campaign-completion test.
function game(bar:FirebarSpec=first,camera=228,x=340):Simulation {
 const level:Level={id:'fixture',time:400,main:'main',evidence:'Unit fixture',areas:[{id:'main',width:2048,palette:0,theme:'ground',spawn:[x,208],camera,tiles:Array.from({length:128},(_,col)=>[col,13,81]),enemies:[],firebars:[structuredClone(bar)],evidence:'Unit fixture'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
const state=(sim:Simulation)=>(sim as any).firebarMotors.get(sim.area.firebars![0]).state as {active:boolean;units:number};

test('ordinary movement activates at newly committed camera229, with one increment and pure queries',()=>{
 const sim=game();const bar=sim.area.firebars![0];
 assert.deepEqual(sim.firebarCenters(bar),[]);
 sim.player.vx=1.5;sim.step([],1);
 assert.equal(sim.camera,229);assert.deepEqual(state(sim),{active:true,units:763});
 const centers=sim.firebarCenters(bar);assert.deepEqual(centers.at(-1),{x:481,y:130});
 for(let query=0;query<10;query++)assert.deepEqual(sim.firebarCenters(bar),centers);
 assert.equal(state(sim).units,763);
 sim.step([],1);assert.equal(state(sim).units,758);
});

test('stationary preactivation wait does not consume phase; area reload resets it',()=>{
 const sim=game(first,228,260);sim.step([],150);
 assert.deepEqual(state(sim),{active:false,units:768});
 sim.loadArea('main',[340,208],228);sim.player.vx=1.5;sim.step([],1);
 assert.equal(state(sim).units,763);
 sim.loadArea('main');assert.deepEqual(state(sim),{active:false,units:768});
});

test('a death-causing frame advances once, then freezes motor while global sprite clock continues',()=>{
 const sim=game(first,229,260);sim.step([],1);assert.equal(state(sim).units,763);
 sim.player.x=480;sim.player.y=172;sim.player.vx=0;sim.player.vy=0;
 sim.step([],1);assert.equal(sim.phase,'dying');assert.equal(state(sim).units,758);
 const centers=sim.firebarCenters(sim.area.firebars![0]),poses=new Set<number>();
 for(let native=0;native<30;native++){
  sim.step([],1);poses.add(Math.floor(sim.frame/4)%4);
  assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]),centers);assert.equal(state(sim).units,758);
 }
 assert.equal(poses.size,4);
});

test('the 5-4 long fallback firebar remains fixed throughout the visible death scene',()=>{
 const bar=observedLevels().find(l=>l.id==='5-4')!.areas[0].firebars!.find(b=>b.x===376)!;
 assert.equal(bar.length,12);assert.equal(bar.motor,undefined);
 const sim=game(bar,229,260);sim.step([],12);sim.die();
 const centers=sim.firebarCenters(sim.area.firebars![0]),areaFrame=sim.areaFrame;
 for(let native=0;native<60;native++){
  sim.step([],1);assert.equal(sim.phase,'dying');
  assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]),centers);
 }
 assert.equal(sim.areaFrame,areaFrame+60);
});

test('pause freezes the motor and frame; transition frames do not advance a motor',()=>{
 const sim=game(first,229,260);sim.step([],1);const units=state(sim).units,frame=sim.frame;
 sim.paused=true;sim.step([],20);assert.equal(sim.frame,frame);assert.equal(state(sim).units,units);
 sim.paused=false;sim.phase='intro';sim.phaseFrame=0;sim.step([],20);
 assert.equal(sim.frame,frame+20);assert.equal(state(sim).units,units);
});

test('legacy six-orb, long and fast bars retain the exact continuous positions',()=>{
 for(const length of [6,12])for(const speed of [-0.0321,0.064,-0.053]){
  const sim=game({x:488,y:168,length,speed}),bar=sim.area.firebars![0];
  for(const frame of [0,1,32,433,9876]){
   sim.areaFrame=frame;
   assert.deepEqual(sim.firebarCenters(bar),Array.from({length},(_,n)=>({x:488+Math.cos(frame*speed)*n*8,y:168+Math.sin(frame*speed)*n*8})));
  }
 }
});

test('collision still uses the existing10-by-height-minus6 player and6-by6 flame rectangles',()=>{
 const sim=game(first,229,260);sim.step([],1);const bar=sim.area.firebars![0];
 let hits=0;(sim as any).hurt=()=>hits++;
 for(const size of [0,1] as const)for(const x of [474,475,475.01,480,487.99,488,500])for(const y of [150,156,162,168,174,180,190]){
  sim.player.size=size;sim.player.x=x;sim.player.y=y;hits=0;
  const height=sim.height,expected=sim.firebarCenters(bar).filter(p=>x+3<p.x+3&&x+13>p.x-3&&y-height+3<p.y+3&&y-3>p.y-3).length;
  (sim as any).collideFirebar(bar,height);assert.equal(hits,expected,`${size}/${x}/${y}`);
 }
});

test('compiled metadata qualifies thirteen measured objects and only corrects proven1-4 pivots',()=>{
 const levels=observedLevels();
 assert.deepEqual(levels.flatMap(l=>l.areas.flatMap(a=>(a.firebars??[]).filter(b=>b.motor).map(b=>[l.id,a.id,b.x,b.y,b.motor!.direction,b.motor!.initialUnits]))),[
  ['1-4','main',488,168,-1,768],['1-4','main',792,104,-1,768],['1-4','main',968,104,-1,128],['1-4','main',1080,104,-1,768],['2-4','main',792,152,-1,864],['2-4','main',984,152,-1,768],['3-4','main',312,184,-1,768],['4-4','main',856,104,1,768],['5-4','main',696,216,1,763],['5-4','main',888,216,1,763],['5-4','main',1080,216,-1,229],['7-4','main',1656,120,1,768],['8-4','area-4',328,120,1,768],
 ]);
 const bars=levels.find(l=>l.id==='1-4')!.areas[0].firebars!;
 assert.deepEqual(bars.map(b=>[b.x,b.y,Math.sign(b.speed)]),[[488,168,-1],[792,104,-1],[968,104,-1],[1080,104,-1],[1224,152,-1],[1352,152,-1],[1416,72,1]]);
 assert.equal(bars.find(b=>b.x===1416)!.motor,undefined);
});

test('missing5-4 arm waits before camera437 and exposes bin24 on its first active step',()=>{
 const bar=observedLevels().find(l=>l.id==='5-4')!.areas[0].firebars!.find(b=>b.x===696)!;
 assert.ok(bar);
 const sim=game(bar,436,460);sim.step([],150);
 assert.deepEqual(state(sim),{active:false,units:763});assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]),[]);
 sim.loadArea('main',[548,208],436);sim.player.vx=1.5;sim.step([],1);
 assert.equal(sim.camera,437);assert.deepEqual(state(sim),{active:true,units:768});
 assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]).at(-1),{x:696,y:177});
});

test('missing5-4 flame is a damaging actor above its ordinary solid base',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-4')!),area=level.areas[0];
 assert.ok(area.tiles.some(([col,row,id])=>col===43&&row===13&&id===196));
 area.spawn=[688,208];area.camera=568;area.enemies=[];area.firebars=area.firebars!.filter(bar=>bar.x===696);
 const sim=new Simulation([level]);sim.reset(true);assert.equal(sim.player.grounded,true);
 sim.step([],1);assert.equal(sim.phase,'dying');assert.equal(sim.events.filter(e=>e==='event_death').length,1);
});

for(const fixture of fixtures.cases.filter(f=>!f.qualification.startsWith('calibration'))){
 test(`production step/query reproduces source ${fixture.object.level}/${fixture.object.x} after${fixture.activeNativeFrames} active frames`,()=>{
  const source=observedLevels().find(l=>l.id===fixture.object.level)!.areas.find(a=>a.id===fixture.object.area)!.firebars!.find(b=>b.x===fixture.object.x&&b.y===fixture.object.y)!;
  assert.ok(source.motor);
  const sim=game(source,source.x-259,source.x-227);
  sim.step([],fixture.activeNativeFrames);assert.equal(sim.phase,'play');
  const centers=sim.firebarCenters(sim.area.firebars![0]);
  for(const center of fixture.centers)assert.deepEqual(centers[center.n],{x:center.x,y:center.y});
 });
}

test('qualified 2-4 third firebar waits for camera entry and starts at the observed phase',()=>{
 const bar=observedLevels().find(l=>l.id==='2-4')!.areas[0].firebars!.find(b=>b.x===984&&b.y===152)!;
 const sim=game(bar,724,800);sim.step([],60);
 assert.deepEqual(state(sim),{active:false,units:768});assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]),[]);
 sim.loadArea('main',[836,208],724);sim.player.vx=1.5;sim.step([],1);
 assert.equal(sim.camera,725);assert.deepEqual(state(sim),{active:true,units:763});
 assert.deepEqual(sim.firebarCenters(sim.area.firebars![0]).at(-1),{x:977,y:114});
});
