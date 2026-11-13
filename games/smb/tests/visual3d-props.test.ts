import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Props} from '../src/render3d/props.js';
import type {Kit} from '../src/render3d/kit.js';
import type {Simulation} from '../src/simulation.js';
const emptyKit={has:()=>false} as unknown as Kit;
test('spring top cap follows compression above its fixed bottom cap',()=>{
 const props=new Props(emptyKit);let compression=0;
 const s={area:{springs:[{x:100,y:200}]},springCompression:()=>compression,vines:[],flagFireworks:[]} as unknown as Simulation;
 props.sync(s);
 const spring=props.group.children.find(o=>o.getObjectByName('top'))!,top=spring.getObjectByName('top')!;
 assert.equal(top.position.y,1.44);assert.equal(spring.scale.y,1);
 const bottom=spring.children.at(-1)!;assert.equal(bottom.position.y,0.06);
 compression=2;props.sync(s);
 assert.equal(spring.scale.y,1/3);assert.equal(props.group.children.length,1);
 assert.equal(spring.position.y,(239-200)/16);
 assert.ok(top.position.y*spring.scale.y>bottom.position.y*spring.scale.y);
});
test('only native small lift IDs draw the second surface 128 rows away',()=>{
 for(const [level,area,x,y,width,copies] of [['2-4','main',1372,160,24,2],['1-2','area-2',2236,112,48,1]] as const){
  const props=new Props(emptyKit),platform={x,y,width,axis:'y',range:0,speed:0.9375};
  const s={level:{id:level},area:{id:area,platforms:[platform]},platformPicturePosition:()=>({x,y:253}),vines:[],flagFireworks:[]} as unknown as Simulation;
  props.sync(s);assert.equal(props.group.children.length,copies);
  assert.deepEqual(props.group.children.map(o=>o.position.y),copies===2?[-17/16,111/16]:[-17/16]);
 }
});
test('native small lift surfaces are suppressed above the playfield while large lifts remain visible',()=>{
 for(const [level,area,x,y,width,expected] of [['2-4','main',1372,160,24,(236-144)/16],['1-2','area-2',2236,112,48,(236-16)/16]] as const){
  const props=new Props(emptyKit),platform={x,y,width,axis:'y',range:0,speed:0.9375};
  const s={level:{id:level},area:{id:area,platforms:[platform]},platformPicturePosition:()=>({x,y:16}),vines:[],flagFireworks:[]} as unknown as Simulation;
  props.sync(s);assert.equal(props.group.children.length,1);assert.equal(props.group.children[0].position.y,expected);
 }
});

test('native bubbles use the visible CHR ring center and native Mario-page gate',()=>{
 const props=new Props(emptyKit),bubbles=[{x:300,y:100},{x:310,y:248}];
 const s={area:{theme:'water'},camera:257,player:{y:208},bubbles,vines:[],flagFireworks:[]} as unknown as Simulation;
 props.sync(s);assert.equal(props.group.children.length,2);
 const bubble=props.group.children[0];assert.deepEqual(bubble.position.toArray(),[304/16,135/16,-0.15]);
 assert.equal(bubble.castShadow,false);assert.equal(bubble.receiveShadow,false);
 assert.equal(props.group.children[1].visible,true); // Native sentinel Y is hidden by the viewport, not by its own page.
 s.area.theme='ground';props.sync(s);assert.ok(props.group.children.every(o=>!o.visible));
 s.area.theme='water';s.player.y=464;props.sync(s);assert.ok(props.group.children.every(o=>!o.visible));
});

test('native bouncing blocks clip four GLB quarters at OAM positions without sharing background materials',()=>{
 const material=new THREE.MeshStandardMaterial(),kit={has:(name:string)=>name==='block_used_ug',parts:(name:string)=>[{geometry:new THREE.BoxGeometry(1,1,1),material:Object.assign(material,{name}),matrix:new THREE.Matrix4()}]} as unknown as Kit;
 const props=new Props(kit),block={slot:0,key:'4,6',x:64,y:96,metatile:196,pictureY:100 as number|undefined,replace:false},s={area:{theme:'ground'},camera:0,blockGraphics:[block],vines:[],flagFireworks:[]} as unknown as Simulation;
 props.sync(s);assert.equal(props.group.children.length,4);const first=props.group.children[0],mesh=first.children[0] as THREE.Mesh,own=mesh.material as THREE.MeshStandardMaterial;
 assert.notEqual(own,material);assert.equal(own.polygonOffset,true);assert.equal(material.clippingPlanes,null);
 assert.deepEqual(first.position.toArray(),[72/16,131/16,0]);assert.deepEqual(own.clippingPlanes!.map(p=>p.constant),[-4,4.5,-131/16,139/16]);
 block.pictureY=99;props.sync(s);assert.equal(first.position.y,132/16);assert.equal(props.group.children.length,4);
 s.area.theme='underground';props.sync(s);const shown=props.group.children.filter(o=>o.visible);assert.equal(shown.length,4);assert.ok(shown.every(o=>((o.children[0] as THREE.Mesh).material as THREE.Material).name==='block_used_ug'));
 block.pictureY=undefined;props.sync(s);assert.ok(props.group.children.every(o=>!o.visible));
});
