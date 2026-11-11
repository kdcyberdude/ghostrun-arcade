import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

for(const x of [1586,1613])test(`World 5-3 canopy supports a falling player at x=${x}`,()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='5-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=[];area.generators=[];area.exit=undefined;
 const s=new Simulation([level]);s.reset(true);s.loadArea('main',[x,174],x-112);
 s.player.vy=2;s.player.grounded=false;s.step([],2);
 assert.equal(s.player.y,176);assert.equal(s.player.grounded,true);
});
