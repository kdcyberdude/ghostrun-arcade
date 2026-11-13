import {test} from 'node:test';
import assert from 'node:assert/strict';
import {landNativeWalker} from '../src/native-walker-motion.js';
import events from './fixtures/native-walker-landings.json';

test('all native ordinary-walker landings snap and clear gravity, keep fraction, and face Mario before movement',()=>{
 assert.ok(events.length>30);
 for(const event of events){
  const n={...event.before};landNativeWalker(n,event.goomba,event.marioX);n.x+=n.vx;
  assert.deepEqual(n,event.after,`${event.level} row${event.row}`);
 }
});

test('native ID3 initializes falling and faces Mario on its first landing before enabling ledge avoidance',async()=>{
 const {Simulation}=await import('../src/simulation.js');
 const tiles=Array.from({length:40},(_,x)=>[x,13,84] as [number,number,number]);
 const sim:any=new Simulation([{id:'native-red-init',time:400,main:'main',evidence:'InitRedKoopa/ProcEnemyDirection fixture',areas:[{id:'main',width:640,palette:0,theme:'ground',tiles,enemies:[{kind:'redKoopa',nativeId:3,nativeOffset:0,nativeColumn:352,x:352,y:208,direction:-1}],spawn:[40,208],evidence:'source state1 landing'}]}]);sim.reset(true);
 sim.camera=50;sim.player.x=400;sim.groupParserSlot=0;sim.groupSlotsBefore=[false,false,false,false,false];sim.passNativeObjects();
 const e=sim.enemies[0];assert.equal(e.walkerState,1);assert.equal(e.vx,-0.5);
 sim.updateEnemies(sim.player.y);
 assert.equal(e.walkerState,0);assert.equal(e.x,352.5);assert.equal(e.vx,0.5);
});
