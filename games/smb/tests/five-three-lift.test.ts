import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import {PlatformMotion} from '../src/platform-motion.js';

test('the 5-3 lift starts on camera approach and resets with its area',()=>{
 // Native 5-3 lift object (reference RAM): created when the scroll position reaches 577 (remake scroll 577), top y=96, and
 // 3px lower after 20 frames (route rows 42987+age). The earlier inferred threshold 624 is where it first becomes visible.
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 const area=level.areas.find(a=>a.id==='main')!;area.enemies=[];
 const game=new Simulation([level]);game.reset(true);game.loadArea('main',[700,79],577);
 const platform=()=>game.area.platforms!.find(p=>p.x===880)!;
 game.step([],1);assert.equal(game.platformPosition(platform()).y,97);
 game.step([],20);assert.equal(game.platformPosition(platform()).y,100);
 game.loadArea('main',[700,79],576);
 const unstarted=new PlatformMotion({levelId:'5-3',areaId:'main'});
 assert.deepEqual(game.platformPosition(platform()),unstarted.artworkPosition(platform(),0));
});

test('a falling player lands on and rides the moving 5-3 lift',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 level.areas.find(a=>a.id==='main')!.enemies=[];
 // The 93 frames only advance the lift clock: Mario waits standing on the ledge top at feet 64 (a mid-air spawn fell into the pit under the native no-jump-yet fall).
 const game=new Simulation([level]);game.reset(true);game.loadArea('main',[700,64],660);game.step([],93);
 const platform=game.area.platforms!.find(p=>p.x===880)!;
 Object.assign(game.player,{x:884,y:game.platformPosition(platform).y-3,vy:4,grounded:false});
 game.step([],1);assert.equal(game.player.grounded,true);assert.equal(game.player.y,game.platformPosition(platform).y-1);
 game.step([],4);assert.equal(game.player.grounded,true);assert.equal(game.player.y,game.platformPosition(platform).y-1);
});
