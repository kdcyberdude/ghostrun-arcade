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
test('shell-launched Goombas flip at full size immediately instead of showing a squash',()=>{
 const {sim,entities}=scene({dead:1,greenShellLaunchFrame:0});entities.sync(sim,0);
 const root=actor(entities,'goomba');assert.equal(root.scale.y,1);assert.equal(root.rotation.z,Math.PI);assert.equal(root.position.y,(239-208)/16+1);
});
test('Mario growth follows the native small/mid/big picture cells',()=>{
 const {sim,entities}=scene();sim.player.size=0;
 for(const [age,size] of [[1,0.6],[9,0.8],[29,1],[33,0.6],[46,1]]){
  sim.powerChange={kind:'grow',from:0,to:1,remaining:59-age};sim.frame++;entities.sync(sim,0);assert.equal(actor(entities,'mario').scale.x,size);
 }
});
test('big Mario uses the native small death picture',()=>{
 const {sim,entities}=scene();sim.player.size=1;sim.player.dead=true;entities.sync(sim,0);assert.equal(actor(entities,'mario').scale.x,0.6);
});
test('star and fire-change palettes use the shared native phases',()=>{
 const {sim}=scene();
 const paletteKit={instance(name:string){const root=new THREE.Group();root.name=name;const material=new THREE.MeshStandardMaterial();material.name='M_Cloth_Primary';root.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material));return {root,clips:new Map<string,THREE.AnimationClip>()};}} as unknown as Kit;
 const entities=new Entities(paletteKit,false),color=()=>{const model=actor(entities,'mario').getObjectByName('mario')!;return ((model.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial).color.getHexString();};
 sim.player.star=200;sim.frame=2;entities.sync(sim,0);assert.equal(color(),'2fae3a');
 sim.player.star=0;sim.player.size=1;sim.powerChange={kind:'fire',from:1,to:2,remaining:61};sim.frame=4;entities.sync(sim,0);assert.equal(color(),'1a1a1a');
 sim.powerChange.remaining=54;sim.frame=6;entities.sync(sim,0);assert.equal(color(),'2fae3a');
});
test('moving fire Mario shows the native throw state',()=>{
 const {sim}=scene();sim.player.size=2;sim.player.vx=1.5;sim.player.grounded=true;Object.defineProperty(sim,'fireballThrowAge',{value:1});
 const animated={instance(name:string){const root=new THREE.Group();root.name=name;return {root,clips:new Map(['idle','throw'].map((clip,i)=>[clip,new THREE.AnimationClip(clip,1,[new THREE.NumberKeyframeTrack('.position[x]',[0,1],[i,i])])]))};}} as unknown as Kit;
 const entities=new Entities(animated,false);entities.sync(sim,0);assert.equal(actor(entities,'mario').getObjectByName('mario')!.position.x,1);
});
test('flipped small enemies retain the native transparent row above their body',()=>{
 const {sim,entities}=scene({kind:'bullet',dead:30});entities.sync(sim,0);assert.equal(actor(entities,'bullet').position.y,(239-208)/16+1.5);
});
test('hammer holds each native rotation phase for four frames',()=>{
 const {sim}=scene();sim.items=[{kind:'hammer',x:100,y:100,age:3,vx:0,vy:0,life:100}];
 const animated={instance(name:string){const root=new THREE.Group();root.name=name;return {root,clips:new Map([['spin',new THREE.AnimationClip('spin',0.4,[new THREE.NumberKeyframeTrack('.rotation[z]',[0,0.4],[0,Math.PI*2])])]])};}} as unknown as Kit;
 const entities=new Entities(animated,false);entities.sync(sim,0);assert.equal(actor(entities,'hammer').getObjectByName('hammer')!.rotation.z,0);
});
test('the final castle shows the Princess and earlier castles show Toad',()=>{
 for(const [level,model] of [['8-4','princess'],['7-4','toad']]){
  const {sim,entities}=scene();sim.levelIndex=sim.levels.findIndex(l=>l.id===level);sim.area.exit={kind:'axe',x:400,retainerX:300};sim.phase='play';entities.sync(sim,0);
  const root=actor(entities,model);assert.ok(root?.visible);assert.equal(root.position.x,308/16);assert.equal(root.position.y,31/16);
 }
});
