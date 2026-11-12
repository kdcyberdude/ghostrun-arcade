import test from 'node:test';
import assert from 'node:assert/strict';
import {Props} from '../src/render3d/props.js';
import type {Simulation} from '../src/simulation.js';
test('spring top cap follows compression above its fixed bottom cap',()=>{
 const props=new Props();let compression=0;
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
