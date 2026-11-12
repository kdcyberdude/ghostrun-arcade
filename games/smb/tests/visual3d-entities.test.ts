import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Entities} from '../src/render3d/entities.js';
import type {Kit} from '../src/render3d/kit.js';
import {Simulation} from '../src/simulation.js';
import {observedLevels} from '../src/levels.js';
import type {Enemy} from '../src/types.js';
const kit={instance(name:string){const root=new THREE.Group();root.name=name;return {root,clips:new Map<string,THREE.AnimationClip>()};}} as unknown as Kit;
function scene(enemy?:Partial<Enemy>){const sim=new Simulation(observedLevels());sim.reset(true);sim.enemies=[];if(enemy)sim.enemies.push({kind:'goomba',x:100,y:208,vx:0,vy:0,active:true,dead:0,age:30,...enemy} as Enemy);const entities=new Entities(kit,false);return {sim,entities};}
const actor=(entities:Entities,name:string)=>entities.group.children.find(o=>o.getObjectByName(name))!;
test('squashed Goombas stay on their feet after the squash timer passes 20',()=>{
 const {sim,entities}=scene({squashed:true,dead:32});entities.sync(sim,0);
 const root=actor(entities,'goomba');assert.equal(root.rotation.z,0);assert.equal(root.position.y,(239-208)/16);assert.equal(root.scale.y,0.28);
});
test('center-authored Podoboos use their sprite center and turn over while falling',()=>{
 const {sim,entities}=scene({kind:'podoboo',podobooFalling:true});entities.sync(sim,0);
 const root=actor(entities,'podoboo');assert.equal(root.position.y,(247-208)/16);assert.equal(root.rotation.z,Math.PI);
});
test('Bowser uses the center of his 32-pixel body',()=>{
 const {sim,entities}=scene({kind:'bowser'});entities.sync(sim,0);assert.equal(actor(entities,'bowser').position.x,(100+16)/16);
});
test('hammers are centered in their sprite',()=>{
 const {sim,entities}=scene();sim.items=[{kind:'hammer',x:100,y:100,age:0,vx:0,vy:0,life:100}];entities.sync(sim,0);
 assert.equal(actor(entities,'hammer').position.y,(232-100)/16);
});
test('death presentation keeps Mario at the gameplay plane',()=>{
 const {sim,entities}=scene();sim.player.dead=true;sim.phase='dying';sim.phaseFrame=45;entities.sync(sim,0);
 const root=actor(entities,'mario');assert.equal(root.position.z,0);assert.equal(root.rotation.x,0);
});
test('repainting the same simulation frame does not advance enemy turns',()=>{
 const {sim,entities}=scene({vx:-1});entities.sync(sim,0);sim.enemies[0].vx=1;sim.frame++;entities.sync(sim,0);
 const yaw=actor(entities,'goomba').rotation.y;entities.sync(sim,0);assert.equal(actor(entities,'goomba').rotation.y,yaw);
});
test('falling Spiny uses an egg and switches to a walker on landing',()=>{
 const {sim,entities}=scene({kind:'spiny',motion:'falling'});entities.sync(sim,0);
 const egg=entities.group.getObjectByName('spinyEgg')!;assert.ok(egg?.visible);assert.equal(egg.position.y,(247-208)/16);
 sim.enemies[0].motion=undefined;entities.sync(sim,0);assert.equal(egg.visible,false);assert.equal(actor(entities,'spiny').visible,true);
});
test('Bowser falls upright with the collapsing bridge',()=>{
 const {sim,entities}=scene({kind:'bowser',dead:30});sim.castleBowserFalls=()=>true;entities.sync(sim,0);
 assert.equal(actor(entities,'bowser').rotation.z,0);assert.equal(actor(entities,'bowser').position.y,(239-208)/16);
});
test('hammer spin follows the native four phases, four frames each',()=>{
 const {sim}=scene();sim.items=[{kind:'hammer',x:100,y:100,age:4,vx:0,vy:0,life:100}];
 const animated={instance(name:string){const root=new THREE.Group();root.name=name;return {root,clips:new Map([['spin',new THREE.AnimationClip('spin',0.4,[new THREE.NumberKeyframeTrack('.rotation[z]',[0,0.4],[0,Math.PI*2])])]])};}} as unknown as Kit;
 const entities=new Entities(animated,false);entities.sync(sim,0);assert.ok(Math.abs(actor(entities,'hammer').getObjectByName('hammer')!.rotation.z-Math.PI/2)<1e-6);
});
test('live enemies use the native picture coordinates and facing before movement',()=>{
 const {sim,entities}=scene({graphicsX:99,graphicsY:207,graphicsFacing:-1,vx:1});entities.sync(sim,0);
 const root=actor(entities,'goomba');assert.equal(root.position.x,107/16);assert.equal(root.position.y,32/16);assert.equal(root.rotation.y,Math.PI+0.5);
 sim.enemies[0].dead=32;sim.enemies[0].squashed=true;sim.frame++;entities.sync(sim,0);assert.equal(root.position.x,108/16);assert.equal(root.position.y,31/16);
});
