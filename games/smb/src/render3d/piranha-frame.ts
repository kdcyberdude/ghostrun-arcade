import * as THREE from 'three';
import {FOV,PITCH,DIST,TARGET_Y,NES_H} from './coords.js';
const envelopes=new WeakMap<THREE.Object3D,Map<number,{points:{y:number;z:number}[];frames:Map<number,{y:number;scale:number}>}>>();
/** Fit the posed authored mesh to the native 24px Piranha frame, including perspective at its actual depth.
 * A feet-only anchor lets the camera-facing lip protrude above a pipe after the native sprite has retracted. */
export function framePiranha(root:THREE.Object3D,phase:number,top:number){
 let poses=envelopes.get(root);if(!poses)envelopes.set(root,poses=new Map());let pose=poses.get(phase);
 if(!pose){const points:{y:number;z:number}[]=[],v=new THREE.Vector3();root.updateMatrixWorld(true);
  root.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh||!m.visible)return;(m as THREE.SkinnedMesh).skeleton?.update();for(let i=0;i<m.geometry.attributes.position.count;i++){m.getVertexPosition(i,v).applyMatrix4(m.matrixWorld);points.push({y:v.y-root.position.y,z:v.z});}});
  pose={points,frames:new Map()};poses.set(phase,pose);
 }
 if(!pose.points.length)return;let fit=pose.frames.get(top);
 if(!fit){const edge=(pixel:number)=>{const k=Math.tan(FOV*Math.PI/360)*(1-2*pixel/NES_H),d=Math.cos(PITCH)+k*Math.sin(PITCH);return {a:(Math.sin(PITCH)-k*Math.cos(PITCH))/d,b:TARGET_Y+k*DIST/d};},a=edge(top),b=edge(top+24);
  const bounds=(scale:number)=>{let upper=Infinity,lower=-Infinity;for(const p of pose!.points){upper=Math.min(upper,a.b+a.a*p.z-scale*p.y);lower=Math.max(lower,b.b+b.a*p.z-scale*p.y);}return {upper,lower};};
  let lo=0,hi=4;for(let i=0;i<32;i++){const mid=(lo+hi)/2,{upper,lower}=bounds(mid);if(upper>lower)lo=mid;else hi=mid;}const scale=(lo+hi)/2,{upper,lower}=bounds(scale);fit={scale,y:(upper+lower)/2};pose.frames.set(top,fit);
 }
 root.scale.y=fit.scale;root.position.y=fit.y;
}
