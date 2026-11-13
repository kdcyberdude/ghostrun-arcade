import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {EnemyKind,Level,Tile} from '../src/types.js';
function fixture(kind:EnemyKind='goomba',x=40,falling=true){
 const tiles:Tile[]=Array.from({length:80},(_,col)=>[col,13,84]);
 const level:Level={id:'popup-fixture',main:'main',time:400,evidence:'Declared real-collision fixture; not a campaign win',areas:[{id:'main',width:1280,palette:0,theme:'ground',camera:0,spawn:[x,falling?176:208],tiles,enemies:[{kind,x:x+8,y:208,direction:-1}],evidence:'Reset only; ordinary controls thereafter'}]};
 const sim=new Simulation([level]);sim.reset(true);return sim;
}
function stomp(kind:EnemyKind='goomba',x=40){const sim=fixture(kind,x);for(let i=0;i<80&&!sim.popups.length&&sim.phase==='play';i++)sim.step(['left'],1);assert.equal(sim.phase,'play');assert.equal(sim.popups.length,1);assert.equal(sim.popups[0].value,100);assert.equal(sim.awardedScore,100);return sim;}
test('a Goomba label has a native48-frame timer but erasure of its enemy slot clears it first',()=>{
 const sim=stomp(),popup=sim.popups[0],enemy=sim.enemies[0],n=(sim as any).intervalControl+22;assert.equal(popup.y,176);assert.equal(popup.age,0);assert.equal(enemy.squashed,true);
 assert.equal(popup.life,48);for(let k=1;k<=48;k++){sim.step(['left'],1);assert.equal(enemy.dead,k<=n?k+1>n?100:k+1:100,`row ${k}`);assert.equal(sim.popups.length,Number(k<48&&enemy.dead<90));}
 assert.equal(sim.popups.length,0);
});
test('a living Koopa slot keeps its label for the native48-frame timer',()=>{
 const sim=stomp('koopa'),popup=sim.popups[0];assert.equal(popup.y,176);assert.equal(sim.enemies[0].shell,true);
 sim.step(['left'],40);assert.equal(sim.popups.length,1);assert.equal(popup.y,136);assert.equal(sim.enemies[0].dead,0);
 sim.step(['left'],7);assert.equal(sim.popups.length,1);sim.step(['left'],1);assert.equal(sim.popups.length,0);assert.equal(sim.enemies[0].dead,0);
});
test('real1UP collection emits its semantic label while preserving the score and life award',()=>{
 const sim=fixture('goomba',40,false);sim.enemies=[];sim.items.push({kind:'1up',x:40,y:190,vx:0,vy:0,age:0,life:100});sim.step([],1);
 assert.equal(sim.items.length,0);assert.equal(sim.lives,4);assert.equal(sim.awardedScore,0);assert.equal(sim.popups.length,1);assert.equal(sim.popups[0].value,'1up');assert.equal(sim.popups[0].y,174);
 sim.step([],47);assert.equal(sim.popups.length,1);assert.equal(sim.popups[0].y,127);sim.step([],1);assert.equal(sim.popups.length,0);
});
test('popup birth captures the committed camera and then stays at that screen X while scrolling',()=>{
 const sim=stomp('goomba',180),popup=sim.popups[0],x=popup.x,camera=sim.camera;assert.equal(x,Math.floor(sim.enemies[0].x-sim.camera));
 sim.step(['right','b'],20);assert.ok(sim.camera>camera);assert.equal(popup.x,x);assert.equal(popup.y,156);
});
test('ordinary pause freezes labels, resume advances them, and area reset clears them',()=>{
 const sim=stomp(),popup=sim.popups[0],state=[popup.age,popup.y,sim.frame];sim.step(['start'],1);assert.equal(sim.paused,true);sim.step([],44);assert.deepEqual([popup.age,popup.y,sim.frame],state);
 sim.step(['start'],1);assert.equal(sim.paused,false);assert.equal(popup.age,1);assert.equal(popup.y,175);sim.reset(true);assert.equal(sim.popups.length,0);
});
test('Star and fireball Goomba labels retain their owning enemy slot until native erase',()=>{
 const star=fixture('goomba',40,false);star.player.star=100;(star as any).broClock=1;star.step([],1);assert.equal(star.enemies[0].dead,1);assert.equal(star.popups.length,1);assert.equal(star.popups[0].victim,star.enemies[0]);
 const fire=fixture('goomba',40,false);fire.items.push({kind:'fireball',x:48,y:188,vx:0,vy:0,age:0,life:10});fire.step([],1);assert.equal(fire.enemies[0].dead,1);assert.equal(fire.popups.length,1);assert.equal(fire.popups[0].victim,fire.enemies[0]);
});
