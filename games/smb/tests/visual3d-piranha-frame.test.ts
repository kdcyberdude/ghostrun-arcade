import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {framePiranha} from '../src/render3d/piranha-frame.js';
import {FOV,ASPECT,DIST,TARGET_Y,PITCH} from '../src/render3d/coords.js';
test('Piranha frame contains the posed perspective silhouette at every native height',()=>{
 const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(1,1.7,0.8));mesh.position.y=0.85;root.add(mesh);
 const camera=new THREE.PerspectiveCamera(FOV,ASPECT,1,600);camera.position.set(0,TARGET_Y+DIST*Math.sin(PITCH),DIST*Math.cos(PITCH));camera.lookAt(0,TARGET_Y,0);camera.updateMatrixWorld();
 for(const top of [32,64,128,161,208]){root.position.set(0,0,0);root.scale.setScalar(1);framePiranha(root,0,top);root.updateMatrixWorld(true);let min=Infinity,max=-Infinity;const v=new THREE.Vector3();for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,v).applyMatrix4(mesh.matrixWorld).project(camera);const y=(1-v.y)*120;min=Math.min(min,y);max=Math.max(max,y);}assert.ok(Math.abs(min-top)<1e-6);assert.ok(Math.abs(max-top-24)<1e-6);}
});
