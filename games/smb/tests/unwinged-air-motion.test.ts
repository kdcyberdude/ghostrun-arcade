import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Level,Tile} from '../src/types.js';

/** Airborne motor lifetime only. Falling-state contact is covered by actual
 * PlayerEnemyCollision CPU cases and the natural7-1 restomp prefix in
 * native-player-enemy-latch.test.ts; state1 is not an immunity flag. */
function fixture(y:number){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'paratroopa',x:100,y}],spawn:[40,176],camera:0} as unknown as Area;
 const level:Level={id:'unwinged-fixture',time:400,main:area.id,areas:[area],evidence:'unwinged falling motor regression only'};
 const sim=new Simulation([level]);sim.reset(true);sim.enemies[0].active=true;return sim;
}
test('the unwinged falling motor reaches the floor sooner from the lower starting height',()=>{
 const rows=(y:number)=>{const sim=fixture(y),k=sim.enemies[0];Object.assign(sim.player,{x:100,y:y-10,vx:0,vy:2,grounded:false});sim.step([],1);sim.step([],1);let n=0;while(k.unwingedAir&&n<80){Object.assign(sim.player,{x:300,y:100,vx:0,vy:0,grounded:false});sim.step([],1);n++;}return n;};
 assert.ok(rows(176)<rows(151));
});
