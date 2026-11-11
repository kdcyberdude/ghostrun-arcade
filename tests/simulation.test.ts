import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import type {Level,Tile} from '../src/types.js';
function level():Level {
 const tiles:Tile[]=[];
 for(let x=0;x<50;x++)for(let y=13;y<15;y++)tiles.push([x,y,84]);
 tiles.push([10,12,97],[10,11,97],[5,9,192]);
 return {id:'test',time:400,main:'main',evidence:'Synthetic collision fixture; not campaign data',areas:[{id:'main',width:800,palette:0,theme:'ground',tiles,enemies:[],spawn:[40,208],evidence:'test'}]};
}
test('deterministic stepping and floor stability',()=>{
 const a=new Simulation([level()]),b=new Simulation([level()]);a.reset(true);b.reset(true);
 a.step(['right','b'],20); for(let i=0;i<20;i++)b.step(['right','b'],1);
 assert.deepEqual(a.player,b.player);assert.equal(a.frame,20);assert.equal(a.player.y,208);
});
test('release jump produces a lower apex than holding',()=>{
 const long=new Simulation([level()]),short=new Simulation([level()]);long.reset(true);short.reset(true);
 let l=208,s=208;
 for(let f=0;f<80;f++){long.step(f<45?['a']:[],1);short.step(f<2?['a']:[],1);l=Math.min(l,long.player.y);s=Math.min(s,short.player.y);}
 assert.ok(l<s-12,`${l} ${s}`);assert.equal(long.player.y,208);assert.equal(short.player.y,208);
});
test('solid wall stops the player without tunneling',()=>{
 const sim=new Simulation([level()]);sim.reset(true);sim.step(['right','b'],180);
 assert.ok(Math.floor(sim.player.x)+13<=160);assert.equal(sim.player.y,208);
});
test('timer death loses one life and respawns through simulation',()=>{
 const sim=new Simulation([level()]);sim.reset(true);sim.time=1;sim.step([],50);/* native: the death comes one full 24-row tick after 000 (1-4 rows 15044, 15068) */
 assert.equal(sim.phase,'dying');sim.step([],240);assert.equal(sim.lives,2);assert.ok(['intro','play'].includes(sim.phase));
});
test('a descending player lands on a pipe lip when stopped against its side',()=>{
 const data=level();data.areas[0].tiles.push([12,10,16],[13,10,17],[12,11,20],[13,11,21],[12,12,20],[13,12,21]);
 const sim=new Simulation([data]);sim.reset(true);sim.player.x=180;sim.player.y=159;sim.player.vy=2;sim.player.grounded=false;sim.step([],1);
 assert.equal(sim.player.y,160);assert.equal(sim.player.grounded,true);
});
test('a player beside a stacked wall cannot stand on its internal brick seams',()=>{
 const data=level();for(let y=5;y<12;y++)data.areas[0].tiles.push([12,y,82]);
 const sim=new Simulation([data]);sim.reset(true);sim.player.x=179;sim.player.y=112;sim.player.grounded=false;
 sim.step([],60);assert.equal(sim.player.y,208);assert.equal(sim.player.grounded,true);
});
test('stomping a Koopa does not kick its new shell while bouncing upward',()=>{
 const data=level();data.areas[0].enemies=[{kind:'koopa',x:80,y:208}];const sim=new Simulation([data]);sim.reset(true);
 sim.player.x=78;sim.player.y=196;sim.player.vy=3;sim.player.grounded=false;
 sim.step([],4);assert.equal(sim.enemies[0].shell,true);assert.equal(sim.enemies[0].movingShell,false);assert.equal(sim.player.dead,false);
});
test('ascending movement can clear a step corner before horizontal collision is resolved',()=>{
 const data=level();data.areas[0].tiles.push([12,10,97],[12,11,97],[12,12,97]);const sim=new Simulation([data]);sim.reset(true);
 sim.player.x=177.5;sim.player.y=166.4;sim.player.vx=1.9;sim.player.vy=-4.5;sim.player.grounded=false;
 sim.step([],1);assert.ok(Math.floor(sim.player.x)>=179,'must clear the corner using the new vertical position');
});
