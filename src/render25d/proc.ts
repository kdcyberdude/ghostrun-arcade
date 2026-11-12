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
/** Tileable molten-rock texture: dark crust broken by glowing orange-yellow veins (periodic value noise, deterministic). */
function lavaTexture(){
 const N=128,c=document.createElement('canvas');c.width=c.height=N;const ctx=c.getContext('2d')!,img=ctx.createImageData(N,N);
 const hash=(x:number,y:number,o:number)=>{const h=Math.sin(x*127.1+y*311.7+o*74.7)*43758.5453;return h-Math.floor(h);};
 const noise=(x:number,y:number,p:number,o:number)=>{const xi=Math.floor(x),yi=Math.floor(y),fx=x-xi,fy=y-yi,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy);
  const v=(a:number,b:number)=>hash(((xi+a)%p+p)%p,((yi+b)%p+p)%p,o);
  return (v(0,0)*(1-sx)+v(1,0)*sx)*(1-sy)+(v(0,1)*(1-sx)+v(1,1)*sx)*sy;};
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  let n=0,amp=0.5;for(let k=0,p=4;k<4;k++,p*=2,amp/=2)n+=amp*noise(x/N*p,y/N*p,p,k);
  const vein=Math.pow(1-Math.min(1,Math.abs(n-0.5)*5),3);           // bright where the fbm crosses its midline
  const heat=Math.min(1,0.18+vein*0.95),i=(y*N+x)*4;
  img.data[i]=Math.round(60+195*heat);img.data[i+1]=Math.round(8+180*Math.pow(heat,2.2));img.data[i+2]=Math.round(2+50*Math.pow(heat,5));img.data[i+3]=255;}
 ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;return t;
}
const lavaMap=typeof document==='undefined'?null:lavaTexture();
const lava=new THREE.MeshStandardMaterial({color:0xffffff,map:lavaMap,emissive:0xffffff,emissiveMap:lavaMap,emissiveIntensity:0.9,roughness:0.85});
/** Liquids are shared materials so the renderer can animate them once per frame. */
export const LIQUIDS={water,lava};
const ROPE=std(0x7a5a32,0.9);  // hemp brown: reads against both snow and night skies
export function procDeco(name:string,theme:string):Part[]|undefined{
 const liquid=theme==='castle'?lava:water;
 if(name==='liquid'){const g=new THREE.BoxGeometry(1,1,1.6);return [{geometry:g,material:liquid,matrix:I()}];}
 if(name==='liquid_top'){const g=new THREE.BoxGeometry(1,0.7,1.6,8,1,4);g.translate(0,-0.15,0);
  if(liquid===lava){const pos=g.attributes.position;for(let i=0;i<pos.count;i++)if(pos.getY(i)>0.19)pos.setY(i,0.2+0.05*Math.sin((pos.getX(i)+0.5)*Math.PI*2)*Math.cos(pos.getZ(i)*2.2));g.computeVertexNormals();}  // tile-periodic ripple, seamless across neighbours
  return [{geometry:g,material:liquid,matrix:I()}];}
 if(name==='rope_v'){const g=new THREE.CylinderGeometry(0.045,0.045,1,8);return [{geometry:g,material:ROPE,matrix:I()}];}
 if(name==='rope_h'){const g=new THREE.CylinderGeometry(0.045,0.045,1,8);g.rotateZ(Math.PI/2);return [{geometry:g,material:ROPE,matrix:I()}];}
 if(name==='pulley'){const g=new THREE.TorusGeometry(0.28,0.07,10,24);return [{geometry:g,material:std(0x8a8f98,0.3,0.9),matrix:I()}];}
 if(name==='chain'){const g=new THREE.TorusGeometry(0.12,0.035,8,16);g.scale(1,1.6,1);g.rotateZ(Math.PI/4);return [{geometry:g,material:std(0x9aa0a8,0.3,0.9),matrix:I()}];}
 if(name==='deco_coral'){const g=new THREE.ConeGeometry(0.16,1,8);g.translate(0,0,0);const m=std(0x3ac06a,0.8);
  return [-0.25,0,0.25].map((x,i)=>({geometry:g,material:m,matrix:new THREE.Matrix4().makeRotationZ((i-1)*0.35).setPosition(x,0,0)}));}
 return undefined;
}
