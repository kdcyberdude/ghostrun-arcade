// Themed depth layers far behind the gameplay plane (pure decoration; fixed in world space, so the perspective camera gives natural parallax).
import * as THREE from 'three';
import {photoMaterial} from './nature.js';
const rand=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
function ridgeHeight(x:number,z:number,amp:number,seed:number){
 return amp*(0.55*Math.sin(x*0.11+seed)+0.3*Math.sin(x*0.27+seed*2.3+z*0.2)+0.15*Math.sin(x*0.61+seed*5.1-z*0.4))+amp*0.2*Math.sin(z*0.3+x*0.05);
}
/** A rolling terrain strip: x from x0 to x1, depth band [zFront, zBack], base height y0, vertex-coloured from lo to hi. */
function terrain(x0:number,x1:number,zFront:number,zBack:number,y0:number,amp:number,lo:number,hi:number,seed:number,step=1,flat=0){
 const nx=Math.ceil((x1-x0)/step),nz=Math.max(2,Math.ceil((zFront-zBack)/step));
 const geo=new THREE.PlaneGeometry(x1-x0,zFront-zBack,nx,nz);geo.rotateX(-Math.PI/2);geo.translate((x0+x1)/2,0,(zFront+zBack)/2);
 const pos=geo.attributes.position,col=new Float32Array(pos.count*3),cl=new THREE.Color(lo),ch=new THREE.Color(hi),c=new THREE.Color();
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),edge=Math.min(1,Math.max(0,(zFront-z-flat)/8));const h=Math.max(0,ridgeHeight(x,z,amp,seed)+amp*0.6)*edge;pos.setY(i,y0+h);
  c.copy(cl).lerp(ch,Math.min(1,h/(amp*1.6)));col.set([c.r,c.g,c.b],i*3);}
 geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
 const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:0.95}));m.receiveShadow=true;return m;
}
function trees(x0:number,x1:number,zFront:number,zBack:number,y0:number,amp:number,seed:number,count:number){
 const r=rand(seed),g=new THREE.Group();
 const canopy=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),new THREE.MeshStandardMaterial({color:0x2f8f3a,roughness:0.9,flatShading:false}),count);
 const trunk=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12,0.18,1,8),new THREE.MeshStandardMaterial({color:0x5a3a22,roughness:0.9}),count);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),p=new THREE.Vector3(),tint=new THREE.Color();
 for(let i=0;i<count;i++){
  const x=x0+r()*(x1-x0),z=zBack+r()*(zFront-zBack-2),edge=Math.min(1,Math.max(0,(-1-z-6)/8)),y=y0+Math.max(0,ridgeHeight(x,z,amp,1.3)+amp*0.6)*edge,k=0.55+r()*0.6;
  trunk.setMatrixAt(i,m.compose(p.set(x,y+0.5*k,z),q,s.set(k,k,k)));
  canopy.setMatrixAt(i,m.compose(p.set(x,y+1.4*k,z),q,s.set(0.9*k,1.15*k,0.9*k)));canopy.setColorAt(i,tint.setHSL(0.3+r()*0.06,0.55,0.26+r()*0.12));
 }
 canopy.castShadow=trunk.castShadow=true;g.add(trunk,canopy);return g;
}
function mountains(x0:number,x1:number,z:number,y0:number,height:number,color:number,seed:number){
 const r=rand(seed),shape=new THREE.Shape();shape.moveTo(x0,y0-5);let x=x0;
 while(x<x1){const w=18+r()*30,h=height*(0.45+r()*0.55);for(let k=1;k<=8;k++){const t=k/8;shape.lineTo(x+w*t,y0+h*Math.pow(Math.sin(t*Math.PI),1.3)*(0.92+0.08*Math.sin(k*2.7+x)));}x+=w;}
 shape.lineTo(x1,y0-5);shape.lineTo(x0,y0-5);
 const geo=new THREE.ExtrudeGeometry(shape,{depth:2,bevelEnabled:true,bevelThickness:1.5,bevelSize:1.5,bevelSegments:2,curveSegments:4});geo.translate(0,0,z);
 return new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:1}));
}
export function buildBackdrop(theme:string,areaWidthPx:number,wallMaterial?:THREE.MeshStandardMaterial,areaId=''):THREE.Group{
 const g=new THREE.Group(),x0=-40,x1=areaWidthPx/16+60;
 if(areaId.includes('sky')){
  // Above the clouds: a sea of cloud puffs far below and behind, no ground.
  const r=rand(11),m=new THREE.MeshStandardMaterial({color:0xe4ecfa,roughness:1}),n=Math.round((x1-x0)*3.2);  // lit by sun + blue sky fill: sunny tops, bluish undersides
  const puffs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,3),m,n),mm=new THREE.Matrix4(),q=new THREE.Quaternion(),sc=new THREE.Vector3(),p=new THREE.Vector3();
  for(let i=0;i<n;i++){const z=-6-r()*80,k=1.5+r()*3.5;puffs.setMatrixAt(i,mm.compose(p.set(x0+r()*(x1-x0),-2.2+r()*2.5-(-z)*0.03,z),q,sc.set(k*1.6,k*0.75,k)));}
  puffs.castShadow=puffs.receiveShadow=true;puffs.computeBoundingSphere();
  g.add(puffs);return g;  // the painted sky (atmosphere.cloudSky) supplies the far cloud bank
 }
 if(theme==='ground'||theme==='night'||theme==='snow'){
  const snow=theme==='snow';
  // Soil wall right behind the gameplay strip: pits read as dark chasms instead of showing the sky.
  const soil=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,6.2,3.6),new THREE.MeshStandardMaterial({color:snow?0x4a4a58:0x3a2414,roughness:1}));soil.position.set((x0+x1)/2,-2.0,-2.8);soil.receiveShadow=true;g.add(soil);
  g.add(terrain(x0,x1,-1.0,-30,1.15,2.2,snow?0xc8d4e0:0x2e7d32,snow?0xffffff:0x8bc34a,1.3,1.5,6));
  g.add(trees(x0,x1,-14,-28,1.15,2.2,7,Math.round((x1-x0)*0.45)));
  g.add(terrain(x0,x1,-30,-70,1.0,5,snow?0xaab8c8:0x3f7a4a,snow?0xf0f6ff:0x7fb069,4.1,3));
  g.add(mountains(x0*3,x1*1.4,-150,-6,11,snow?0xb8c8dc:0x6f93bd,9));
  g.add(mountains(x0*4,x1*1.6,-230,-8,18,snow?0xd0dcec:0x8eaad0,17));
 }else if(theme==='underground'||theme==='castle'){
  g.add(caveWall(theme,x0,x1,g));void wallMaterial;
 }else if(theme==='water'){
  g.add(terrain(x0,x1,-6,-40,-1,3,0x0d3b66,0x3a8fb7,5.5,1.5),underwater(x0,x1));
 }
 return g;
}

