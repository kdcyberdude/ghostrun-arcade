import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';

function game(){
 const tiles:Tile[]=Array.from({length:32},(_,x)=>[x,13,84]);
 const level:Level={id:'controller-fixture',main:'main',time:400,evidence:'Ordinary-input two-controller isolation fixture',areas:[{id:'main',width:512,palette:0,theme:'ground',tiles,enemies:[{kind:'goomba',x:160,y:208,direction:-1,spawnCamera:0}],spawn:[40,208],evidence:'test'}]};
 return new Simulation([level]);
}

test('either controller may select or start at the title; direction and A do not select or start',()=>{
 const sim=game();
 for(const button of ['up','down','a'] as const){sim.step([button],4);sim.step([],4);assert.equal(sim.phase,'title');assert.equal(sim.twoPlayer,false);}
 sim.step(['select','start'],10);sim.step([],10);assert.equal(sim.phase,'title');assert.equal(sim.twoPlayer,false);
 sim.step([],1,['select']);sim.step([],1,[]);assert.equal(sim.twoPlayer,true);
 sim.step([],1,['start']);assert.equal(sim.phase,'intro');
});

test('Mario and Luigi respond to their own controllers across a real death and handoff',()=>{
 const sim=game();sim.twoPlayer=true;sim.reset(true);
 const start=sim.player.x;sim.step([],30,['right','b']);assert.equal(sim.player.x,start,'controller 2 must not move Mario');
 sim.step(['right','b'],30);assert.ok(sim.player.x>start+10,'controller 1 moves Mario');
 let n=0;while(sim.phase==='play'&&n++<300)sim.step(['right','b']);assert.equal(sim.phase,'dying');
 const playing=()=>sim.phase==='play';
 n=0;while((sim.currentPlayer!==1||!playing())&&n++<1000)sim.step([]);assert.equal(sim.currentPlayer,1);assert.equal(sim.phase,'play');
 const luigi=sim.player.x;sim.step(['right','b'],30);assert.equal(sim.player.x,luigi,'controller 1 must not move Luigi');
 sim.step([],30,['right','b']);assert.ok(sim.player.x>luigi+10,'controller 2 moves Luigi');
});

test('batched input selects the active controller on every frame through a turn change',()=>{
 const batched=game(),individual=game();for(const sim of [batched,individual]){sim.twoPlayer=true;sim.reset(true);}
 batched.step(['right','b'],450,['right','b']);
 let sawLuigi=false;for(let i=0;i<450;i++){individual.step(['right','b'],1,['right','b']);sawLuigi||=individual.currentPlayer===1;}
 assert.equal(sawLuigi,true,'ordinary enemy contact must hand control to Luigi during the batch');
 assert.deepEqual({frame:batched.frame,phase:batched.phase,currentPlayer:batched.currentPlayer,player:batched.player,camera:batched.camera},
  {frame:individual.frame,phase:individual.phase,currentPlayer:individual.currentPlayer,player:individual.player,camera:individual.camera});
});
