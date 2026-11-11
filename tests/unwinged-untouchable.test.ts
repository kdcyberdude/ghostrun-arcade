import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

/**
 * Native probe (3-1 route stomp row 21010, Koopa y 151: state byte 1 on 21012-21029, landed 21030; 8-2 ~70094, Koopa y 176:
 * state 1 on 70096-70104, 0 on 70105): a just-unwinged Koopa is untouched (no stomp, no hurt) exactly while airborne; it
 * is touchable again once on the ground. The old test encoded a fixed 8-row window; native shows the duration follows the fall height.
 */
function fixture(y:number){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'paratroopa',x:100,y}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'unwinged-fixture',time:400,main:area.id,areas:[area],evidence:'unwinged untouchable regression only'};
 const sim=new Simulation([level]);sim.reset(true);sim.enemies[0].active=true;return sim;
}
test('a stomped Paratroopa becomes a Koopa that Mario falls through until it lands, then it is touchable',()=>{
 const sim=fixture(150),koopa=sim.enemies[0];
 Object.assign(sim.player,{x:100,y:140,vx:0,vy:2,grounded:false});
 sim.step([],1);sim.step([],1);assert.equal(koopa.kind,'koopa');assert.ok(koopa.unwingedAir);
 let airRows=0;
 while(koopa.unwingedAir&&airRows<60){
  Object.assign(sim.player,{x:koopa.x,y:koopa.y<190?koopa.y+2:100,vx:0,vy:2,grounded:false});
  const score=sim.score;sim.step([],1);airRows++;
  if(koopa.unwingedAir){assert.equal(sim.score,score);assert.ok(!sim.player.dead);assert.ok(!koopa.shell);}
 }
 assert.ok(airRows>=12&&airRows<=25,`air rows ${airRows}`);
 assert.equal(koopa.vy,0);
 Object.assign(sim.player,{x:koopa.x,y:koopa.y-5,vx:0,vy:2,grounded:false});
 sim.broClock|=1; // native stomp contact is tested only on even counter rows (route 51 of 51, stompedge probe); the step increments the counter
 sim.step([],1);assert.ok(koopa.shell);assert.equal(sim.events.includes('sfx_stomp'),true);
});
test('a shorter fall keeps the Koopa untouchable for fewer rows than a longer one',()=>{
 const rows=(y:number)=>{const sim=fixture(y),k=sim.enemies[0];Object.assign(sim.player,{x:100,y:y-10,vx:0,vy:2,grounded:false});sim.step([],1);sim.step([],1);let n=0;while(k.unwingedAir&&n<80){Object.assign(sim.player,{x:300,y:100,vx:0,vy:0,grounded:false});sim.step([],1);n++;}return n;};
 assert.ok(rows(176)<rows(151));
});
