import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {PlatformMotion} from '../src/platform-motion.js';

test('the 8-4 platform stays offscreen without a jump when its inferred motor starts',()=>{
 const level=observedLevels().find(l=>l.id==='8-4')!;
 const spec=level.areas.find(a=>a.id==='main')!.platforms![0];
 const motion=new PlatformMotion({levelId:'8-4',areaId:'main'});
 motion.advance(283,648);const before=motion.artworkPosition(spec,283);
 assert.ok(before.x-648>=256);
 motion.advance(284,650);assert.deepEqual(motion.artworkPosition(spec,284),before);
 motion.reset();assert.deepEqual(motion.artworkPosition(spec,283),before);
});

test('the 8-4 platform carries a rider as it moves',()=>{
 // The platform is the native horizontal object (x 1120 down to 1067), created when the scroll reaches its spawn camera; the earlier model
 // had it near x 940 and the test stood the rider at camera 800, where a player at x 1130 is outside the 240 px play window.
 const level=structuredClone(observedLevels().find(l=>l.id==='8-4')!);
 const game=new Simulation([level]);game.reset(true);game.loadArea('main',[820,160],650);game.step([],1);
 const platform=game.area.platforms![0];
 game.camera=900;game.step([],1);
 const start=game.platformPosition(platform);
 Object.assign(game.player,{x:start.x+10,y:start.y-1,vx:0,vy:0,grounded:true});
 let moved=0;
 for(let i=0;i<60;i++){
  const before=game.platformPosition(platform);game.step([],1);const after=game.platformPosition(platform);moved+=Math.abs(after.x-before.x);
  assert.equal(game.phase,'play');assert.ok(Math.abs(game.player.x-(after.x+10))<1e-6,`rider offset at step ${i}`);
  assert.equal(game.player.y,after.y-1);
 }
 assert.ok(moved>5,'the platform moved while ridden');
});
