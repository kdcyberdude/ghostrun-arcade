import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

function fixture(){
 const level=structuredClone(observedLevels().find(l=>l.id==='8-4')!);level.main='area-2';
 const sim:any=new Simulation([level]);sim.reset(true);sim.area.enemies=[];sim.enemies=[];
 sim.time=133;sim.timerFrames=5;return sim;
}

test('pipe rise counts the native timer controller down and consumes its pending tick on engine8 resumption',()=>{
 // 8-4 v2 row6574: engine7, y145, $0787=0, time133. Row6575 ends
 // the rise at y144 and switches to engine8: $0787=24, time132.
 const sim=fixture(),x=sim.player.x,y=sim.player.y;sim.beginPipeRise(96);
 for(let f=0;f<95;f++){sim.step([],1);assert.equal(sim.time,133);assert.equal(sim.player.x,x);}
 assert.equal(sim.timerFrames,24,'controller has expired while the digits stayed frozen');
 sim.step([],1);assert.equal(sim.pipeRising,false);assert.equal(sim.player.y,y);
 assert.equal(sim.time,132);assert.equal(sim.timerFrames,0);
 sim.step([],23);assert.equal(sim.time,132);sim.step([],1);assert.equal(sim.time,131);
});

test('pipe entry may expire the timer controller without changing the displayed digits',()=>{
 const sim=fixture();sim.phase='pipe';sim.phaseFrame=0;
 sim.destination={area:'area-2',spawn:[56,176],direction:'down',frames:74,riseFrames:96};
 sim.step([],30);assert.equal(sim.timerFrames,24);assert.equal(sim.time,133);
});
