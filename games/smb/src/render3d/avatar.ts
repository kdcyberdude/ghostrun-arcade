// The lives screen ("WORLD 1-1  × 3") shows the player beside the count, as the original does with its sprite: here the 3D model,
// idling, drawn over the blacked-out frame with its own orthographic camera in NES screen units (16 px = 1 unit).
import * as THREE from 'three';
import type {Kit} from './kit.js';
import {Actor,yawFor} from './actors.js';
import {PALETTE,SMALL_CHIBI} from './entities.js';
import {NES_W,NES_H} from './coords.js';
export class IntroAvatar{
 readonly scene=new THREE.Scene();readonly camera=new THREE.OrthographicCamera(0,NES_W/16,NES_H/16,0,-20,20);private actor?:Actor;private colors='';
 constructor(kit:Kit){
  const inst=kit.instance('mario');if(!inst)return;this.actor=new Actor(inst.root,inst.clips);
  // Original sprite cell: x 96..112, y 89..121 (feet). The model stands on the same baseline, a little larger than small Mario in play.
  this.actor.root.position.set((96+8)/16,(NES_H-121)/16,0);this.actor.root.scale.setScalar(0.85);this.actor.root.rotation.y=yawFor(1);
  this.actor.morph('Chibi',SMALL_CHIBI);this.scene.add(this.actor.root);
  const key=new THREE.DirectionalLight(0xffffff,3.2);key.position.set(-3,6,8);this.scene.add(key,new THREE.HemisphereLight(0xdfe8ff,0x40302a,1.4));
 }
 /** Draws over the current frame; `frame` drives the idle loop, `luigi` the colours. */
 render(gl:THREE.WebGLRenderer,frame:number,luigi:boolean){
  const a=this.actor;if(!a)return;const c=luigi?PALETTE.luigi:PALETTE.mario;
  if(c.join()!==this.colors){this.colors=c.join();a.recolor('M_Cloth_Primary',c[0]);a.recolor('M_Cloth_Secondary',c[1]);}
  a.pose('idle',frame/60,frame);gl.autoClear=false;gl.clearDepth();gl.render(this.scene,this.camera);gl.autoClear=true;
 }
}
