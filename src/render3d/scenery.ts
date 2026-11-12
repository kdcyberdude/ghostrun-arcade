// Procedural background scenery and the flagpole. Each tile cluster of the original (hill / bush / cloud) becomes ONE 3D object placed a little behind the
// gameplay plane. The object is scaled about the camera line so it still occupies the same screen area when it is centred, and drifts naturally (parallax) otherwise.
import * as THREE from 'three';
import type {Layout,Cluster} from './layout.js';
import {DIST,TARGET_Y,PITCH} from './atmosphere.js';
import type {Kit} from './kit.js';
import {photoCluster} from './nature.js';
const mat=(color:number,rough=0.8,extra:Partial<THREE.MeshStandardMaterialParameters>={})=>new THREE.MeshStandardMaterial({color,roughness:rough,...extra});
function hillGeometry(w:number,h:number,depth:number){
 // Superellipse profile -> blunt dome with steep sides (closer to the original mound than a sphere); vertex colours brighten toward the crest.
 const p=2.6,pts:THREE.Vector2[]=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI/2;pts.push(new THREE.Vector2(Math.pow(Math.cos(t),2/p)*w/2,Math.pow(Math.sin(t),2/p)*h));}
 const geo=new THREE.LatheGeometry(pts,64);geo.scale(1,1,depth/(w/2));
 // Gentle organic lumps so the mound does not read as a perfect primitive.
 const pp=geo.attributes.position;for(let i=0;i<pp.count;i++){const x=pp.getX(i),y=pp.getY(i),z=pp.getZ(i),k=0.018*Math.min(1,y*2)*(Math.sin(x*1.7+z*1.3)+Math.sin(z*2.1-x*0.9+y*1.4));pp.setXYZ(i,x*(1+k),y*(1+k*0.6),z*(1+k));}
 geo.computeVertexNormals();
 const pos=geo.attributes.position,col=new Float32Array(pos.count*3),lo=new THREE.Color(0x0f5a22),hi=new THREE.Color(0x4cae3a),c=new THREE.Color();
 for(let i=0;i<pos.count;i++){c.copy(lo).lerp(hi,Math.pow(Math.min(1,pos.getY(i)/h),1.6));col.set([c.r,c.g,c.b],i*3);}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));return geo;
}
function hill(w:number,h:number){
 const g=new THREE.Group(),depth=Math.max(2.2,w*0.42);
 const body=new THREE.Mesh(hillGeometry(w,h,depth),new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.85}));body.castShadow=body.receiveShadow=true;g.add(body);
 // The two dark "eyes" of the classic hill, pressed onto the front surface.
 const eyeMat=mat(0x0a3a14,0.9);for(const dx of w>=4?[-0.17,0.17]:[-0.12,0.12]){
  const ex=dx*w,ey=h*0.52,rel=Math.pow(Math.max(0,1-Math.pow(Math.abs(ex)/(w/2),2.6)),1/2.6),ez=depth*Math.pow(Math.max(0,1-Math.pow(ey/h,2.6)),1/2.6)*Math.max(0.2,rel)*0.98;
  const eye=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),eyeMat);eye.scale.set(w*0.035,h*0.12,0.05);eye.position.set(ex,ey,ez);eye.rotation.x=-0.25;g.add(eye);}
 return g;
}
function bush(w:number){
 const g=new THREE.Group(),m=mat(0x4fa31c,0.9),n=Math.max(2,Math.round(w*1.3));
 for(let i=0;i<n;i++){const t=n===1?0.5:i/(n-1),r=0.46+0.14*Math.sin(t*Math.PI),s=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),m);
  s.scale.set(r,r*0.85,r*1.15);s.position.set((t-0.5)*(w-0.6),r*0.7,0);s.castShadow=s.receiveShadow=true;g.add(s);}
 return g;
}
function cloud(w:number,h:number){
 const g=new THREE.Group(),m=mat(0xffffff,0.95,{emissive:0x9ab4d8,emissiveIntensity:0.18}),n=Math.max(3,Math.round(w*1.8));
 for(let i=0;i<n;i++){const t=i/(n-1),r=(0.38+0.34*Math.sin(t*Math.PI))*Math.min(1,0.55+h*0.35),s=new THREE.Mesh(new THREE.SphereGeometry(1,28,18),m);
  s.scale.set(r,r*0.9,r);s.position.set((t-0.5)*(w-0.9),r*0.8+(i%2)*0.06,((i*37)%5-2)*0.05);s.castShadow=true;g.add(s);}
 return g;
}
function tree(w:number,h:number){
 const g=new THREE.Group(),canopyH=Math.max(1,h-0.8),r=Math.min(w,1.6)/2;
 const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.14,h,10),mat(0x6a4222,0.9));trunk.position.y=h/2;g.add(trunk);
 const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),mat(0x6cc83a,0.85));leaf.scale.set(r*1.05,canopyH/2,r*0.9);leaf.position.y=h-canopyH/2;g.add(leaf);
 g.traverse(o=>{(o as THREE.Mesh).castShadow=true;});return g;
}
const DEPTH:Record<Cluster['kind'],number>={hill:5,bush:1.6,cloud:11,tree:1.4};
/** `kit` given = photoreal mode: clusters become scanned vegetation / grassy knolls and decorative clouds are left to the photographed sky. */
export function buildStatics(layout:Layout,theme:string,kit?:Kit):THREE.Group{
 const root=new THREE.Group();
 for(const c of layout.clusters){
  // Exact registration: extend the camera ray through the original on-plane base point back to depth d (camera centred on the object).
  const w=c.col1-c.col0+1,h=c.row1-c.row0+1,x=c.col0+w/2,yBase=14-c.row1,d=DEPTH[c.kind],camY=TARGET_Y+DIST*Math.sin(PITCH),camZ=DIST*Math.cos(PITCH),k=(camZ+d)/camZ;
  if(kit&&c.kind==='cloud')continue;
  const obj=kit?photoCluster(kit,c,w,h):c.kind==='hill'?hill(w,h):c.kind==='bush'?bush(w):c.kind==='tree'?tree(w,h):cloud(w,h);
  // Register about the camera line: keep the screen position of the original tile cluster, push it back in depth.
  obj.scale.setScalar(k);obj.position.set(x,camY+(yBase-camY)*k,-d);root.add(obj);
 }
 const p=layout.pole;if(p){
  const top=14.5-p.rowTop,bottom=14-p.rowBottom,metal=new THREE.MeshStandardMaterial({color:0xcfd6d8,roughness:0.25,metalness:0.9});
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,top-bottom,20),metal);pole.position.set(p.col+0.5,(top+bottom)/2,0);pole.castShadow=true;root.add(pole);
  const ball=new THREE.Mesh(new THREE.SphereGeometry(0.26,28,20),new THREE.MeshStandardMaterial({color:0x35d06a,roughness:0.2,metalness:0.4}));ball.position.set(p.col+0.5,top+0.05,0);ball.castShadow=true;root.add(ball);
 }
 void theme;return root;
}
export function disposeGroup(g:THREE.Object3D){g.traverse(o=>{const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();const mm=m.material;(Array.isArray(mm)?mm:[mm]).forEach(x=>x.dispose());}});}
