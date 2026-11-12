// Photoreal nature for the outdoor themes: scanned-texture terrain and instanced CC0 vegetation scans (Poly Haven, decimated by build_vegetation.py).
// Pure decoration behind the gameplay plane; deterministic placement (seeded), built once per area.
import * as THREE from 'three';
import type {Kit} from './kit.js';
import type {Cluster} from './layout.js';
const ROOT=import.meta.env.BASE_URL+'assets25d/';
const TEX=ROOT+'ph/tex/';
const loader=new THREE.TextureLoader();const cache=new Map<string,THREE.MeshStandardMaterial>(),texCache=new Map<string,THREE.Texture>();
/** Textures are fetched up front (Renderer25D.load) so no area ever shows a frame of untextured, black terrain. */
const tex=(url:string)=>{let t=texCache.get(url);if(!t){t=loader.load(url);texCache.set(url,t);}return t;};
const PRELOAD=['leafy_grass','aerial_grass_rock','excavated_soil_wall','snow_02','snow_field_aerial','dark_rock_02','castle_brick_01'];
export const rand=(seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
/** Scanned PBR material, world-space tiled (`repeat` tiles per texture). ARM: R = AO, G = roughness, B = metalness. */
export function photoMaterial(id:string,tint:number|[number,number,number]=0xffffff,key=id+tint){
 let m=cache.get(key);if(m)return m;
 const t=(n:string,srgb:boolean)=>{const x=tex(`${TEX}${id}_${n}.jpg`);x.wrapS=x.wrapT=THREE.RepeatWrapping;x.anisotropy=8;if(srgb)x.colorSpace=THREE.SRGBColorSpace;return x;};
 const arm=t('arm',false);m=new THREE.MeshStandardMaterial({map:t('diff',true),normalMap:t('nor',false),roughnessMap:arm,aoMap:arm,color:typeof tint==='number'?tint:new THREE.Color().setRGB(...tint,THREE.LinearSRGBColorSpace),roughness:1,metalness:0});
 cache.set(key,m);return m;
}
/** World-space UVs (x, z) so tiling does not stretch on long terrain strips. */
function worldUV(geo:THREE.BufferGeometry,scale:number,axes:'xz'|'xy'='xz'){
 const p=geo.attributes.position,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){uv[i*2]=p.getX(i)/scale;uv[i*2+1]=(axes==='xz'?p.getZ(i):p.getY(i))/scale;}
 geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));geo.setAttribute('uv1',new THREE.BufferAttribute(uv.slice(),2));
}
export function heightAt(x:number,z:number,flat:number){
 const d=Math.max(0,-z-flat),ramp=Math.min(1,d/10);
 return ramp*(1.6*Math.sin(x*0.07+z*0.05)+0.9*Math.sin(x*0.19-z*0.11+1.3)+0.4*Math.sin(x*0.43+z*0.3))+Math.max(0,d-20)*0.012
  +Math.min(1,Math.max(0,d-200)/120)*(15+9*Math.sin(x*0.011+0.7)+4*Math.sin(x*0.037-z*0.01));  // distant rolling ridges, hazed blue by the fog
}
export function terrainStrip(x0:number,x1:number,zFront:number,zBack:number,y0:number,material:THREE.Material,flat=6,step=1.5){
 const geo=new THREE.PlaneGeometry(x1-x0,zFront-zBack,Math.ceil((x1-x0)/step),Math.ceil((zFront-zBack)/step));geo.rotateX(-Math.PI/2);geo.translate((x0+x1)/2,0,(zFront+zBack)/2);
 const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setY(i,y0+heightAt(p.getX(i),p.getZ(i),flat));
 geo.computeVertexNormals();worldUV(geo,4);const m=new THREE.Mesh(geo,material);m.receiveShadow=true;return m;
}
/** Instances of a kit model (all its parts) at the given transforms. */
/** Instances of a kit model (all its parts) at the given transforms, split into CHUNK-wide x slices so frustum culling drops off-screen batches
 * (one InstancedMesh spanning a whole level would be drawn in full every frame). */
