import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Simulation,TRANSITIONS} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Area,Level,Tile} from '../src/types.js';

function area(overrides:Partial<Area>={}):Area {
 const tiles:Tile[]=[];for(let x=0;x<32;x++)tiles.push([x,13,84]);
 return {id:'main',width:512,palette:0,theme:'ground',spawn:[72,160],tiles,enemies:[],evidence:'Synthetic pipe fixture, not a campaign run',...overrides};
}

test('an ordinary down-pipe warp loads the destination intro while retaining inventory',()=>{
 const source=area({pipes:[{x:80,y:160,direction:'down',to:'main',targetLevel:'6-1',spawn:[40,208],camera:0}]});
 source.tiles.push([4,10,16],[5,10,17],[4,11,20],[5,11,21],[4,12,20],[5,12,21]);
 const levels:Level[]=[{id:'4-2',time:400,main:'main',areas:[source],evidence:'Fixture'},{id:'6-1',time:300,main:'main',areas:[area({theme:'night',spawn:[40,208]})],evidence:'Fixture'}];
 const sim=new Simulation(levels);sim.reset(true);sim.score=16800;sim.coins=40;sim.lives=5;sim.player.size=2;sim.time=123;sim.checkpoint=true;
 sim.step(['down'],3);assert.equal(sim.phase,'pipe');assert.equal(sim.level.id,'4-2');sim.step([],64);
 assert.equal(sim.level.id,'6-1');assert.equal(sim.area.id,'main');assert.equal(sim.phase,'intro');assert.equal(sim.time,300);assert.equal(sim.checkpoint,false);
 assert.deepEqual([sim.score,sim.coins,sim.lives,sim.player.size],[16800,40,5,2]);assert.equal(sim.camera,0);
 sim.step([],TRANSITIONS.introFrames);assert.equal(sim.phase,'play');assert.equal(sim.player.x,40);assert.equal(sim.player.y,208);
});

test('down held away from the physical warp entrance cannot change levels',()=>{
 const source=area({spawn:[40,208],pipes:[{x:80,y:160,direction:'down',to:'main',targetLevel:'6-1',spawn:[40,208]}]});
 const sim=new Simulation([{id:'4-2',time:400,main:'main',areas:[source],evidence:'Fixture'},{id:'6-1',time:400,main:'main',areas:[area()],evidence:'Fixture'}]);
 sim.reset(true);sim.step(['down'],240);assert.equal(sim.level.id,'4-2');assert.equal(sim.phase,'play');
});

test('compiled4-2 exposes the observed vine and all three controller-tested warp destinations',()=>{
 const level=observedLevels().find(l=>l.id==='4-2')!,main=level.areas.find(a=>a.id==='area-3')!,room=level.areas.find(a=>a.id==='vine-warp-zone')!;
 assert.ok(room);assert.equal(room.width,1024);assert.deepEqual(room.spawn,[56,240]);assert.ok(room.unresolved?.some(x=>x.includes('alignment limits')));
 assert.ok(main.blockContents?.some(b=>b.kind==='vine'&&b.col===64&&b.row===5));assert.ok(main.vines?.some(v=>v.to===room.id&&v.x===1024)); // one tile left of the screenshot-era 65/1040 (4-2 area-3 drift, data/native-geometry-corrections.json)
 assert.ok(main.tiles.some(t=>t[0]===65&&t[1]===8&&t[2]===95));
 assert.ok(main.pipes?.every(p=>p.to!==room.id));assert.equal(room.pipes?.length,3);
 assert.deepEqual([...(room.pipes??[])].sort((a,b)=>b.x-a.x).map(p=>[p.x,p.y,p.targetLevel,p.to]),[[944,160,'6-1','main'],[880,160,'7-1','main'],[816,160,'8-1','main']]);
 assert.deepEqual(room.overlays?.slice(1).map(o=>o.text),['8','7','6']);
});

for(const [center,target]of [[944,'6-1'],[880,'7-1'],[816,'8-1']]as const)test(`the actual compiled4-2 pipe at${center} enters${target} under ordinary down input`,()=>{
 const all=observedLevels(),level=structuredClone(all.find(l=>l.id==='4-2')!);level.main='vine-warp-zone';const room=level.areas.find(a=>a.id===level.main)!;
 // An isolated entrance fixture, not a fresh campaign traversal.
 room.spawn=[center-8,160];room.camera=768;room.entryVine=undefined;
 const sim=new Simulation([level,...all.filter(l=>l.id!=='4-2')]);sim.reset(true);
 sim.step(['down'],3);assert.equal(sim.phase,'pipe');sim.step([],64);
 assert.equal(sim.phase,'intro');assert.equal(sim.level.id,target);assert.equal(sim.area.id,'main');assert.equal(sim.camera,0);
 assert.deepEqual([sim.player.x,sim.player.y],[40,208]);assert.equal(sim.lives,3);
});

