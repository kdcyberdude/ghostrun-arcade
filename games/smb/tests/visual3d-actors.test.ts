import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Actor,ActorPool} from '../src/render3d/actors.js';
import type {Kit} from '../src/render3d/kit.js';
test('restarting the simulation cannot retain a blend from the previous run',()=>{
 const model=new THREE.Group(),clips=new Map(['idle','walk'].map((name,i)=>[name,new THREE.AnimationClip(name,1,[new THREE.NumberKeyframeTrack('.position[x]',[0,1],[i,i])])]));
 const actor=new Actor(model,clips);actor.pose('idle',0,100);actor.pose('walk',0,101);actor.pose('walk',0,106);assert.equal(model.position.x,1);
 actor.pose('walk',0,1);assert.equal(model.position.x,1);
});
test('despawning another actor cannot replace a walking pose with its stale idle blend',()=>{
 const kit={instance(){const root=new THREE.Group();return {root,clips:new Map(['idle','walk'].map((name,i)=>[name,new THREE.AnimationClip(name,1,[new THREE.NumberKeyframeTrack('.position[x]',[0,1],[i,i])])]))};}} as unknown as Kit;
 const pool=new ActorPool(kit,'goomba',new THREE.Group()),first={},second={};pool.begin();pool.take(first)!.pose('idle',0,0);pool.take(second)!.pose('walk',0,0);pool.end();
 pool.begin();const survivor=pool.take(second)!;survivor.pose('walk',0,1);pool.end();assert.equal(survivor.model.position.x,1);
});
