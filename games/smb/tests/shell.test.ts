import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {EnemySpec,Level,Tile} from '../src/types.js';

function fixture(victims=0,wall?:number,victimStart=160){
 const tiles:Tile[]=Array.from({length:80},(_,x)=>[x,13,84]);
 if(wall!==undefined)for(let row=10;row<13;row++)tiles.push([wall,row,97]);
 const enemies:EnemySpec[]=[{kind:'koopa',x:48,y:208,direction:-1},...Array.from({length:victims},(_,i)=>({kind:'goomba' as const,x:victimStart+i*48,y:208,direction:-1}))];
 const level:Level={id:'shell-fixture',time:400,main:'main',evidence:'Synthetic isolated collision terrain; Mario begins falling above an approaching Koopa, with no state changes after reset',areas:[{id:'main',width:1280,palette:0,theme:'ground',tiles,enemies,spawn:[40,176],evidence:'test'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
function stompAndMoveAside(sim:Simulation){
 const koopa=sim.enemies[0];let frames=0;
 while(!koopa.shell&&sim.phase==='play'&&frames++<100)sim.step(['left'],1);
 assert.equal(koopa.shell,true,'falling contact must stomp the approaching Koopa');
 assert.equal(sim.score,100);sim.step(['left'],45);
 assert.equal(sim.phase,'play');assert.equal(koopa.movingShell,false,'moving left during the bounce must leave an idle shell');
 return koopa;
}
function kick(sim:Simulation){
 const shell=stompAndMoveAside(sim);let frames=0;
 while(!shell.movingShell&&sim.phase==='play'&&frames++<100)sim.step(['right','b'],1);
 assert.equal(shell.movingShell,true,'ordinary side contact must kick the idle shell');assert.equal(sim.score,500);
 return shell;
}

test('ordinary stomp creates an idle shell and side contact awards400 before it hits a victim',()=>{
 const sim=fixture(),shell=kick(sim);assert.equal(shell.shellChain,0);assert.equal(shell.vx,3);
 const x=shell.x;sim.step(['right','b'],8);assert.equal(shell.x,x+24);assert.equal(sim.phase,'play');
});

test('a stationary shell wakes at the320-frame candidate while Mario waits safely beside it',()=>{
 const sim=fixture(),shell=stompAndMoveAside(sim);
 sim.step([],319-shell.shellAge!);assert.equal(shell.shell,true);assert.equal(shell.movingShell,false);
 sim.step([],1);assert.equal(shell.shell,false);assert.equal(shell.kind,'koopa');assert.equal(shell.vx,-0.5);
});

test('a kicked shell awards the six observed successive victim scores without an invented extra life',()=>{
 const sim=fixture(6),shell=kick(sim),awards:number[]=[];let prior=sim.score,dead=0;
 for(let frame=0;frame<240&&dead<6&&sim.phase==='play';frame++){
  sim.step(['right','b'],1);const next=sim.enemies.slice(1).filter(e=>e.dead>0).length;
  if(next>dead){assert.equal(next,dead+1);awards.push(sim.score-prior);prior=sim.score;dead=next;}
 }
 assert.equal(dead,6);assert.deepEqual(awards,[500,800,1000,2000,4000,5000]);assert.equal(shell.shellChain,6);assert.equal(sim.lives,3);assert.equal(sim.phase,'play');
});

test('a shell reverses at a real solid wall and its return genuinely damages the following Mario',()=>{
 const sim=fixture(0,12),shell=kick(sim);let reversed=false;
 for(let frame=0;frame<120&&sim.phase==='play';frame++){sim.step(['right','b'],1);if(shell.vx<0)reversed=true;}
 assert.equal(reversed,true);assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
});

test('stopping a returning shell and kicking it again starts a new victim chain',()=>{
 const sim=fixture(1,12,130),shell=kick(sim);let sawFirstVictim=false;
 sim.step(['right','a','b'],22);
 for(let frame=0;frame<130&&shell.movingShell&&sim.phase==='play';frame++){
  if(shell.shellChain===1)sawFirstVictim=true;sim.step(['right','b'],1);
 }
 assert.equal(sawFirstVictim,true);assert.equal(sim.phase,'play');assert.equal(shell.movingShell,false,'descending jump must stop the returning shell');assert.equal(sim.score,1100);assert.equal(shell.shellChain,0);
 for(let frame=0;frame<45&&!shell.movingShell&&sim.phase==='play';frame++)sim.step(['left'],1);
 assert.equal(sim.phase,'play');assert.equal(shell.movingShell,true);assert.equal(shell.vx,-3);assert.equal(sim.score,1500,'the second side kick awards400');assert.equal(shell.shellChain,0);
});
