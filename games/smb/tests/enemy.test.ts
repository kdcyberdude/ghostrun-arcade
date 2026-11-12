import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GREEN_PARATROOPA_PHYSICS,Simulation} from '../src/simulation.js';
import type {Area,EnemySpec,Level,Tile} from '../src/types.js';

function fixture(id='test',enemies:EnemySpec[]=[],extra:Partial<Area>={}):Simulation{
 const tiles:Tile[]=Array.from({length:64},(_,x)=>[x,13,84]);
 const level:Level={id,time:400,main:'main',evidence:'Synthetic enemy mechanics fixture, not a campaign map',areas:[{id:'main',width:1024,palette:0,theme:'ground',tiles,enemies,spawn:[40,208],evidence:'test',...extra}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}

test('cannons fire repeated aimed shots with cooldown and measured Bullet Bill speed',()=>{
 const sim=fixture('test',[],{cannons:[{x:160,y:160,interval:20}]});
 sim.step([],19);assert.equal(sim.enemies.length,0);
 sim.step([],1);assert.equal(sim.enemies.length,1);assert.equal(sim.enemies[0].vx<0,true);
 const x=sim.enemies[0].x;sim.step([],10);assert.equal(sim.enemies[0].x,x-15);
 sim.step([],10);assert.equal(sim.enemies.length,2);
 const right=fixture('test',[],{spawn:[200,208],cannons:[{x:160,y:160,interval:1}]});
 right.step([],1);assert.ok(right.enemies[0].vx>0);
});

test('a cannon inhibits close-range and offscreen shots',()=>{
 const close=fixture('test',[],{spawn:[144,208],cannons:[{x:160,y:192,interval:10}]});
 close.step([],40);assert.equal(close.enemies.length,0);
 const offscreen=fixture('test',[],{cannons:[{x:400,y:192,interval:10}]});
 offscreen.step([],40);assert.equal(offscreen.enemies.length,0);
});

test('a live cannon shot damages the player through ordinary collision updates',()=>{
 const sim=fixture('test',[],{cannons:[{x:160,y:192,interval:20}]});
 sim.step([],110);assert.equal(sim.phase,'dying');assert.equal(sim.player.dead,true);
});

test('late-castle Bowser throws ballistic hammers but early Bowser does not',()=>{
 const late=fixture('6-4',[{kind:'bowser',x:220,y:208}]);
 late.step([],60);assert.equal(late.items.filter(i=>i.kind==='hammer').length,2);
 const hammer=late.items.find(i=>i.kind==='hammer')!,vy=hammer.vy,y=hammer.y;
 late.step([],8);assert.ok(hammer.vy>vy);assert.ok(hammer.y<y);
 late.step([],20);assert.ok(hammer.vy>0,'gravity must turn the hammer downward');
 const early=fixture('1-4',[{kind:'bowser',x:220,y:208}]);early.step([],120);
 assert.equal(early.items.some(i=>i.kind==='hammer'),false);
 const suppressed=fixture('8-4',[{kind:'bowser',x:220,y:208,bowserHammers:false}]);suppressed.step([],120);
 assert.equal(suppressed.items.some(i=>i.kind==='hammer'),false);
});

test('hammer collision respects damage and temporary invulnerability',()=>{
 const sim=fixture();sim.player.size=1;
 sim.items.push({kind:'hammer',x:44,y:190,vx:0,vy:0,age:0,life:40});
 sim.step([],1);assert.equal(sim.powerChange?.kind,'shrink');assert.equal(sim.player.invincible,157);
 sim.step([],55);assert.equal(sim.player.size,0);assert.equal(sim.phase,'play');assert.equal(sim.player.invincible,157);
 sim.step([],1);assert.equal(sim.player.invincible,156);
});

test('flame collision covers the supplied 24px assembly rather than only its first tile',()=>{
 const sim=fixture();sim.items.push({kind:'flame',x:24,y:198,vx:0,vy:0,age:0,life:40});
 sim.step([],1);assert.equal(sim.phase,'dying');
});

test('each spawned Bowser flame emits its supplied sound cue once',()=>{
 const sim=fixture('1-4',[{kind:'bowser',x:220,y:208}]);sim.events=[];
 // Native fire (free 5-4 probe): the first flame comes 255 frames after Bowser appears, while he faces left (the old age%150 guess was not measured).
 sim.step([],254);assert.ok(!sim.events.includes('sfx_bowser_flame'));
 sim.step([],1);assert.equal(sim.items.filter(item=>item.kind==='flame').length,1);
 assert.equal(sim.events.filter(event=>event==='sfx_bowser_flame').length,1);
 sim.step([],5);assert.equal(sim.events.filter(event=>event==='sfx_bowser_flame').length,1);
});

test('red winged Koopas fly vertically while green winged Koopas bounce from the floor',()=>{
 const sim=fixture('test',[{kind:'paratroopa',x:170,y:80,palette:'0f-16-30-27'},{kind:'paratroopa',x:230,y:208,palette:'0f-1a-30-27'}]);
 sim.step([],10);assert.equal(sim.enemies[1].vy,GREEN_PARATROOPA_PHYSICS.bounce); // a Paratroopa at rest on the floor sinks and first bounces at age 10 (native-measured)
 sim.step([],35);assert.equal(sim.enemies[0].x,170);assert.ok(sim.enemies[0].y>80);assert.ok(sim.enemies[1].y<208);
});

test('an idle shell revives, while a kicked shell continues moving',()=>{
 const sim=fixture('test',[{kind:'redKoopa',x:170,y:208},{kind:'beetle',x:230,y:208}]);
 const idle=sim.enemies[0],moving=sim.enemies[1];idle.shell=true;moving.shell=true;moving.movingShell=true;moving.vx=3;
 sim.step([],319);assert.equal(idle.shell,true);assert.equal(moving.shell,true);
 sim.step([],1);assert.equal(idle.shell,false);assert.equal(idle.kind,'redKoopa');assert.ok(idle.vx<0);assert.equal(moving.shell,true);
});

test('ground enemies turn on contact with each other',()=>{
 const sim=fixture('test',[{kind:'goomba',x:170,y:208,direction:1},{kind:'koopa',x:186,y:208,direction:-1}]);
 sim.step([],2);assert.ok(sim.enemies[0].vx<0);assert.ok(sim.enemies[1].vx>0);
 const directions=sim.enemies.map(e=>Math.sign(e.vx));sim.step([],2);assert.deepEqual(sim.enemies.map(e=>Math.sign(e.vx)),directions);
});
