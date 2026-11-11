import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

/** Native Goomba stomp window (stompedge probe, ~4,200 branches on the 1-1 first Goomba; route: 51 of 51 stomps on even values of the frame counter RAM 0x09): a falling Mario
 * stomps a Goomba only on an even counter row, when his integer x after his own move is within 10 px of the Goomba's integer x before its step (both sides; dx >= 11 never
 * registers) and his feet are at most 10 px above the Goomba's feet. */
function fall(dx:number,gap:number,evenRow:boolean){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:200,y:208}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'goomba-window-fixture',time:400,main:area.id,areas:[area],evidence:'native Goomba stomp window regression only'};
 const sim=new Simulation([level]);sim.reset(true);
 const e=sim.enemies[0];e.active=true;e.vx=0;
 Object.assign(sim.player,{x:200-dx,y:208-gap-3,vx:0,vy:3,grounded:false});sim.broClock=evenRow?1:0; // the step increments the counter, then Mario falls 3 px
 sim.step([],1);
 return sim.events.includes('sfx_stomp');
}
test('a Goomba is stomped at dx 10 on either side, never at dx 11',()=>{
 assert.equal(fall(10,8,true),true);assert.equal(fall(-10,8,true),true);
 assert.equal(fall(11,8,true),false);assert.equal(fall(-11,8,true),false);
});
test('no Goomba contact on an odd counter row; feet more than 10 px above do not stomp',()=>{
 assert.equal(fall(4,8,false),false);
 assert.equal(fall(4,10,true),true);assert.equal(fall(4,12,true),false);
});

/** Koopa and red Koopa (stompedge probe, Koopa branches): the same post-move Mario x against the pre-step Koopa x, but |dx| <= 11 stomps and dx 12 never does. */
function fallKoopa(dx:number){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'koopa',x:200,y:208}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'koopa-window-fixture',time:400,main:area.id,areas:[area],evidence:'native Koopa stomp window regression only'};
 const sim=new Simulation([level]);sim.reset(true);
 const e=sim.enemies[0];e.active=true;e.vx=0;
 Object.assign(sim.player,{x:200-dx,y:208-8-3,vx:0,vy:3,grounded:false});sim.broClock=1;
 sim.step([],1);
 return sim.events.includes('sfx_stomp');
}
test('a Koopa is stomped at dx 11 on either side, never at dx 12',()=>{
 assert.equal(fallKoopa(11),true);assert.equal(fallKoopa(-11),true);
 assert.equal(fallKoopa(12),false);assert.equal(fallKoopa(-12),false);
});
