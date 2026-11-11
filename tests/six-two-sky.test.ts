import {test} from 'node:test';
import assert from 'node:assert/strict';
import {observedLevels} from '../src/levels.js';
import {Simulation} from '../src/simulation.js';
import {PlatformMotion,platformMotionModel} from '../src/platform-motion.js';
import observations from '../data/six-two-vine.json';

function mainFixture(spawn:[number,number]){
 const level=structuredClone(observedLevels().find(l=>l.id==='6-2')!),main=level.areas.find(a=>a.id==='main')!;
 main.spawn=spawn;main.camera=1183;main.enemies=[];
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('6-2 retains its distinct 95-column sky map and explicit occlusions',()=>{
 const level=observedLevels().find(l=>l.id==='6-2')!,room=level.areas.find(a=>a.id==='6-2-vine-sky');
 assert.ok(room,'accepted sky destination is compiled');assert.equal(room.width,95*16);
 assert.equal(room.background,'#000000');assert.equal(room.palette,15);
 assert.deepEqual(room.tiles,observations.destination.tiles);
 assert.equal(room.tiles.length,146);assert.equal(room.tiles.filter(t=>t[2]===194).length,52);
 for(const [col,row]of observations.destination.unknownCells)assert.equal(room.tiles.some(t=>t[0]===col&&t[1]===row),false);
 assert.deepEqual(room.fallExit?.spawn,[2600,0]);assert.equal(room.fallExit?.camera,2560);
});

test('ordinary head hits reveal the 6-2 hidden coin step and grow the observed vine brick',()=>{
 const step=mainFixture([1312,208]);assert.equal(step.tileAt(1312,144),95);
 step.step(['a'],24);assert.equal(step.tileAt(1312,144),196);assert.equal(step.coins,1);
 step.step([],80);assert.equal(step.player.y,208);
 const vine=mainFixture([1296,160]);
 for(const col of [77,78,79,80,81])assert.equal(vine.tileAt(col*16,80),81);
 vine.step(['a'],24);assert.equal(vine.tileAt(1296,80),196);
 assert.ok(vine.vines.find(v=>v.id==='6-2-sky-vine')!.height>0);
});

test('6-2 neutral automatic sky entry reaches the observed standing pose',()=>{
 const level=observedLevels().find(l=>l.id==='6-2')!,sim=new Simulation([level]);sim.reset(true);sim.loadArea('6-2-vine-sky');
 sim.step([],500);assert.equal(sim.area.id,'6-2-vine-sky');assert.equal(sim.player.x,75);assert.equal(sim.player.y,208);assert.equal(sim.lives,3);
 assert.deepEqual(sim.area.platforms,[{x:256,y:161,width:32,axis:'x',range:0,speed:1}]);
});

test('ordinary controls reveal and stand on the hidden step, attach to the grown vine and enter the sky',()=>{
 // The jump script is 28 left / 14 right frames (was 32 / 14, then 28 / 12; the neutral coast against the facing now doubles its friction): the native-speed motor changes per-frame travel; this pair
 // reaches the vine for every approach of 17..21 frames, preserving the intended robustness.
 for(const approachFrames of[18,19,20]){
 const sim=mainFixture([1296,160]);
 sim.step(['a'],24);sim.step([],240);assert.equal(sim.tileAt(1296,80),196);
 sim.step(['right'],20);sim.step([],90);sim.step(['a'],24);sim.step([],80);
 assert.equal(sim.tileAt(1312,144),196);assert.equal(sim.coins,1);
 sim.step(['right'],approachFrames);sim.step([],40);sim.step(['left','a'],28);sim.step(['right'],14);sim.step([],60);
 assert.equal(sim.player.y,144);assert.equal(sim.player.grounded,true);
 sim.step(['left','a'],24);sim.step(['up'],240);sim.step([],500);
 assert.equal(sim.area.id,'6-2-vine-sky');assert.deepEqual([sim.player.x,sim.player.y],[75,208]);assert.equal(sim.lives,3);
 }
});

test('6-2 four-orb cloud stays at its observed anchor before contact and uses the qualified common contact candidate',()=>{
 const room=observedLevels().find(l=>l.id==='6-2')!.areas.find(a=>a.id==='6-2-vine-sky')!,platform=room.platforms![0];
 const context={levelId:'6-2',areaId:room.id},motion=new PlatformMotion(context);
 assert.equal(platformMotionModel(platform,context),'contact-cloud');
 for(const sample of observations.destination.platformObservations)assert.deepEqual(motion.artworkPosition(platform,sample.nativeFramesSinceTick6690),{x:256,y:161});
 motion.contact(platform,300);assert.deepEqual(motion.artworkPosition(platform,330),{x:286,y:161});
});

test('ordinary walking off the 6-2 cloud floor returns to the main upper platform',()=>{
 const level=observedLevels().find(l=>l.id==='6-2')!,sim=new Simulation([level]);sim.reset(true);sim.loadArea('6-2-vine-sky');sim.step([],500);
 let leftRoom=false,released=false;
 for(let frame=0;frame<1500;frame++){
  if(sim.player.x>=1332)released=true;
  sim.step(released?[]:['right'],1);
  if(sim.area.id==='main')leftRoom=true;
  if(leftRoom&&sim.phase==='play'&&sim.player.grounded)break;
 }
 assert.ok(leftRoom);assert.equal(sim.area.id,'main');assert.equal(sim.lives,3);assert.equal(sim.player.x,2600);assert.equal(sim.player.y,80);assert.equal(sim.camera,2560);
});
