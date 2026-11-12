import test from 'node:test';
import assert from 'node:assert/strict';
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
