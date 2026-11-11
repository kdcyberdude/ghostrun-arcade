import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('the observed World 4-3 opening canopy supports a falling player',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='4-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[400,130],300);
 s.player.vy=2;s.player.grounded=false;
 s.step([],12);
 assert.equal(s.player.y,144);
 assert.equal(s.player.grounded,true);
});