const CHUNK=24;
function chunked<T>(items:T[],x:(t:T)=>number){const by=new Map<number,T[]>();for(const t of items){const k=Math.floor(x(t)/CHUNK);(by.get(k)??by.set(k,[]).get(k)!).push(t);}return [...by.values()];}
export function scatter(kit:Kit,name:string,mats:THREE.Matrix4[],shadows=true){
 const g=new THREE.Group(),parts=kit.parts(name);if(!parts||!mats.length)return g;const tmp=new THREE.Matrix4();
 for(const part of parts){const mat=part.material as THREE.MeshStandardMaterial;if(mat.map&&mat.transparent){mat.alphaTest=0.45;mat.transparent=false;mat.side=THREE.DoubleSide;}}
 for(const chunk of chunked(mats,m=>m.elements[12]))for(const part of parts){
  const im=new THREE.InstancedMesh(part.geometry,part.material,chunk.length);chunk.forEach((m,i)=>im.setMatrixAt(i,tmp.multiplyMatrices(m,part.matrix)));
  im.computeBoundingSphere();im.castShadow=shadows;im.receiveShadow=true;g.add(im);
 }
 return g;
}
/** Poly Haven plant scans are rows of separate plants up to ~1.5 m from the file origin. Each instance here gets ONE of those plants, recentred (x, z) on
 * the instance point, so a scaled, rotated scan never reaches past its placement (no leaves poking out in front of the gameplay blocks) and variety goes up. */
