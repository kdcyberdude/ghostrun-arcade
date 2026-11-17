// Hammer Bro body, rebuilt in code on the authored rig (hammer_bro.glb: bones Root, Hips, Head, ArmL/R, LegL/R and its walk/idle clips): a helmeted
// turtle soldier with a domed green helmet and rim, big eyes under it and a broad snout, a scuted green shell with a cream rim on its back, a segmented
// cream belly plate and muscular arms with fists. The authored shoes (and the held hammer the renderer toggles) are kept. Every new part sits inside the
// authored body's extent (same feet, front and back), so the actor's box and placement stay as before; only the look changes.
import * as THREE from 'three';
import type {Actor} from './actors.js';
/** Authoring space of the asset builders (Blender: +X forward, +Y left, +Z up) -> glTF model space (+X forward, +Y up, +Z toward the camera). */
const B=(x:number,y:number,z:number)=>new THREE.Vector3(x,z,-y);
const REPLACED=new Set(['M_Shell','M_Belly','M_Skin','M_Helmet','M_Eye']);
/** Small reusable GLSL: value noise and an inline bump (perturb the shading normal by the screen derivatives of a height). */
const NOISE=`float hbHash(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float hbNoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);
 return mix(mix(mix(hbHash(i),hbHash(i+vec3(1,0,0)),f.x),mix(hbHash(i+vec3(0,1,0)),hbHash(i+vec3(1,1,0)),f.x),f.y),
  mix(mix(hbHash(i+vec3(0,0,1)),hbHash(i+vec3(1,0,1)),f.x),mix(hbHash(i+vec3(0,1,1)),hbHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
vec3 hbBump(vec3 n,float h,float k){vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition),r1=cross(sy,n),r2=cross(n,sx);float det=dot(sx,r1);
 vec3 g=sign(det)*(dFdx(h)*k*r1+dFdy(h)*k*r2);return normalize(abs(det)*n-g);}
`;
type Surface={color:string;bump:string;strength:number};
/** A physical material whose albedo and bump come from `surface` GLSL evaluated on the part's own unit-sphere/object position (no UVs needed). */
function patterned(name:string,key:string,params:THREE.MeshPhysicalMaterialParameters,s:Surface){
 const m=new THREE.MeshPhysicalMaterial(params);m.name=name;
 m.onBeforeCompile=sh=>{
  sh.vertexShader='varying vec3 vHbP;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vHbP=position;');
  sh.fragmentShader='varying vec3 vHbP;\n'+sh.fragmentShader.replace('void main() {',NOISE+'void main() {')
   .replace('#include <color_fragment>',`#include <color_fragment>\n {vec3 p=vHbP;${s.color}}`)
   .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>\n {vec3 p=vHbP;float h=0.0;${s.bump}normal=hbBump(normal,h,${s.strength.toFixed(4)});}`);
 };
 m.customProgramCacheKey=()=>'hammer-bro-'+key;return m;
}
/** Scutes on a unit sphere around the shell's crown: one central plate, a ring of 6, a marginal ring of 11; `edge` = angular distance to a seam. */
const SCUTES=`vec3 a=normalize(vec3(-1.0,0.55,0.0)),u=normalize(cross(a,vec3(0,0,1))),w=cross(a,u);vec3 n=normalize(p);
 float th=acos(clamp(dot(n,a),-1.0,1.0)),ph=atan(dot(n,w),dot(n,u));float edge,cell;
 if(th<0.5){edge=0.5-th;cell=0.0;}
 else if(th<1.12){float s=(ph+3.14159)/6.28318*6.0;edge=min(min(th-0.5,1.12-th),min(fract(s),1.0-fract(s))*1.047*sin(th));cell=1.0+floor(s);}
 else{float s=(ph+3.14159)/6.28318*11.0+0.5;edge=min(th-1.12,min(fract(s),1.0-fract(s))*0.571*sin(th));cell=8.0+floor(s);}
`;
function materials(){
 const shell=patterned('M_Shell','shell',{color:0x2fa52f,roughness:0.32,clearcoat:0.7,clearcoatRoughness:0.25},{
  color:SCUTES+'float seam=smoothstep(0.015,0.07,edge);diffuseColor.rgb*=mix(0.3,1.0,seam)*(0.86+0.22*hbHash(vec3(cell)))*(0.96+0.04*sin(edge*70.0))*(0.94+0.08*hbNoise(p*18.0));',
  bump:SCUTES+'h=smoothstep(0.0,0.12,edge)*0.05+0.001*sin(edge*70.0)+0.002*hbNoise(p*30.0);',strength:1.0});
 const belly=patterned('M_Belly','belly',{color:0xf2e2a8,roughness:0.5,clearcoat:0.25,clearcoatRoughness:0.5},{
  color:'float g=abs(fract(p.y*2.2+0.4)-0.5)*2.0;diffuseColor.rgb*=mix(0.72,1.0,smoothstep(0.0,0.08,1.0-g))*(0.95+0.05*hbNoise(p*25.0));',
  bump:'float g=abs(fract(p.y*2.2+0.4)-0.5)*2.0;h=0.02*smoothstep(0.0,0.15,1.0-g)+0.002*hbNoise(p*40.0);',strength:1.0});
 const skin=patterned('M_Skin','skin',{color:0xf2c24a,roughness:0.55,sheen:0.4,sheenRoughness:0.5,sheenColor:new THREE.Color(0xfff0c0)},{
  color:'diffuseColor.rgb*=0.96+0.06*hbNoise(p*30.0);',bump:'h=0.0012*hbNoise(p*60.0);',strength:1.0});
 const helmet=new THREE.MeshPhysicalMaterial({name:'M_Helmet',color:0x2a8c36,roughness:0.28,metalness:0.1,clearcoat:1,clearcoatRoughness:0.12});
 const eye=new THREE.MeshPhysicalMaterial({name:'M_EyeWhite',color:0xf6f6f2,roughness:0.15,clearcoat:1,clearcoatRoughness:0.05});
 const pupil=new THREE.MeshPhysicalMaterial({name:'M_Pupil',color:0x080808,roughness:0.1,clearcoat:1,clearcoatRoughness:0.05});
 const rim=new THREE.MeshPhysicalMaterial({name:'M_Belly',color:0xf2e2a8,roughness:0.45,clearcoat:0.4,clearcoatRoughness:0.3});
 const dark=new THREE.MeshStandardMaterial({name:'M_Nostril',color:0x3a2208,roughness:0.7});
 return {shell,belly,rim,skin,helmet,eye,pupil,dark};
}
const sphere=new THREE.SphereGeometry(1,40,28),dome=new THREE.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI/2);
/** Replace the authored body of a freshly created Hammer Bro actor (rest pose) with the rebuilt one. Idempotent. */
export function dressHammerBro(a:Actor){
 if(a.root.userData.hammerBroDressed)return;a.root.userData.hammerBroDressed=true;
 const m=materials(),model=a.model;model.updateMatrixWorld(true);
 const parts:[THREE.Mesh,string][]=[];
 const ell=(c:THREE.Vector3,r:[number,number,number],mat:THREE.Material,bone:string,geo=sphere,rotZ=0)=>{const o=new THREE.Mesh(geo,mat);o.position.copy(c);o.scale.set(r[0],r[2],r[1]);o.rotation.z=rotZ;parts.push([o,bone]);return o;};
 const limb=(p0:THREE.Vector3,p1:THREE.Vector3,r0:number,mat:THREE.Material,bone:string)=>{const d=p1.clone().sub(p0),o=new THREE.Mesh(new THREE.CapsuleGeometry(r0,d.length(),8,16),mat);
  o.position.copy(p0).add(p1).multiplyScalar(0.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());parts.push([o,bone]);return o;};
 const tilt=8*Math.PI/180;
 // Torso: shell on the back (tilted like the authored one), belly plate in front, a cream rim where shell meets body.
 ell(B(-0.15,0,0.83),[0.36,0.39,0.41],m.shell,'Hips',sphere,tilt);
 ell(B(0.05,0,0.80),[0.26,0.30,0.36],m.belly,'Hips');
 // The rim rings the shell's open front (a vertical band between the green shell and the body), tilted with the shell.
 const rim=new THREE.Mesh(new THREE.TorusGeometry(1,0.13,14,56),m.rim);rim.position.copy(B(-0.09,0,0.835));rim.rotation.set(0,Math.PI/2,tilt,'ZYX');rim.scale.set(0.39,0.41,0.3);parts.push([rim,'Hips']);
 // Head: round skull, broad snout with nostrils, big eyes peeking under a domed helmet with a thick rim.
 ell(B(0.19,0,1.22),[0.22,0.2,0.2],m.skin,'Head');
 ell(B(0.36,0,1.15),[0.155,0.135,0.10],m.skin,'Head');
 for(const sg of [1,-1]){ell(B(0.50,sg*0.04,1.18),[0.012,0.016,0.012],m.dark,'Head');
  ell(B(0.36,sg*0.072,1.255),[0.05,0.052,0.085],m.eye,'Head');ell(B(0.398,sg*0.066,1.25),[0.02,0.028,0.048],m.pupil,'Head');
  ell(B(0.413,sg*0.058,1.272),[0.006,0.008,0.012],m.eye,'Head');}
 ell(B(0.16,0,1.31),[0.27,0.25,0.22],m.helmet,'Head',dome);
 const brim=new THREE.Mesh(new THREE.TorusGeometry(1,0.11,12,48),m.helmet);brim.position.copy(B(0.16,0,1.315));brim.rotation.x=Math.PI/2;brim.scale.set(0.27,0.25,0.3);parts.push([brim,'Head']);
 // Limbs: thick arms ending in fists, sturdy thighs above the authored shoes.
 for(const [sg,s] of [[1,'L'],[-1,'R']] as const){
  limb(B(0.08,sg*0.29,0.97),B(0.22,sg*0.345,0.80),0.072,m.skin,'Arm'+s);ell(B(0.25,sg*0.35,0.76),[0.085,0.075,0.08],m.skin,'Arm'+s);
  limb(B(0.02,sg*0.17,0.52),B(0.05,sg*0.17,0.20),0.105,m.skin,'Leg'+s);
 }
 model.traverse(o=>{const x=o as THREE.Mesh;if(x.isMesh&&REPLACED.has((x.material as THREE.Material).name))x.visible=false;});
 for(const [o,bone] of parts){o.castShadow=o.receiveShadow=true;model.add(o);o.updateMatrixWorld(true);(a.node(bone)??model).attach(o);}
 // Palette recolouring (entities.ts paint) reaches the new shell and helmet through the actor's material lists.
 for(const mat of [m.shell,m.helmet,m.belly,m.rim,m.skin]){const list=a.materials.get(mat.name)??[];list.push(mat);a.materials.set(mat.name,list);}
}
