import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Area,Level,Tile} from '../src/types.js';

/** stomp8: the 144 native Paratroopa bounces fit the Koopa window measured on the Paratroopa's PRE-step y (explore-r4 8-2 mood3 row 2336:
 * native gap -8 before its step, -10 after it -> native stomps). Odd counter rows never register. */
function fixture(evenRow:boolean){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,14,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'paratroopa',x:200,y:200}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'para-window-fixture',time:400,main:area.id,areas:[area],evidence:'paratroopa stomp window only'};
 const sim=new Simulation([level]);sim.reset(true);Object.assign(sim.enemies[0],{active:true,x:200,y:200,vx:0,vy:2});
 Object.assign(sim.player,{x:195,y:205,vx:0,vy:3,grounded:false});sim.broClock=evenRow?1:0;return sim;
}
test('a Paratroopa is stomped on its pre-step y (gap -8 before its step, -10 after)',()=>{
 const sim=fixture(true);sim.step([],1);
 assert.equal(sim.events.includes('sfx_stomp'),true);assert.equal(sim.enemies[0].kind,'koopa');
});
test('an odd counter row does not register the Paratroopa stomp',()=>{
 const sim=fixture(false);sim.step([],1);
 assert.equal(sim.events.includes('sfx_stomp'),false);
});
test('8-2 Paratroopa at x 1520 appears at the native camera (row 70203: camera 1224)',()=>{
 const spec=observedLevels().find(l=>l.id==='8-2')!.areas.find(a=>a.id==='main')!.enemies.find(e=>e.kind==='paratroopa'&&e.x===1520)!;
 assert.equal(spec.spawnCamera,1224);
});
