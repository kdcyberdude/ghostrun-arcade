import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';

test('a Paratroopa stomp does not immediately damage the bouncing player',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===1488);
 area.cannons=[];area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1446.90625,165.25],1340);
 const enemy=sim.enemies[0];enemy.active=true;enemy.x=1458.5;enemy.y=168.625;enemy.vx=-0.5;enemy.vy=0.734375;
 sim.player.grounded=false;sim.player.vx=2.5;sim.player.vy=4;
 sim.broClock=1;sim.step(['right','b'],1);
 assert.equal(enemy.kind,'koopa');assert.equal(sim.score,400);assert.equal(sim.phase,'play');
 sim.step(['right','b'],4);
 assert.equal(sim.phase,'play');assert.equal(sim.player.dead,false);
});

test('side contact with an ordinary Koopa still damages Mario',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===1488);
 area.cannons=[];area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1449,174],1340);
 const enemy=sim.enemies[0];enemy.kind='koopa';enemy.active=true;enemy.x=1458;enemy.y=170;enemy.vx=0;enemy.vy=0;
 sim.player.grounded=false;sim.player.vx=0;sim.player.vy=0;
 sim.step([],1);
 assert.equal(sim.phase,'dying');
});

test('a different enemy can still damage Mario during the stomp bounce',()=>{
 const level=structuredClone(observedLevels().find(l=>l.id==='8-3')!);
 const area=level.areas.find(a=>a.id==='main')!;
 area.enemies=area.enemies.filter(e=>e.kind==='paratroopa'&&e.x===1488);
 area.cannons=[];area.generators=[];
 const sim=new Simulation([level]);sim.reset(true);sim.loadArea('main',[1446.90625,165.25],1340);
 const enemy=sim.enemies[0];enemy.active=true;enemy.x=1458.5;enemy.y=168.625;enemy.vx=-0.5;enemy.vy=0.734375;
 sim.player.grounded=false;sim.player.vx=2.5;sim.player.vy=4;
 sim.broClock=1;sim.step(['right','b'],1);assert.equal(sim.phase,'play');
 sim.enemies.push({...enemy,kind:'goomba',x:sim.player.x+5,y:sim.player.y+1,vx:0,vy:0,unwingedBounce:undefined,unwingedAir:undefined});
 sim.step(['right','b'],1);
 assert.equal(sim.phase,'dying');
});