test('the common warp candidate matches both independent transition timing brackets within two native frames',()=>{
 const observations=JSON.parse(readFileSync(new URL('../data/warp-destination-measurements.json',import.meta.url),'utf8'));
 const distance=(value:number,range:number[])=>Math.max(range[0]-value,value-range[1],0);
 for(const measured of observations.measurements){
  const all=observedLevels(),level=structuredClone(all.find(l=>l.id==='4-2')!);level.main='vine-warp-zone';const room=level.areas.find(a=>a.id===level.main)!;
  room.spawn=[measured.entrance.centerX-8,160];room.camera=768;room.entryVine=undefined;
  const sim=new Simulation([level,...all.filter(l=>l.id!=='4-2')]);sim.reset(true);let firstIntro:number|undefined;const phase=():string=>sim.phase;
  sim.step(['down'],3);assert.equal(sim.frame,3);assert.equal(phase(),'pipe');
  for(let frame=4;frame<=300;frame++){
   const before:number=sim.frame;sim.step([],1);assert.equal(sim.frame-before,1);
   if(phase()==='intro'&&sim.phaseFrame>=TRANSITIONS.introHiddenBeforeFrame&&firstIntro===undefined)firstIntro=sim.frame;
   if(phase()==='play')break;
  }
  assert.equal(firstIntro,observations.timingCandidate.predictedFirstIntroAfter);assert.equal(sim.frame,observations.timingCandidate.predictedFirstPlayAfter);
  assert.ok(distance(firstIntro!,measured.timing.firstIntroAfter)<=observations.timingCandidate.toleranceNativeFrames);
  assert.ok(distance(sim.frame,measured.timing.firstPlayAfter)<=observations.timingCandidate.toleranceNativeFrames);
  assert.equal(sim.level.id,measured.destination.level);
 }
});

test('hitting the compiled4-2 vine brick activates actual growth through the production collision',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';const main=level.areas.find(a=>a.id===level.main)!;
 // A local collision fixture starts on a revealed step. It does not claim a
 // fresh campaign route; the actual observed brick/vine remain unmodified.
 main.spawn=[1024,128];main.spawnVelocity=[0,0];main.entryFall=undefined;main.camera=944;main.enemies=[];main.tiles.push([64,8,196]);
 const sim=new Simulation([level]);sim.reset(true);sim.step(['a'],40);
 assert.equal(sim.tiles.get('64,5'),196);assert.ok(sim.vines.find(v=>v.id==='warp-vine')!.height>0);assert.equal(sim.phase,'play');
 sim.step([],220);assert.equal(sim.vines.find(v=>v.id==='warp-vine')!.height,112);
});

test('the compiled4-2 vine connects to a growing room entrance and lands on its observed floor',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-2')!);level.main='area-3';const main=level.areas.find(a=>a.id===level.main)!;
 // This geometric fixture begins touching an already grown stem above its
 // brick. Reaching the vine from the campaign entrance is a separate play test.
 main.spawn=[1033,70];main.camera=944;main.spawnVelocity=[0,0];main.entryFall=undefined;main.enemies=[];
 main.vines!.find(v=>v.id==='warp-vine')!.initialHeight=112;
 const sim=new Simulation([level]);sim.reset(true);sim.step(['up'],12);assert.equal(sim.area.id,'area-3');assert.ok(sim.player.y<64);
 sim.step([],500);assert.equal(sim.area.id,'vine-warp-zone');assert.equal(sim.vineEntryStage,undefined);
 assert.deepEqual([sim.player.x,sim.player.y],[75,208]);assert.equal(sim.player.grounded,true);assert.equal(sim.phase,'play');assert.equal(sim.lives,3);
});

test('ordinary game-over restart preserves monotonic bridge advancement while explicit reset returns to zero',()=>{
 const source=area({spawn:[40,208]});const sim=new Simulation([{id:'fixture',time:1,main:'main',areas:[source],evidence:'Synthetic timeout/restart fixture'}]);sim.reset(true);
 sim.step([],1400);assert.equal(sim.phase,'gameover');const before=sim.frame;sim.step(['start'],1);
 assert.equal(sim.phase,'gameover');assert.equal(sim.frame-before,1);sim.step([],4);assert.equal(sim.gameoverClosing,true);sim.step([],26);
 assert.equal(sim.phase,'title');assert.equal(sim.frame-before,31);assert.equal(sim.lives,3);
 sim.step([],2);const title=sim.frame;sim.step(['start'],1);assert.equal(sim.phase,'intro');assert.equal(sim.frame,title);
 sim.step([],TRANSITIONS.introFrames);assert.equal(sim.phase,'play');assert.equal(sim.frame,title+TRANSITIONS.introFrames);
 sim.reset(true);assert.equal(sim.frame,0);
});

test('ordinary ending restart also preserves the current controller clock',()=>{
 const source=area({spawn:[40,208],theme:'castle',exit:{kind:'axe',x:56,y:192,retainerX:128,stopX:112}});
 const sim=new Simulation([{id:'8-4',time:1,main:'main',areas:[source],evidence:'Synthetic physical axe/ending/restart fixture'}]);sim.reset(true);
 sim.step(['right'],20);assert.equal(sim.phase,'castle');sim.step([],500);assert.equal(sim.phase,'ending');const frame=sim.frame;
 sim.step(['start'],1);assert.equal(sim.phase,'title');assert.equal(sim.frame,frame+1);
});
