// Goal flag: a cloth plane with a cheap per-vertex wave (presentation only; its height comes from the simulation's flagTop).
import * as THREE from 'three';
export function makeFlag(){
 const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d')!;g.fillStyle='#f4f4ee';g.fillRect(0,0,128,128);
 g.fillStyle='#1d9a3a';g.beginPath();g.arc(64,64,34,0,7);g.fill();g.fillStyle='#f4f4ee';g.beginPath();g.arc(64,58,18,0,7);g.fill();g.fillRect(52,70,24,16);
 g.fillStyle='#1d9a3a';g.beginPath();g.arc(57,58,5,0,7);g.arc(71,58,5,0,7);g.fill();
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
 const geo=new THREE.PlaneGeometry(1.05,1,12,6);geo.userData.base=Float32Array.from(geo.attributes.position.array as Float32Array);
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide,roughness:0.8}));m.castShadow=true;return m;
}
export function waveFlag(m:THREE.Mesh,frame:number){
 const pos=m.geometry.attributes.position,base=m.geometry.userData.base as Float32Array;
 for(let i=0;i<pos.count;i++){const x=base[i*3],y=base[i*3+1],free=(0.525-x)/1.05;pos.setZ(i,Math.sin(frame*0.12+x*5+y*1.5)*0.12*free);pos.setY(i,y-0.04*free*free);}
 pos.needsUpdate=true;m.geometry.computeVertexNormals();
}