export function plants(kit:Kit,name:string,mats:THREE.Matrix4[],shadows=false){
 const g=new THREE.Group(),parts=kit.parts(name);if(!parts||!mats.length)return g;const tmp=new THREE.Matrix4(),b=new THREE.Box3(),c=new THREE.Vector3();
 for(const part of parts){const mat=part.material as THREE.MeshStandardMaterial;if(mat.map&&mat.transparent){mat.alphaTest=0.45;mat.transparent=false;mat.side=THREE.DoubleSide;}}
 const centred=parts.map(p=>{p.geometry.computeBoundingBox();b.copy(p.geometry.boundingBox!).applyMatrix4(p.matrix).getCenter(c);return new THREE.Matrix4().makeTranslation(-c.x,0,-c.z).multiply(p.matrix);});
 const by=parts.map(()=>[] as THREE.Matrix4[]);mats.forEach((m,i)=>by[i%parts.length].push(m));
 parts.forEach((part,k)=>{for(const chunk of chunked(by[k],m=>m.elements[12])){
  const im=new THREE.InstancedMesh(part.geometry,part.material,chunk.length);chunk.forEach((m,i)=>im.setMatrixAt(i,tmp.multiplyMatrices(m,centred[k])));
  im.computeBoundingSphere();im.castShadow=shadows;im.receiveShadow=true;g.add(im);}});
 return g;
}
/** Impostor cards (visual25d/blender/render_impostors.py): full-detail tree scans rendered from the front; the camera never rotates, so one quad per tree reads as 3D. */
type Imp={views:number;width_m:number;height_m:number};let IMP:Record<string,Imp>={};const METRE=1.8;
export async function loadImpostors(){
 try{const r=await fetch(ROOT+'impostors/index.json');if(r.ok&&r.headers.get('content-type')?.includes('json'))IMP=await r.json();}catch{/* no impostors: trees are skipped */}
 const urls=[...PRELOAD.flatMap(id=>['diff','nor','arm'].map(n=>`${TEX}${id}_${n}.jpg`)),...Object.entries(IMP).flatMap(([id,im])=>Array.from({length:im.views},(_,v)=>`${ROOT}impostors/${id}_${v}.webp`))];
 await Promise.all(urls.map(u=>loader.loadAsync(u).then(t=>{texCache.set(u,t);},()=>{/* missing file: falls back to lazy load */})));
}
export const hasImpostors=()=>Object.keys(IMP).length>0;
const impQuad=new THREE.PlaneGeometry(1,1).translate(0,0.5,0),impMats=new Map<string,THREE.MeshBasicMaterial>();
type TreeSpot={id:string;x:number;y:number;z:number;s:number;v:number;flip:boolean};
function impostors(spots:TreeSpot[],tint:number|THREE.Color,frost=0):THREE.Group{
 const g=new THREE.Group(),by=new Map<string,THREE.Matrix4[]>();
 for(const t of spots){const im=IMP[t.id];if(!im)continue;const key=`${t.id}_${t.v%im.views}`,w=im.width_m*METRE*t.s,h=im.height_m*METRE*t.s;
  (by.get(key)??by.set(key,[]).get(key)!).push(new THREE.Matrix4().compose(new THREE.Vector3(t.x,t.y,t.z),new THREE.Quaternion(),new THREE.Vector3(t.flip?-w:w,h,1)));}
 for(const [key,mats] of by){
  const mk=key+(typeof tint==='number'?tint:tint.toArray().join())+frost;let m=impMats.get(mk);
  if(!m){const map=tex(`${ROOT}impostors/${key}.webp`);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;m=new THREE.MeshBasicMaterial({map,alphaTest:0.5,side:THREE.DoubleSide,color:tint});
   // frost (snow theme): leaves turn to rime: luminance lifted to cold white, the shape and shading of the scan kept
   if(frost)m.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb,(dot(diffuseColor.rgb,vec3(0.3,0.59,0.11))*1.5+0.28)*vec3(0.9,0.96,1.08),${frost.toFixed(2)});`);};
   m.customProgramCacheKey=()=>'frost'+frost;impMats.set(mk,m);}
  for(const chunk of chunked(mats,x=>x.elements[12])){const im=new THREE.InstancedMesh(impQuad,m,chunk.length);chunk.forEach((x,i)=>im.setMatrixAt(i,x));im.computeBoundingSphere();im.castShadow=true;g.add(im);}
 }
 return g;
}
/** Species scale so the scans read as 6-10 m trees. */
/** Lush emerald lawn: linear multipliers on the olive grass scans (green above 1 lifts the scan's own green). */
const LAWN:[number,number,number]=[0.4,0.92,0.24],LAWN_FAR:[number,number,number]=[0.5,0.95,0.34];
/** Impostors are unlit (baked in Cycles): a lift towards fresh sunlit green. */
const SUNLIT_LEAVES=new THREE.Color().setRGB(1.12,1.3,0.95,THREE.LinearSRGBColorSpace),MOONLIT_LEAVES=new THREE.Color().setRGB(0.3,0.42,0.62,THREE.LinearSRGBColorSpace);
/** Night: glowing fireflies drifting over the meadow (unlit additive points; bloom gives the halo). */
function fireflies(x0:number,x1:number,r:()=>number){
 const n=Math.round((x1-x0)*1.2),p=new Float32Array(n*3);for(let i=0;i<n;i++){const x=x0+r()*(x1-x0),z=-2.5-r()*r()*30;p.set([x,1.1+heightAt(x,z,6)+0.3+r()*2.6,z],i*3);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!,h=g.createRadialGradient(32,32,0,32,32,32);h.addColorStop(0,'rgba(255,255,220,1)');h.addColorStop(0.25,'rgba(220,255,120,0.8)');h.addColorStop(1,'rgba(160,255,80,0)');g.fillStyle=h;g.fillRect(0,0,64,64);
 return new THREE.Points(geo,new THREE.PointsMaterial({map:new THREE.CanvasTexture(c),size:0.32,color:0xffffff,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
}
const TREE_SCALE:Record<string,number>={island_tree_02:2.0,tree_small_02:1.9,jacaranda_tree:0.5};
const pose=(x:number,y:number,z:number,s:number,ry:number)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,ry,0)),new THREE.Vector3(s,s,s));
export function photoBackdrop(kit:Kit,theme:string,x0:number,x1:number):THREE.Group{
 const g=new THREE.Group(),r=rand(97),snow=theme==='snow',night=theme==='night';
 const ground=photoMaterial(snow?'snow_02':'aerial_grass_rock',snow?[1.02,1.08,1.25]:LAWN_FAR);
 const near=photoMaterial(snow?'snow_02':'leafy_grass',snow?[1.08,1.14,1.3]:LAWN);
 const far=terrainStrip(x0-150,x1+150,-57,-420,1.1,ground,6,6);far.receiveShadow=false;  // outside the shadow camera: would show its edge as a seam
 g.add(terrainStrip(x0,x1,-1,-60,1.1,near),far);
 const soil=new THREE.Mesh(new THREE.BoxGeometry(x1-x0,6.2,3.6),photoMaterial('excavated_soil_wall',0x8a7a6a));worldUV(soil.geometry,3,'xy');soil.position.set((x0+x1)/2,-2,-2.8);soil.receiveShadow=true;g.add(soil);
 const FLOWERS=['veg_flower_gazania','veg_flower_ursinia','veg_flower_empodium','veg_periwinkle_plant','veg_shrub_sorrel_01'];
 const trees:TreeSpot[]=[],flowers:THREE.Matrix4[][]=FLOWERS.map(()=>[]),grass:THREE.Matrix4[][]=[[],[]],rocks:THREE.Matrix4[]=[],ferns:THREE.Matrix4[]=[];
 const at=(x:number,z:number)=>1.1+heightAt(x,z,6);
 for(let x=x0;x<x1;x+=1.1){
  // tree belt: a few mid-distance trees and a dense far wood line, mostly leafy species, jacaranda rare
  const tree=(z:number,big:number)=>{const id=r()<0.08?'jacaranda_tree':r()<0.5?'tree_small_02':'island_tree_02';trees.push({id,x:x+r(),y:at(x,z)-0.2,z,s:TREE_SCALE[id]*(big+r()*0.4),v:Math.floor(r()*3),flip:r()<0.5});};
  if(r()<0.035)tree(-20-r()*30,0.75);
  if(r()<0.5)tree(-55-r()*70,0.42);  // far wood line kept low so it hugs the horizon under open sky
  // wildflower patches: a few plants of one species per patch, densest near the gameplay plane
  if(r()<0.7){const z=-2.2-r()*r()*14,k=Math.floor(r()*FLOWERS.length);for(let i=0;i<8+r()*10;i++){const fx=x+r()*2,fz=z-r()*1.6;flowers[k].push(pose(fx,at(fx,fz),fz,2.4+r()*1.0,r()*6.28));}}
  // meadow: flower drifts across the middle distance (bigger further back so they still read)
  if(r()<0.5){const z=-6-r()*22,k=Math.floor(r()*3);for(let i=0;i<12+r()*16;i++){const fx=x+r()*3,fz=z-r()*3;flowers[k].push(pose(fx,at(fx,fz),fz,3.2+r()*1.5,r()*6.28));}}
  for(let k=0;k<20;k++){const z=-1.4-r()*r()*26;grass[1].push(pose(x+r()*1.1,at(x,z),z,0.9+r()*0.7,r()*6.28));}
  if(r()<0.03){const z=-10-r()*20;rocks.push(pose(x,at(x,z)-0.1,z,0.25+r()*0.25,r()*6.28));}
  for(let k=0;k<2;k++)if(r()<0.35){const z=-1.8-r()*8;ferns.push(pose(x+r(),at(x,z),z,1.0+r()*0.8,r()*6.28));}
 }
 if(snow){flowers.forEach(a=>{a.length=0;});grass[1].length=0;ferns.length=0;}  // winter: bare snowfield, trees only
 trees.sort((a,b)=>a.z-b.z);
 if(snow)trees.splice(0,trees.length,...trees.filter((_,i)=>i%3===0));  // winter: sparse frosted wood
 if(night)g.add(fireflies(x0,x1,r));
 g.add(impostors(trees,night?MOONLIT_LEAVES:snow?0xffffff:SUNLIT_LEAVES,snow?0.55:0),...FLOWERS.map((f,i)=>plants(kit,f,flowers[i])),
  plants(kit,'veg_grass_medium_02',grass[1]),scatter(kit,'veg_rock_moss_set_01',rocks),plants(kit,'veg_fern_02',ferns));
 return g;
}
/** Realistic stand-ins for the original scenery clusters (hill -> grassy knoll with rocks, bush -> real shrubs, tree -> scanned tree). */
export function photoCluster(kit:Kit,c:Cluster,w:number,h:number):THREE.Group{
 const g=new THREE.Group(),r=rand(c.col0*31+c.row0*7+3);
 if(c.kind==='hill'){
  const depth=Math.max(3,w*0.6),geo=new THREE.SphereGeometry(1,72,36,0,Math.PI*2,0,Math.PI/2);geo.scale(w/2,h,depth/2);
  const p=geo.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),y=p.getY(i);p.setY(i,y*(1+0.06*Math.sin(x*2.1+z*1.7))+0.0);}
  geo.computeVertexNormals();worldUV(geo,3);
  const knoll=new THREE.Mesh(geo,photoMaterial('leafy_grass',LAWN));knoll.receiveShadow=true;g.add(knoll);
  const grass:THREE.Matrix4[]=[],rocks:THREE.Matrix4[]=[];
  const bloom:THREE.Matrix4[]=[];for(let i=0;i<w*9;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*0.85,x=Math.cos(a)*d*w/2,z=Math.sin(a)*d*depth/2;bloom.push(pose(x,h*Math.sqrt(Math.max(0,1-d*d))-0.05,z,2.2+r()*0.8,r()*6.28));}
  g.add(plants(kit,'veg_flower_ursinia',bloom));
  for(let i=0;i<w*90;i++){const a=r()*Math.PI*2,d=Math.sqrt(r())*0.92,x=Math.cos(a)*d*w/2,z=Math.sin(a)*d*depth/2,y=h*Math.sqrt(Math.max(0,1-d*d));grass.push(pose(x,y-0.05,z,0.8+r()*0.6,r()*6.28));}
  g.add(plants(kit,'veg_grass_medium_02',grass),scatter(kit,'veg_rock_moss_set_01',rocks));
 }else if(c.kind==='bush'){
  // lush clump: ferns with a flowering plant tucked in (the original's green bush)
  const n=Math.max(6,Math.round(w*5)),ferns:THREE.Matrix4[]=[],bloom:THREE.Matrix4[]=[];
  for(let i=0;i<n;i++)ferns.push(pose((i/(n-1)-0.5)*(w-0.4),0,-0.4-r()*0.6,0.9+r()*0.4,r()*6.28));
  for(let i=0;i<Math.max(5,w*3);i++)bloom.push(pose((r()-0.5)*(w-0.4),0,-0.9-r()*0.4,1.8+r()*0.4,r()*6.28));  // kept behind the ground blocks so no leaf pokes through their front face
  g.add(plants(kit,'veg_fern_02',ferns),plants(kit,['veg_periwinkle_plant','veg_flower_gazania','veg_flower_ursinia'][c.col0%3],bloom));
 }else if(c.kind==='tree'){
  const id=c.col0%2?'tree_small_02':'island_tree_02',im=IMP[id];
  if(im)g.add(impostors([{id,x:0,y:0,z:0,s:h/(im.height_m*METRE)*1.6,v:c.col0,flip:c.row0%2===1}],0xffffff));
 }
 return g;
}
