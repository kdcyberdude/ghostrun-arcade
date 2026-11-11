import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

/** Native 3-1 row 21010: a falling Mario (vy 4) whose feet (183) are 8 px below the feet of a rising Paratroopa (175) still stomps it. */
function fixture(){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'paratroopa',x:100,y:175}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'deep-stomp-fixture',time:400,main:area.id,areas:[area],evidence:'paratroopa deep stomp regression only'};
 const sim=new Simulation([level]);sim.reset(true);Object.assign(sim.enemies[0],{active:true,x:100,y:175,vx:0,vy:0});return sim;
}
test('a falling Mario 8 px below the feet of a Paratroopa stomps it (native 3-1 21010)',()=>{
 const sim=fixture(),enemy=sim.enemies[0];
 Object.assign(sim.player,{x:100,y:179,vx:0,vy:4,grounded:false});
 sim.broClock=1;sim.step([],1);assert.equal(sim.events.includes('sfx_stomp'),true);assert.equal(enemy.kind,'koopa');assert.equal(sim.player.vy,-4);
});
