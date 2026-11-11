import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the lower 4-4 shelf blocks a jump from below',()=>{
 for(const col of [121,122,123]){
  const level=structuredClone(observedLevels().find(l=>l.id==='4-4')!);
  const area=level.areas.find(a=>a.id==='main')!;
  area.enemies=[];area.firebars=[];area.generators=[];area.mazes=[];area.exit=undefined;
  const s=new Simulation([level]);
  s.reset(true);s.loadArea('main',[col*16,208],col*16-112);s.step(['a'],8);
  assert.ok(s.player.y>=188,`column ${col} should stop the player's head`);
  assert.ok(s.player.vy>0,`column ${col} should start the player falling`);
 }
});
