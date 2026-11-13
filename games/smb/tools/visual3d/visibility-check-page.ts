import * as THREE from 'three';
import {visiblePixels,sceneState} from './visibility-pass.js';
export function check(renderer:THREE.WebGLRenderer){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0.1,100);camera.position.z=10;
 const a=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial()),b=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0.5,depthWrite:false}));b.position.z=1;scene.add(a,b);
 const labels=new Map<THREE.Object3D,number>([[a,1],[b,2]]),results:any[]=[];
 const run=(name:string)=>{const before=sceneState(scene),out=visiblePixels(renderer,scene,camera,labels,2);if(before!==sceneState(scene))throw Error('scene changed: '+name);results.push({name,pixels:out.pixels,contribution:out.contribution});return out;};
 const half=run('two half-visible layers');if(!half.pixels[1]||!half.pixels[2]||Math.abs(half.contribution[1]/half.pixels[1]-0.5)>0.01)throw Error(JSON.stringify(results));
 labels.delete(b);const glass=run('unlabelled glass');if(!glass.pixels[1]||glass.pixels[2])throw Error(JSON.stringify(results));
 b.material.transparent=false;b.material.opacity=1;b.material.depthWrite=true;b.material.needsUpdate=true;const opaque=run('opaque occluder');if(opaque.pixels[1])throw Error(JSON.stringify(results));
 const isolated=visiblePixels(renderer,scene,camera,labels,2,[],true);if(!isolated.pixels[1]||isolated.pixels[2])throw Error('isolated reference incorrectly occluded');results.push({name:'isolated reference behind opaque wall',pixels:isolated.pixels});
 b.scale.x=0.5;b.position.x=0.25;const partial=run('half opaque occluder');if(Math.abs(partial.pixels[1]/isolated.pixels[1]-0.5)>0.01)throw Error('partial occlusion ratio');
 scene.remove(b);const texture=new THREE.DataTexture(new Uint8Array([255,255,255,255,255,255,255,0]),2,1);texture.needsUpdate=true;a.material.map=texture;a.material.alphaTest=0.5;a.material.needsUpdate=true;const cutout=run('alpha test');if(cutout.pixels[1]<7000||cutout.pixels[1]>8500)throw Error(JSON.stringify(results));
 a.material.map=null;a.material.alphaTest=0;a.material.needsUpdate=true;scene.remove(a);const shared=new THREE.MeshBasicMaterial();labels.clear();
 for(let i=0;i<13;i++){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(0.1,0.3),shared);mesh.position.x=-0.9+i*0.15;scene.add(mesh);labels.set(mesh,i+1);}
 const many=visiblePixels(renderer,scene,camera,labels,13);if(many.passes!==2||many.pixels.slice(1).some(n=>n===0))throw Error('shared material / MRT batches: '+JSON.stringify(many));results.push({name:'shared material + thirteen objects',pixels:many.pixels});
 const before=sceneState(scene),render=renderer.render;try{renderer.render=()=>{throw Error('intentional renderer failure');};try{visiblePixels(renderer,scene,camera,labels,13);}catch(e){if(!String(e).includes('intentional'))throw e;}}finally{renderer.render=render;}
 if(sceneState(scene)!==before)throw Error('scene not restored after throw');
 return results;
}
