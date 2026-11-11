// Asset kit: optimised GLBs from assets25d/models (listed in index.json so a missing model is never a 404), with procedural fallbacks for anything not yet authored.
import * as THREE from 'three';
import {GLTFLoader,type GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {clone as cloneSkinned} from 'three/examples/jsm/utils/SkeletonUtils.js';
const BASE=import.meta.env.BASE_URL+'assets25d/models/';
/** One drawable piece of a static template: geometry + material + transform relative to the template root (so tiles can be instanced). */
export interface Part{geometry:THREE.BufferGeometry;material:THREE.Material;matrix:THREE.Matrix4}
export class Kit{
 private gltf=new Map<string,GLTF>();private available=new Set<string>();readonly missing=new Set<string>();
 private loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 /** Loads every published model (the kit is small); `names` are the ones the renderer expects, anything absent is reported as missing. */
 async load(names:string[]){
  let index:{models?:string[]}={};
  try{const r=await fetch(BASE+'index.json');if(r.ok&&(r.headers.get('content-type')??'').includes('json'))index=await r.json();}catch{/* no kit published yet: procedural fallbacks are used */}
  for(const name of index.models??[])this.available.add(name);
  await Promise.all([...this.available].map(async n=>{try{this.gltf.set(n,await this.loader.loadAsync(`${BASE}${n}.glb`));}catch(e){console.warn('25d kit: failed to load',n,e);}}));
  for(const n of names)if(!this.gltf.has(n))this.missing.add(n);
 }
 has(name:string){return this.gltf.has(name);}
 /** Static meshes of a template, flattened with their root-relative transforms (for InstancedMesh pools). */
 parts(name:string):Part[]|undefined{
  const g=this.gltf.get(name);if(!g)return undefined;const out:Part[]=[];g.scene.updateMatrixWorld(true);
  const inv=new THREE.Matrix4().copy(g.scene.matrixWorld).invert();
  g.scene.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh)out.push({geometry:m.geometry,material:m.material as THREE.Material,matrix:new THREE.Matrix4().multiplyMatrices(inv,m.matrixWorld)});});
  return out;
 }
 /** A fresh skinned/animated copy (own skeleton, shared geometry, cloned materials so variants can recolour). */
 instance(name:string):{root:THREE.Object3D;clips:Map<string,THREE.AnimationClip>}|undefined{
  const g=this.gltf.get(name);if(!g)return undefined;const root=cloneSkinned(g.scene);
  root.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):(m.material as THREE.Material).clone();m.castShadow=true;m.receiveShadow=true;}});
  return {root,clips:new Map(g.animations.map(c=>[c.name,c]))};
 }
}
