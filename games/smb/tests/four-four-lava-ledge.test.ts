import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 4-4 lava ledge supports the reference-visible second brick',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-4')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.mazes=[];area.maze=undefined;area.exit=undefined;
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[1394,150],1280);
 s.player.vy=2;s.player.grounded=false;s.step([],6);
 assert.equal(s.player.y,160);assert.equal(s.player.grounded,true);
});
