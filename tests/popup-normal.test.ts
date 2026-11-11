import {test}from'node:test';import assert from'node:assert/strict';import {Simulation}from'../src/simulation.js';import type{Level,Tile}from'../src/types.js';
function collect(kind:'mushroom'|'flower'){
 const level:Level={id:'normal-popup',main:'main',time:400,evidence:'Declared realcollection fixture, notcampaignwin',areas:[{id:'main',width:1280,palette:0,theme:'ground',spawn:[40,kind==='mushroom'?208:160],tiles:Array.from({length:80},(_,x)=>[x,13,84] as Tile),enemies:[],evidence:'Fixture declaration only, normalcontrols after reset'}]};const sim=new Simulation([level]);sim.reset(true);if(kind==='flower')sim.player.size=1;sim.items.push({kind,x:40,y:kind==='mushroom'?192:128,vx:0,vy:0,age:0,life:100});sim.step([],1);assert.equal(sim.items.length,0);assert.equal(sim.score,1000);assert.equal(sim.popups.length,1);assert.equal(sim.popups[0].value,1000);return sim;
}
// Mushroom growth freezes for the 59 native frames read from the native 1-1 pickup (data/powerup-rules.json mushroomGrowthValue).
test('actualmushroom1000labelriseswhilegrowthfreezesplayerandendsbeforegrowth',()=>{
 const sim=collect('mushroom'),label=sim.popups[0],position=[sim.player.x,sim.player.y];assert.equal(label.y,176);assert.equal(sim.powerChange?.kind,'grow');assert.equal(sim.player.size,0);
 sim.step(['right','b'],47);assert.deepEqual([sim.player.x,sim.player.y],position);assert.equal(label.y,129);assert.equal(sim.popups.length,1);assert.equal(sim.powerChange?.remaining,12);
 sim.step(['right','b'],1);assert.equal(sim.popups.length,0);assert.equal(sim.powerChange?.remaining,11);assert.deepEqual([sim.player.x,sim.player.y],position);sim.step([],11);assert.equal(sim.powerChange,undefined);assert.equal(sim.player.size,1);
});
test('actualflowercollectionusesitemheightandpreservesfiretransform/score',()=>{
 const sim=collect('flower'),position=[sim.player.x,sim.player.y];assert.equal(sim.popups[0].y,112);assert.equal(sim.powerChange?.kind,'fire');assert.equal(sim.player.size,1);
 sim.step(['right'],47);assert.equal(sim.popups[0].y,65);assert.deepEqual([sim.player.x,sim.player.y],position);sim.step([],1);assert.equal(sim.popups.length,0);assert.ok(sim.powerChange);sim.step([],16);assert.equal(sim.player.size,2);assert.equal(sim.score,1000);
});
test('ordinarypausefreezesnormalpoweruplabelandtransformationtogether',()=>{
 const sim=collect('mushroom'),label=sim.popups[0],before=[label.y,label.age,sim.powerChange?.remaining,sim.frame];sim.step(['start'],1);assert.equal(sim.paused,true);sim.step([],60);assert.deepEqual([label.y,label.age,sim.powerChange?.remaining,sim.frame],before);sim.step(['start'],1);assert.equal(sim.paused,false);assert.equal(label.y,175);assert.equal(label.age,1);assert.equal(sim.powerChange?.remaining,58);
});
