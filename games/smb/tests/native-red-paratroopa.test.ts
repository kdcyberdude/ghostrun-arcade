import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceNativeRedFlight,createNativeRedFlight} from '../src/red-paratroopa.js';
import events from './fixtures/native-walker-events.json';

test('red vertical Paratroopa byte motor matches every row of every v2 flight',()=>{
 assert.ok(events.redFlights.length>500);
 for(const e of events.redFlights){
  const n={...e.before};advanceNativeRedFlight(n,e.frame);
  const {y,speed,force,fraction}=n;
  assert.deepEqual({y,speed,force,fraction},e.after,`${e.level} row ${e.row}`);
 }
});

test('red flight initializes its centre 48 pixels below low spawns, 32 above high spawns',()=>{
 assert.deepEqual(createNativeRedFlight(64,55),{y:64,speed:0,force:0,fraction:55,originalY:40,centerY:88});
 assert.equal(createNativeRedFlight(184).centerY,128);
});

test('a departed red flyer leaves its vertical state and original-y alias for the next slot occupant',async()=>{
 const {Simulation}=await import('../src/simulation.js');
 const sim:any=new Simulation([{id:'fixture',main:'main',time:400,evidence:'Native 3-3 slot0 residue at row885',areas:[{id:'main',width:4096,palette:0,theme:'ground',tiles:[],enemies:[{kind:'paratroopa',x:1824,y:96,palette:'0f-16-30-27'}],spawn:[40,208],evidence:'slot reuse only'}]}]);
 sim.reset(true);const e=sim.enemies[0];
 Object.assign(e,{active:true,enemySlot:0,redFlight:{y:188,speed:0,force:102,fraction:55,originalY:72,centerY:120}});
 sim.rememberSlotVertical();sim.camera=1897;sim.eraseOffscreenEnemies();
 assert.deepEqual(sim.slotVertical[0],{speed:0,force:102,fraction:55});
 assert.equal(sim.slotSub[0],72,'$0401 holds original y, not the stationary x fraction');
 assert.equal(e.slotFreed,true);
});
