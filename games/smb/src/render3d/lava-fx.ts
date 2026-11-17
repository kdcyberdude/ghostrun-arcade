// Lava effects of castle areas, render-only (the simulation is only read): the molten pools cast a soft, flickering orange glow on the walls and floor
// around them, and whatever falls in (Mario, Bowser) throws up a splash of molten blobs, a shower of embers and a little smoke where it enters.
// Every particle is a pure function of (splash, frames since it), so the effect is deterministic from the simulation frame.
import * as THREE from 'three';
import type {Simulation} from '../simulation.js';
/** Surface tile of a lava pool (liquid_top); its 3D surface is 0.2 above the tile centre (proc.ts), i.e. 4.8 px below the tile's top. */
const LAVA_TOP=134;
interface Splash{x:number;y:number;frame:number;size:number;seed:number}
const hash=(a:number,b:number,c:number)=>{const h=Math.sin(a*12.9898+b*78.233+c*37.719)*43758.5453;return h-Math.floor(h);};
/** Soft round puff for smoke. */
function puffTexture(){
 const N=64,c=document.createElement('canvas');c.width=c.height=N;const g=c.getContext('2d')!,r=g.createRadialGradient(N/2,N/2,0,N/2,N/2,N/2);
 r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.5,'rgba(255,255,255,0.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,N,N);
 return new THREE.CanvasTexture(c);
}
const BLOBS=96,EMBERS=128,PUFFS=24,LIFE=150;
export class LavaFx{
 readonly group=new THREE.Group();
 /** Pool glow lights plus one splash flash; always in the scene while an area has lava (toggling lights per frame would recompile every lit shader). */
 private lights=Array.from({length:3},()=>new THREE.PointLight(0xff5a18,0,7.5,1.6));
 private flash=new THREE.PointLight(0xff7a20,0,6,1.8);
 private area?:object;private hasLava=false;private splashes:Splash[]=[];private bottoms=new Map<object,number>();private last=-1;
 private blobs:THREE.InstancedMesh;private embers:THREE.InstancedMesh;private puffs:THREE.InstancedMesh;
 private m=new THREE.Matrix4();private c=new THREE.Color();private player={};
 constructor(){
  // Self-lit molten droplets and sparks: instance colours above 1 so the bloom pass makes them glow.
  const hot=new THREE.MeshBasicMaterial({color:0xffffff});
  this.blobs=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,2),hot,BLOBS);
  this.embers=new THREE.InstancedMesh(new THREE.OctahedronGeometry(1,0),hot,EMBERS);
  // Smoke: instance colour r = opacity, g = grey level.
  const smoke=new THREE.MeshBasicMaterial({map:typeof document==='undefined'?null:puffTexture(),transparent:true,depthWrite:false});
  smoke.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n#ifdef USE_COLOR\n diffuseColor.a*=vColor.r;diffuseColor.rgb=vec3(vColor.g);\n#endif');};
  smoke.customProgramCacheKey=()=>'lava-smoke';
  this.puffs=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),smoke,PUFFS);
  for(const mesh of [this.blobs,this.embers,this.puffs]){mesh.frustumCulled=false;mesh.count=0;mesh.setColorAt(0,this.c.setRGB(0,0,0));}
  this.puffs.renderOrder=2;
  this.group.add(...this.lights,this.flash,this.blobs,this.embers,this.puffs);
 }
 /** Lava surface (world y) under pixel column x, or undefined. */
 private surface(s:Simulation,x:number){const col=Math.floor(x/16);for(let row=2;row<15;row++)if(s.tiles.get(`${col},${row}`)===LAVA_TOP)return 14.7-row;return undefined;}
 /** A splash where an object's feet (pixel y) cross the lava surface going down. */
 private watch(s:Simulation,key:object,x:number,feet:number,size:number){
  const before=this.bottoms.get(key);this.bottoms.set(key,feet);if(before===undefined)return;
  const top=this.surface(s,x);if(top===undefined)return;const px=(15-top)*16;
  if(before<px&&feet>=px)this.splashes.push({x:x/16,y:top,frame:s.frame,size,seed:this.splashes.length*7+s.frame%97});
 }
 sync(s:Simulation,camPx:number){
  if(this.area!==s.area){this.area=s.area;this.hasLava=s.area.theme==='castle'&&[...s.tiles.values()].includes(LAVA_TOP);for(const l of [...this.lights,this.flash])l.visible=this.hasLava;this.splashes=[];this.bottoms.clear();}
  if(s.frame<this.last){this.splashes=[];this.bottoms.clear();}this.last=s.frame;
  if(!this.hasLava){this.blobs.count=this.embers.count=this.puffs.count=0;return;}
  // Runs of surface tiles on screen, nearest the screen centre first: one glow light over the middle of each.
  const c0=Math.floor(camPx/16)-3,c1=c0+22,runs:{x:number;y:number;n:number}[]=[];
  for(let row=2;row<15;row++){let start=-1;for(let col=c0;col<=c1+1;col++){const lava=col<=c1&&s.tiles.get(`${col},${row}`)===LAVA_TOP;
   if(lava&&start<0)start=col;else if(!lava&&start>=0){runs.push({x:(start+col)/2,y:14.7-row,n:col-start});start=-1;}}}
  const cx=(camPx+128)/16;runs.sort((a,b)=>Math.abs(a.x-cx)-Math.abs(b.x-cx));
  const t=s.frame;
  this.lights.forEach((l,i)=>{const r=runs[i];if(!r){l.intensity=0;return;}
   const flicker=0.85+0.09*Math.sin(t*0.13+r.x*1.7)+0.06*Math.sin(t*0.41+r.x*0.6);
   l.position.set(r.x,r.y+0.7,0.9);l.distance=4+Math.min(r.n,8)*0.6;l.intensity=(2.2+Math.min(r.n,6)*0.55)*flicker;});
  // Who can fall in: the player and Bowser (feet at their pixel y, as entities.ts places them).
  this.watch(s,this.player,s.player.x+8,s.player.y+1,1);
  for(const e of s.enemies)if(e.kind==='bowser')this.watch(s,e,e.x+16,e.y+1,2.2);
  this.splashes=this.splashes.filter(p=>t-p.frame<LIFE);
  this.draw(t);
 }
 private draw(t:number){
  let nb=0,ne=0,np=0,flash=0;const m=this.m,c=this.c;
  for(const p of this.splashes){
   const age=t-p.frame,S=p.size,k=Math.sqrt(S);flash+=S*Math.exp(-age/9);
   if(age<6)this.flash.position.set(p.x,p.y+0.5,0.8);
   // Molten blobs thrown up and falling back (gravity in tiles per frame squared), cooling from yellow-white to deep red.
   for(let i=0;i<Math.round(16*S)&&nb<BLOBS;i++){
    const a=hash(p.seed,i,1),b=hash(p.seed,i,2),z=hash(p.seed,i,3),r0=hash(p.seed,i,4),crown=i%3===0;
    const vx=(a-0.5)*(crown?0.11:0.05)*k,vy=(crown?0.05:0.09)*k*(0.5+b),vz=(z-0.5)*0.05,g=0.006,tt=age-(crown?0:b*3);if(tt<0)continue;
    const y=p.y+vy*tt-g*tt*tt/2;if(y<p.y-0.05&&tt>2)continue;
    const cool=Math.min(1,tt/45),r=(0.03+0.05*r0)*k*(1-0.5*cool)*Math.min(1,tt/2+0.3);
    m.makeScale(r,r*(1+Math.min(0.6,Math.abs(vy-g*tt)*6)),r).setPosition(p.x+vx*tt,y,0.15+vz*tt);this.blobs.setMatrixAt(nb,m);
    this.blobs.setColorAt(nb++,c.setRGB(4.2-2.6*cool,2.0-1.8*cool,0.5-0.48*cool));}
   // Embers: small sparks drifting up on the heat, flickering out.
   for(let i=0;i<Math.round(22*S)&&ne<EMBERS;i++){
    const a=hash(p.seed,i,5),b=hash(p.seed,i,6),life=50+70*hash(p.seed,i,7),tt=age-a*14;if(tt<0||tt>life)continue;
    const f=1-tt/life,x=p.x+(b-0.5)*0.9*k+Math.sin(tt*0.07+i)*0.12*(tt/life),y=p.y+0.1+(0.015+0.03*a)*tt+0.004*tt*(1-f)*tt/10,r=0.012+0.012*b;
    m.makeScale(r,r,r).setPosition(x,y,0.2+(hash(p.seed,i,8)-0.5)*0.6);this.embers.setMatrixAt(ne,m);
    const twinkle=0.6+0.4*Math.sin(tt*0.9+i*2.3);this.embers.setColorAt(ne++,c.setRGB(3.4*f*twinkle,1.3*f*twinkle,0.2*f*twinkle));}
   // Smoke: a few dark puffs rising and spreading, fading in and out.
   for(let i=0;i<Math.round(5*S)&&np<PUFFS;i++){
    const a=hash(p.seed,i,9),b=hash(p.seed,i,10),tt=age-4-a*18,life=90;if(tt<0||tt>life)continue;
    const u=tt/life,size=(0.35+1.1*u)*k*(0.8+0.4*b),alpha=0.42*Math.min(1,tt/10)*(1-u)*(1-u);
    m.makeRotationZ(a*6.28+tt*0.01*(b-0.5)).scale(new THREE.Vector3(size,size,1)).setPosition(p.x+(b-0.5)*0.6*k+u*0.3*(a-0.5),p.y+0.3+u*2.2*k,-0.1+i*0.02);
    this.puffs.setMatrixAt(np,m);this.puffs.setColorAt(np++,c.setRGB(alpha,0.07+0.08*b,0));}
  }
  this.flash.intensity=Math.min(30,14*flash);
  this.blobs.count=nb;this.embers.count=ne;this.puffs.count=np;
  for(const mesh of [this.blobs,this.embers,this.puffs]){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
 }
}
