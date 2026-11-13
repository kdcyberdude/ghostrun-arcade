import {test} from 'node:test';import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';import {observedLevels} from '../src/levels.js';
test('native end music consumes gameplay queues on the next NMI, including source Star restoration',()=>{
 const sim:any=new Simulation(observedLevels());sim.reset(true);sim.inputs=[];sim.nativeEndLevelMusicQueue=32;
 sim.step([],1);assert.deepEqual(sim.nativeEndLevelMusic,{eventMusicBuffer:32,counter:8,length:8,offset:2});assert.equal(sim.nativeEndLevelMusicQueue,0);
 sim.player.star=4;sim.intervalControl=1;sim.step([],1);
 assert.equal(sim.nativeEndLevelMusic.eventMusicBuffer,32,'the current gameplay queue does not run the earlier SoundEngine turn');assert.equal(sim.nativeEndLevelMusicAreaQueue,1,'GetAreaMusic selects the native ground-music bit');
 sim.step([],1);assert.equal(sim.nativeEndLevelMusic.eventMusicBuffer,0);assert.equal(sim.nativeEndLevelMusicAreaQueue,0);
});
