import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

function fixture(){
 const tiles:Tile[]=Array.from({length:40},(_,x)=>[x,13,84]);
 const level:Level={id:'pause-fixture',main:'main',time:400,evidence:'Isolated control fixture',areas:[{id:'main',width:640,palette:0,theme:'ground',spawn:[40,208],tiles,enemies:[],evidence:'Isolated control fixture'}]};
 const s=new Simulation([level]);s.reset(true);return s;
}

for(const separation of [32,44,45,46])test(`second Start at separation ${separation} uses the source-observed boundary`,()=>{
 const s=fixture();s.step(['start']);assert.equal(s.paused,true);const frame=s.frame;
 s.step([],separation-1);s.step(['start']);assert.equal(s.paused,separation<45);assert.equal(s.frame,frame+(separation>=45?1:0));
});
test('a held Start does not retrigger when the cooldown elapses',()=>{
 const s=fixture();s.step(['start'],60);assert.equal(s.paused,true);s.step([],1);s.step(['start']);assert.equal(s.paused,false);
});
test('reset clears an active pause cooldown',()=>{
 const s=fixture();s.step(['start']);assert.equal(s.paused,true);s.reset(true);s.step(['start']);assert.equal(s.paused,true);
});
for(const separation of [44,45])test(`after unpausing, re-pause at separation ${separation} follows the same source boundary`,()=>{
 const s=fixture();s.step(['start']);s.step([],44);s.step(['start']);assert.equal(s.paused,false);
 s.step([],separation-1);s.step(['start']);assert.equal(s.paused,separation>=45);
});
