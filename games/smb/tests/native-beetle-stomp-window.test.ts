import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

/** Beetle stomp window (area `stomp7`, evidence/stomp7-findings-20261111.md): the Koopa rule. 19 native Beetle bounces in the route and the
 * explore-r1..r4 model traces, Mario's integer x on the contact row against the Beetle's x on the row before: |dx| 1..11, feet 4..15 px above
 * (route 8-1 row 67687 dx 11 gap 4, 5-2 row 41390 dx -2 gap 13). Contact only on even counter rows, as for every walker. */
function fall(dx:number,gap:number,evenRow=true){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'beetle',x:200,y:208}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'beetle-window-fixture',time:400,main:area.id,areas:[area],evidence:'native Beetle stomp window regression only'};
 const sim=new Simulation([level]);sim.reset(true);
 const e=sim.enemies[0];Object.assign(e,{active:true,vx:0,vy:0});
 Object.assign(sim.player,{x:200-dx,y:208-gap-3,vx:0,vy:3,grounded:false});sim.broClock=evenRow?1:0; // the step increments the counter, then Mario falls 3 px
 sim.step([],1);
 return sim.events.includes('sfx_stomp');
}
test('a Beetle is stomped at dx 11 on either side, never at dx 12',()=>{
 assert.equal(fall(11,4),true);assert.equal(fall(-11,4),true);
 assert.equal(fall(12,4),false);assert.equal(fall(-12,4),false);
});
test('a Beetle is stomped with the feet 15 px above, not 16, and not on an odd counter row',()=>{
 assert.equal(fall(4,15),true);assert.equal(fall(4,16),false);
 assert.equal(fall(4,4,false),false);
});
