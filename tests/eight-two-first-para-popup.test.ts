import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('Paratroopa stomp displays the awarded score and moves the popup upward',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-2')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===288);
 area.tiles=[];area.freeTiles=[];area.decorations=[];area.patternOverrides=[];area.cannons=[];area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[288,188],128);
 sim.player.vy=1;sim.player.grounded=false;sim.broClock=1;sim.step([],1);
 assert.equal(sim.enemies[0].kind,'koopa');assert.equal(sim.popups.length,1);
 const popup=sim.popups[0],y=popup.y;assert.equal(popup.value,sim.score);
 sim.step([],1);assert.equal(popup.y,y-1);
});
