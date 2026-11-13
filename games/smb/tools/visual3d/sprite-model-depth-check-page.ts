import * as THREE from 'three';
import {Actor} from '../../src/render3d/actors.js';
import {visiblePixels,sceneState} from './visibility-pass.js';
export async function check(scales=[1,4]){
 const r=(window as any).render3d,rows:any[]=[];
 for(const scale of scales)for(const theme of ['ground','underground','water','castle','night','snow']){
  r.atmosphere.setTheme(theme,'depth-audit');r.atmosphere.place(0);
  for(const offset of [0,4,252])for(const model of ['mario','koopa_shell','beetle_shell','piranha','hammer_bro']){
   const instance=r.kit.instance(model),actor=new Actor(instance.root,instance.clips);actor.pose(instance.clips.has('idle')?'idle':instance.clips.keys().next().value,0,0);actor.root.position.set(8,5,0);
   const scene=new THREE.Scene(),bank=new THREE.Group();scene.add(bank);bank.add(actor.root);const labels=new Map<any,number>();actor.root.traverse((m:any)=>{if(m.isMesh)labels.set(m,labels.size+1);});
   const before=sceneState(scene),a=visiblePixels(r.gl,scene,r.atmosphere.camera,labels,labels.size,[],false,undefined,scale),b=visiblePixels(r.gl,scene,r.atmosphere.camera,labels,labels.size,[],false,{draws:[{root:actor.root,offset,background:false}],banks:[bank]},scale);
   if(before!==sceneState(scene))throw Error('depth audit mutated model');const delta=a.pixels.map((n:number,i:number)=>b.pixels[i]-n),total=delta.reduce((n:number,x:number)=>n+Math.abs(x),0);rows.push({scale,theme,offset,model,parts:labels.size,normalPixels:a.pixels,nativePixels:b.pixels,absolutePartPixelDifference:total});
  }
 }
 return rows;
}
