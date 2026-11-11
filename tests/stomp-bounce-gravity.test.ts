import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

// Native stomp bounce gravity is the fall gravity of the last takeoff's class, whatever A does (r5 model rows, 468 bounces: run 0.5625 x313,
// walk 0.4375 x166, medium 0.375 x18). Native excerpt, 1-2 mood0 row 3740, a walk-class jump from rest stomping with A held through the bounce:
// vy bytes from the bounce row -4,-4,-4,-3,-3,-2,-2,-1,-1,-1,0,0,1,1 (the remake used the run gravity 0.5625: -4,-4,-3,-3,-2,-1,-1,0,...).
const NATIVE_WALK_BOUNCE=[-4,-4,-4,-3,-3,-2,-2,-1,-1,-1,0,0,1,1];

function fixture(){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:70,y:208}],spawn:[40,208],evidence:'Synthetic stomp bounce gravity fixture'};
 const level:Level={id:'bounce-fixture',time:400,main:area.id,areas:[area],evidence:'Stomp bounce gravity regression only'};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('a stomp bounce after a walk-class jump falls with the walk gravity even with A held',()=>{
 const sim=fixture();const vys:number[]=[];let bounced=false;
 for(let frame=0;frame<400&&vys.length<NATIVE_WALK_BOUNCE.length;frame++){
  const before=sim.player.vy;
  sim.step(['a'],1); // one jump from rest (walk class), A held through the stomp and the bounce
  if(!bounced&&before>0&&sim.player.vy<=-3.5)bounced=true;
  if(bounced)vys.push(Math.floor(sim.player.vy));
 }
 assert.ok(bounced,'Mario stomps the Goomba');
 assert.deepEqual(vys,NATIVE_WALK_BOUNCE);
});

// Native 8-2 (r6, all 8 moods, row 106): a Koopa stomp at falling speed 1.875 bounces to y 128,125,122,120,119,118,117 (rise 11): the stomp sets
// the whole part of the speed to -4 and keeps its sub-pixel part (-3.125); a flat -4.00 rose 16 px. At the fall cap the part is 0 (test above).
test('a stomp bounce keeps the sub-pixel part of the falling speed',()=>{
 const sim=fixture(),e=sim.enemies[0],p=sim.player;sim.step([],1);
 p.x=e.x;p.y=e.y-20;p.vy=1.3125;p.grounded=false;
 const vys:number[]=[];for(let frame=0;frame<6&&p.vy>0;frame++){sim.step([],1);vys.push(p.vy);}
 assert.deepEqual(vys,[1.75,2.1875,2.625,3.0625,-3.5]); // contact at falling speed 3.5: -4 + 0.5 (flat rule: -4)
});
