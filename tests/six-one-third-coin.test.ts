import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('World 6-1 third row coin has one grid entry and no offset free duplicate',()=>{
 const area=observedLevels().find(l=>l.id==='6-1')!.areas.find(a=>a.id==='main')!;
 assert.deepEqual(area.tiles.filter(([x,y])=>x===107&&y===8),[[107,8,194]]);
 assert.equal(area.freeTiles?.filter(t=>t.x===1709&&t.y===128&&t.id===194&&t.palette===16).length,0);
});

test('World 6-1 third row coin disappears after normal collection',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='6-1')!);const area=level.areas.find(a=>a.id==='main')!;
 area.tiles=area.tiles.filter(([x,y])=>y!==8||x<105||x>=107);
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1710,144],1512);sim.step([],1);
 assert.equal(sim.coins,1);assert.equal(sim.score,200);assert.equal(sim.events.filter(e=>e==='sfx_coin').length,1);
 assert.equal(sim.tiles.has('107,8'),false);
 assert.equal(sim.freeTiles.some(t=>t.x===1709&&t.y===128&&t.id===194),false);
});