/** Point-light spots the World keeps lit (nearest few to the camera): torches in castles, crystal clusters in caves. */
export interface LightSpot{x:number;y:number;z:number;color:number;power:number}
const noise=(x:number,y:number)=>0.5*Math.sin(x*1.7+y*0.9)+0.3*Math.sin(x*3.9-y*2.3+1.7)+0.2*Math.sin(x*7.1+y*5.3+0.4);
/** Carved back wall right behind the gameplay strip: scanned rock (cave) or stone (castle) with relief, plus glowing crystals or torches. */
function caveWall(theme:string,x0:number,x1:number,root:THREE.Group):THREE.Group{
 const g=new THREE.Group(),castle=theme==='castle',r=rand(castle?5:3),w=x1-x0,h=24,lights:LightSpot[]=[];
 const geo=new THREE.PlaneGeometry(w,h,Math.ceil(w*2),h*2),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setZ(i,(castle?0.12:0.75)*noise(x*(castle?0.5:0.35),y*0.35));}
 geo.computeVertexNormals();const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*w/(castle?3:4),uv.getY(i)*h/(castle?3:4));geo.setAttribute('uv1',uv.clone());
 const mat=castle?photoMaterial('castle_brick_01',[0.62,0.6,0.66]):photoMaterial('dark_rock_02',[0.36,0.55,1.05]);
 const wall=new THREE.Mesh(geo,mat);wall.position.set((x0+x1)/2,h/2-2,-2.6);wall.receiveShadow=true;g.add(wall);
 if(castle){
  // torches: iron bracket + flame (emissive, bloomed) every ~7 tiles at head height
  const iron=new THREE.MeshStandardMaterial({color:0x2a2a30,roughness:0.5,metalness:0.8}),flame=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(4,1.7,0.45,THREE.LinearSRGBColorSpace)}),core=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(6,5,2.5,THREE.LinearSRGBColorSpace)});
  const n=Math.floor(w/7),br=new THREE.InstancedMesh(new THREE.CylinderGeometry(0.09,0.05,0.5,8),iron,n),fl=new THREE.InstancedMesh(new THREE.ConeGeometry(0.14,0.42,10),flame,n),co=new THREE.InstancedMesh(new THREE.ConeGeometry(0.07,0.22,8),core,n),m=new THREE.Matrix4();
  for(let i=0;i<n;i++){const x=x0+3.5+i*7+r()*1.5,y=7.2+r()*1.2,z=-2.2;br.setMatrixAt(i,m.makeTranslation(x,y,z));fl.setMatrixAt(i,m.makeTranslation(x,y+0.45,z));co.setMatrixAt(i,m.makeTranslation(x,y+0.36,z+0.02));lights.push({x,y:y+0.6,z:z+0.5,color:0xff9a40,power:22});}
  for(const im of [br,fl,co]){im.computeBoundingSphere();g.add(im);}
 }else{
  // crystal clusters: hexagonal shards on the cave floor line and hanging from the ceiling, self-lit in fantasy colours
  const COLS=[0x45e8ff,0xb46bff,0x5dffb0,0xff7ad8];const geoC=new THREE.CylinderGeometry(0,0.13,1,6,1);geoC.translate(0,0.5,0);
  const byCol=COLS.map(()=>[] as THREE.Matrix4[]),q=new THREE.Quaternion(),e=new THREE.Euler();
  for(let x=x0+2;x<x1;x+=4+r()*5){const k=Math.floor(r()*COLS.length),ceil=r()<0.35,y=ceil?12.6:1.9,z=-2.0-r()*0.3;
   for(let j=0;j<4+r()*4;j++){const s=0.5+r()*0.9;e.set((r()-0.5)*0.9,r()*6.28,(ceil?Math.PI:0)+(r()-0.5)*0.9);byCol[k].push(new THREE.Matrix4().compose(new THREE.Vector3(x+(r()-0.5)*0.8,y,z+(r()-0.5)*0.3),q.setFromEuler(e),new THREE.Vector3(s,s*(1.2+r()*1.6),s)));}
   lights.push({x,y:ceil?11.8:2.8,z:z+0.8,color:COLS[k],power:9});}
  COLS.forEach((c,k)=>{if(!byCol[k].length)return;const col=new THREE.Color(c);const mat=new THREE.MeshPhysicalMaterial({color:col,emissive:col,emissiveIntensity:1.6,roughness:0.12,metalness:0,clearcoat:1,transparent:true,opacity:0.92});
   const im=new THREE.InstancedMesh(geoC,mat,byCol[k].length);byCol[k].forEach((m,i)=>im.setMatrixAt(i,m));im.computeBoundingSphere();g.add(im);});
 }
 root.userData.lights=lights;return g;
}
/** Underwater: shafts of sunlight from the surface and rising bubbles (static, unlit, additive). */
function underwater(x0:number,x1:number):THREE.Group{
 const g=new THREE.Group(),r=rand(23);
 const c=document.createElement('canvas');c.width=64;c.height=256;const cx=c.getContext('2d')!,gr=cx.createLinearGradient(0,0,0,256);gr.addColorStop(0,'rgba(200,245,255,0.55)');gr.addColorStop(1,'rgba(120,220,255,0)');cx.fillStyle=gr;cx.fillRect(0,0,64,256);
 const side=cx.createLinearGradient(0,0,64,0);side.addColorStop(0,'rgba(0,0,0,1)');side.addColorStop(0.5,'rgba(0,0,0,0)');side.addColorStop(1,'rgba(0,0,0,1)');cx.globalCompositeOperation='destination-out';cx.fillStyle=side;cx.fillRect(0,0,64,256);
 const ray=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,fog:false,opacity:0.5});
 for(let x=x0;x<x1;x+=3+r()*5){const m=new THREE.Mesh(new THREE.PlaneGeometry(1.2+r()*2.5,16),ray);m.position.set(x,7,-3-r()*14);m.rotation.z=0.28+r()*0.1;g.add(m);}
 const n=Math.round((x1-x0)*3),b=new THREE.InstancedMesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshPhysicalMaterial({color:0xdff8ff,roughness:0.05,transparent:true,opacity:0.35,emissive:0x5fb8e0,emissiveIntensity:0.3,depthWrite:false}),n),mm=new THREE.Matrix4();
 for(let i=0;i<n;i++){const s=0.03+r()*r()*0.09;b.setMatrixAt(i,mm.makeScale(s,s,s).setPosition(x0+r()*(x1-x0),1+r()*12,-1.2-r()*10));}
 b.computeBoundingSphere();g.add(b);return g;
}
