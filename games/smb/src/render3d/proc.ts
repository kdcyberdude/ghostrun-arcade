// Procedural stand-ins used only when a GLB is not authored yet (and as the practical fallback if a model fails to load).
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {Part} from './kit.js';
import {mergeGeometries} from 'three/examples/jsm/utils/BufferGeometryUtils.js';
const std=(color:number,rough=0.6,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const box=(w=1,h=1,d=1,r=0.06)=>new RoundedBoxGeometry(w,h,d,4,r);
const I=()=>new THREE.Matrix4();
export const PROC_COLORS={ground:0x9a5a2a,brick:0xc2501e,question:0xf2a900,used:0x7a4a28,hard:0xb07a3a,wall:0x7f8aa8,pipe:0x1fa23a,castle:0xb0643c};
/** Single-tile blocks. */
export function procBlock(name:string):Part[]|undefined{
 const c=(PROC_COLORS as Record<string,number>)[name];if(c===undefined)return undefined;
 return [{geometry:box(),material:std(c,name==='question'?0.35:0.7,name==='question'?0.3:0),matrix:I()}];
}
/** Hollow pipe: `pipe_body` is one tile tall, `pipe_top` one tile tall with a wider lip; both 2 tiles wide, open ends, origin at the middle of the 2 x 1 footprint. */
export function procPipe(top:boolean):Part[]{
 const rO=0.93,rI=0.8,lip=1.0;const pts=top
  ?[[rI,-0.5],[rO,-0.5],[rO,0.12],[lip,0.12],[lip,0.5],[rI+0.02,0.5],[rI,-0.5]]
  :[[rI,-0.5],[rO,-0.5],[rO,0.5],[rI,0.5],[rI,-0.5]];
 const geo=new THREE.LatheGeometry(pts.map(p=>new THREE.Vector2(p[0],p[1])),48);
 return [{geometry:geo,material:std(PROC_COLORS.pipe,0.28,0.1),matrix:I()}];
}
export function procCoin():Part[]{return [{geometry:coinGeometry(),material:GOLD,matrix:I()}];}
/** Polished gold. Atmosphere gives it its own studio reflection map, so coins keep bright gold highlights even in dark caves and castles (bloom catches them). */
export const GOLD=new THREE.MeshPhysicalMaterial({color:0xffc43a,metalness:1,roughness:0.2,clearcoat:0.8,clearcoatRoughness:0.05,emissive:0xff9a00,emissiveIntensity:0.12,envMapIntensity:1.25});
let coinGeo:THREE.BufferGeometry|undefined;
/** Minted coin, 0.82 tile tall like the original 12-px coin: oval disc with a raised beveled rim, recessed face and the embossed vertical slot on both faces. */
export function coinGeometry(){
 if(coinGeo)return coinGeo;
 const prof=[[0,0.032],[0.25,0.032],[0.285,0.045],[0.33,0.062],[0.375,0.062],[0.405,0.045],[0.41,0.02],[0.41,-0.02],[0.405,-0.045],[0.375,-0.062],[0.33,-0.062],[0.285,-0.045],[0.25,-0.032],[0,-0.032]];
 const disc=new THREE.LatheGeometry(prof.map(([r,z])=>new THREE.Vector2(r,z)).reverse(),64);disc.rotateX(Math.PI/2);disc.scale(0.74,1,1);
 const n=disc.attributes.normal,v=new THREE.Vector3();for(let i=0;i<n.count;i++){v.fromBufferAttribute(n,i);v.x/=0.74;v.normalize();n.setXYZ(i,v.x,v.y,v.z);}  // inverse-transpose for the oval scale
 const w=0.05,h=0.2,slot=new THREE.Shape();slot.moveTo(-w,-h);slot.lineTo(-w,h);slot.absarc(0,h,w,Math.PI,0,true);slot.lineTo(w,-h);slot.absarc(0,-h,w,0,Math.PI,true);
 const parts=[disc.toNonIndexed()];
 for(const side of[1,-1]){const e=new THREE.ExtrudeGeometry(slot,{depth:0.012,bevelEnabled:true,bevelThickness:0.014,bevelSize:0.012,bevelSegments:3,curveSegments:16});
  if(side<0)e.rotateY(Math.PI);e.translate(0,0,side*0.032);e.deleteAttribute('uv');parts.push(e);}
 parts[0].deleteAttribute('uv');
 coinGeo=mergeGeometries(parts)!;return coinGeo;
}
const water=new THREE.MeshPhysicalMaterial({color:0x1a7fc0,roughness:0.04,metalness:0,clearcoat:1,clearcoatRoughness:0.02,transparent:true,opacity:0.62,depthWrite:false,envMapIntensity:1.6});
/** Molten lava, all in the shader from world position and time (seamless across tiles, deterministic from the frame): a domain-warped flow of dark,
 * cooling basalt crust plates drifting over the melt, broken by bright cracks and open molten pools whose black-body glow goes above 1 (HDR, caught by
 * the bloom pass). The surface heaves gently (top faces only, mean height unchanged) and the crust is bump-shaded. `lavaTime` is set per frame. */
export const lavaTime={value:0};
const LAVA_NOISE=`
uniform float uLavaT;varying vec3 vLavaW;varying vec3 vLavaN;
float lavaHash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float lavaNoise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);
 return mix(mix(lavaHash(i),lavaHash(i+vec2(1,0)),u.x),mix(lavaHash(i+vec2(0,1)),lavaHash(i+vec2(1,1)),u.x),u.y);}
float lavaFbm(vec2 p){float v=0.0,a=0.5;mat2 r=mat2(0.8,0.6,-0.6,0.8);for(int i=0;i<5;i++){v+=a*lavaNoise(p);p=r*p*2.03+11.7;a*=0.5;}return v;}
`;
const lava=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,roughness:0.9,metalness:0});
lava.onBeforeCompile=sh=>{
 sh.uniforms.uLavaT=lavaTime;
 sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uLavaT;varying vec3 vLavaW;varying vec3 vLavaN;').replace('#include <begin_vertex>',`#include <begin_vertex>
 vec4 lw=vec4(transformed,1.0);
 #ifdef USE_INSTANCING
 lw=instanceMatrix*lw;
 #endif
 lw=modelMatrix*lw;
 // The surface (the 0.2 top of a liquid_top tile) heaves with slow crossing swells; the mean height stays where it is.
 if(position.y>0.15&&position.y<0.3){float d=0.03*sin(lw.x*2.1+lw.z*1.3+uLavaT*0.9)+0.02*sin(lw.x*3.7-lw.z*2.3-uLavaT*1.4);transformed.y+=d;lw.y+=d;}
 vLavaW=lw.xyz;vLavaN=normal;`);
 sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>'+LAVA_NOISE).replace('#include <map_fragment>',`
 bool lavaTop=vLavaN.y>0.5;
 vec2 lp=lavaTop?vLavaW.xz*vec2(1.0,1.4):vLavaW.xy*vec2(1.0,1.6);
 float lt=uLavaT;
 vec2 lq=lp*0.9+vec2(lt*0.045,lt*0.012);
 vec2 lwarp=vec2(lavaFbm(lq+vec2(0.0,lt*0.03)),lavaFbm(lq+vec2(5.2,1.3)-lt*0.025));
 float ln=lavaFbm(lq+1.7*lwarp);
 float lr=1.0-abs(lavaFbm(lq*2.1+2.2*lwarp+3.1)*2.0-1.0);
 float lcrack=pow(lr,22.0);
 float lpool=smoothstep(0.6,0.74,ln);
 float lheat=clamp(max(lpool,lcrack*1.1),0.0,1.0);
 lheat*=0.85+0.15*sin(lt*1.7+ln*14.0);
 float lgrain=lavaFbm(lp*7.0);
 vec3 lcrust=mix(vec3(0.012,0.01,0.01),vec3(0.06,0.04,0.032),lgrain)*(0.8+0.4*ln);
 diffuseColor=vec4(mix(lcrust,vec3(0.95,0.32,0.04),lheat),opacity);`).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
 roughnessFactor=mix(0.92,0.35,lheat);`).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
 {// Bump: crust plates stand above the melt, with a fine rocky grain.
  float lh=(1.0-lheat)*0.7+lgrain*0.25;vec3 dpx=dFdx(-vViewPosition),dpy=dFdy(-vViewPosition);float dhx=dFdx(lh),dhy=dFdy(lh);
  vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);float det=dot(dpx,r1);vec3 g=sign(det)*(dhx*r1+dhy*r2);normal=normalize(abs(det)*normal-0.06*g);}`).replace('#include <emissivemap_fragment>',`
 // Black-body ramp: dull red under the crust, orange in the cracks, yellow-white at the hottest.
 vec3 lglow=vec3(0.07,0.008,0.0)*(0.3+ln)*(1.0-lheat);
 lglow+=mix(vec3(0.9,0.09,0.0),vec3(2.2,0.6,0.05),smoothstep(0.3,0.85,lheat))*smoothstep(0.1,0.55,lheat);
 lglow+=vec3(2.2,1.4,0.4)*smoothstep(0.8,1.0,lheat);
 totalEmissiveRadiance=lglow;`);
};
lava.customProgramCacheKey=()=>'lava-v2';
/** Liquids are shared materials so the renderer can animate them once per frame. */
export const LIQUIDS={water,lava};
const ROPE=std(0x7a5a32,0.9);  // hemp brown: reads against both snow and night skies
export function procDeco(name:string,theme:string):Part[]|undefined{
 const liquid=theme==='castle'?lava:water;
 if(name==='liquid'){const g=new THREE.BoxGeometry(1,1,1.6);return [{geometry:g,material:liquid,matrix:I()}];}
 if(name==='liquid_top'){const g=new THREE.BoxGeometry(1,0.7,1.6,liquid===lava?12:8,1,liquid===lava?16:4);g.translate(0,-0.15,0);  // lava: dense top so the shader's swell is smooth
  return [{geometry:g,material:liquid,matrix:I()}];}
 if(name==='rope_v'){const g=new THREE.CylinderGeometry(0.045,0.045,1,8);return [{geometry:g,material:ROPE,matrix:I()}];}
 if(name==='rope_h'){const g=new THREE.CylinderGeometry(0.045,0.045,1,8);g.rotateZ(Math.PI/2);return [{geometry:g,material:ROPE,matrix:I()}];}
 if(name==='pulley'){const g=new THREE.TorusGeometry(0.28,0.07,10,24);return [{geometry:g,material:std(0x8a8f98,0.3,0.9),matrix:I()}];}
 if(name==='chain'){const g=new THREE.TorusGeometry(0.12,0.035,8,16),material=std(0x9aa0a8,0.3,0.9);g.scale(1,1.6,1);return Array.from({length:5},(_,i)=>({geometry:g,material,matrix:new THREE.Matrix4().makeRotationZ(-Math.PI/4).setPosition((i-2)*0.1875,(i-2)*0.1875,0)}));}
 if(name==='deco_coral'){const g=new THREE.ConeGeometry(0.16,1,8);g.translate(0,0,0);const m=std(0x3ac06a,0.8);
  return [-0.25,0,0.25].map((x,i)=>({geometry:g,material:m,matrix:new THREE.Matrix4().makeRotationZ((i-1)*0.35).setPosition(x,0,0)}));}
 return undefined;
}
/** Bullet Bill blaster pedestal under a barrel (metatile 101 skull piece, 102 plain lower piece, a hard block directly under a barrel): a full tile tall,
 * so stacked pieces and the barrel above form one continuous column as in 2D. `skull`: the bone skull medallion on its front face. Materials come from
 * the barrel model (iron / brass / bone) so the column reads as one casting. */
export function cannonPedestal(barrel:Part[]|undefined,skull:boolean):Part[]{
 const byName=(re:RegExp)=>barrel?.find(p=>re.test(p.material.name))?.material;
 const iron=byName(/Iron/)??std(0x15161a,0.45,0.6),brass=byName(/Brass/)??std(0xc8962a,0.3,1),bone=byName(/Skull/)??std(0xf2e6cc,0.5);
 const at=(x:number,y:number,z:number)=>new THREE.Matrix4().makeTranslation(x,y,z);
 // Iron body, with a brass collar where it meets the piece above (a plain lower piece also gets a foot band).
 const parts:Part[]=[{geometry:box(0.84,1,0.84,0.03),material:iron,matrix:I()},{geometry:box(0.9,0.07,0.9,0.02),material:brass,matrix:at(0,0.465,0)}];
 if(!skull){parts.push({geometry:box(0.9,0.07,0.9,0.02),material:brass,matrix:at(0,-0.465,0)});return parts;}
 const disc=new THREE.CylinderGeometry(0.27,0.29,0.05,40);disc.rotateX(Math.PI/2);
 const cranium=new THREE.SphereGeometry(0.15,32,20);cranium.scale(1,0.92,0.45);
 const eye=new THREE.SphereGeometry(0.045,16,10);eye.scale(1,1.15,0.6);
 const nose=new THREE.ConeGeometry(0.022,0.045,3);nose.rotateZ(Math.PI);
 parts.push({geometry:disc,material:brass,matrix:at(0,-0.04,0.43)},{geometry:cranium,material:bone,matrix:at(0,0,0.46)},{geometry:box(0.15,0.09,0.06,0.02),material:bone,matrix:at(0,-0.14,0.46)},
  {geometry:eye,material:iron,matrix:at(-0.06,0,0.52)},{geometry:eye,material:iron,matrix:at(0.06,0,0.52)},{geometry:nose,material:iron,matrix:at(0,-0.07,0.525)});
 return parts;
}
