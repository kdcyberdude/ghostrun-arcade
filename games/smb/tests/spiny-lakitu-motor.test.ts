// Conditional component regressions for the source-supported Spiny motor.
// Image observations motivate stationary flight and the two non-equal landing
// directions; fixtures do not assert unmeasured native collision coordinates.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Area,Enemy,Level,Tile} from '../src/types.js';

function game(playerX:number,lakitu=false){
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const area:Area={id:'main',width:1024,palette:0,theme:'ground',tiles,enemies:lakitu?[{kind:'lakitu',x:160,y:64}]:[],spawn:[playerX,208],evidence:'Conditional component regression'};
 const level:Level={id:'spiny-fixture',time:400,main:'main',areas:[area],evidence:'Not a reference-matched traversal'};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('a Lakitu-spawned egg stays horizontally fixed while falling',()=>{
 const sim=game(40,true);sim.step([],30);const egg=sim.enemies.find(e=>e.kind==='spiny');assert.ok(egg);assert.equal(egg.motion,'falling');const x=egg.x;
 for(let i=0;i<30;i++){sim.step([],1);assert.equal(egg.motion,'falling');assert.equal(egg.x,x);}
});

for(const [side,playerX,direction] of [['left',80,-1],['right',280,1]] as const)test(`a falling egg starts walking toward Mario on its ${side} at landing`,()=>{
 const sim=game(playerX);const egg=(sim as any).makeEnemy({kind:'spiny',motion:'falling',x:200,y:200,palette:'0f-16-30-27'}) as Enemy;
 egg.active=true;egg.vx=0;egg.vy=3;sim.enemies=[egg];
 for(let i=0;i<8&&egg.motion==='falling';i++)sim.step([],1);
 assert.equal(egg.motion,undefined);assert.equal(egg.y,208);assert.equal(egg.vx,direction*0.5);
 const landingX=egg.x;sim.step([],4);assert.equal(egg.x,landingX+direction*2);
});
