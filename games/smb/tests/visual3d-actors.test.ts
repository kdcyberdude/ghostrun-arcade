import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Actor} from '../src/render3d/actors.js';
test('restarting the simulation cannot retain a blend from the previous run',()=>{
 const model=new THREE.Group(),clips=new Map(['idle','walk'].map((name,i)=>[name,new THREE.AnimationClip(name,1,[new THREE.NumberKeyframeTrack('.position[x]',[0,1],[i,i])])]));
 const actor=new Actor(model,clips);actor.pose('idle',0,100);actor.pose('walk',0,101);actor.pose('walk',0,106);assert.equal(model.position.x,1);
 actor.pose('walk',0,1);assert.equal(model.position.x,1);
});
