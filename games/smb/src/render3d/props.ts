// Moving level objects that are not tiles: lifts, firebars, springs, vines, castle flag, fireworks, the castle retainer. All positions from the simulation.
import {nativeFireballPhase} from '../native-fireball-picture.js';
import * as THREE from 'three';
import type {Kit} from './kit.js';
import type {Simulation} from '../simulation.js';
import {platformMotionModel,nativePlatformArtworkYs} from '../platform-motion.js';
import {nativeBubbleShown} from '../view-rules.js';
import {nativeBlockSprites} from '../native-block-picture.js';
import {procBlock} from './proc.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
/** Firebar fireball: a white-hot core in a rippling body that shades yellow -> orange -> red toward its edge, with a soft additive glow (HDR colours,
 * so the bloom pass gives the halo). The body is symmetric around the ball's centre, so its placement matches the 2D sprite. */
const FIRE_TIME={value:0};
const fireBody=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true});
fireBody.onBeforeCompile=sh=>{sh.uniforms.uTime=FIRE_TIME;
 sh.vertexShader='uniform float uTime;\nvarying float vRim;\n'+sh.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
 transformed+=normal*(0.03*sin(position.x*20.0+uTime)+0.03*sin(position.y*24.0-uTime*1.3)+0.025*sin(position.z*28.0+uTime*1.7));`).replace('#include <project_vertex>',`#include <project_vertex>
 vRim=1.0-abs(dot(normalize(normalMatrix*normal),normalize(-mvPosition.xyz)));`);
 sh.fragmentShader='varying float vRim;\n'+sh.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 vec3 fire=mix(vec3(1.6,1.05,0.3),vec3(1.35,0.38,0.04),smoothstep(0.0,0.5,vRim));fire=mix(fire,vec3(0.5,0.06,0.0),smoothstep(0.5,1.0,vRim));
 diffuseColor=vec4(fire,diffuseColor.a*(1.0-smoothstep(0.5,1.0,vRim)*0.85));`);};
fireBody.customProgramCacheKey=()=>'firebar-body';
const fireCore=new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(1.8,1.4,0.6,THREE.LinearSRGBColorSpace)});
let fireGlow:THREE.SpriteMaterial|undefined;
function fireballGroup(){
 if(!fireGlow){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!,r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(0.35,'rgba(255,255,255,0.45)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  fireGlow=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),color:0xff6a1a,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,opacity:0.35});}
 const group=new THREE.Group(),glow=new THREE.Sprite(fireGlow);glow.scale.set(0.85,0.85,1);
 group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.21,4),fireBody),new THREE.Mesh(new THREE.SphereGeometry(0.09,16,12),fireCore),glow);return group;
}
/** Castle flag: a cloth pennant on a small pole, printed with the Nous Girl emblem (assets3d/flag, MIT, Nous Research). The cloth waves in the vertex
 * shader from the simulation frame, so its geometry (and the bounding box the placement check measures) stays the flat 0.9 x 0.62 sheet. */
const FLAG_TIME={value:0},FLAG_W=0.9,FLAG_H=0.62;
let flagCloth:THREE.MeshPhysicalMaterial|undefined;
function castleFlagGroup(){
 if(!flagCloth){
  const c=document.createElement('canvas');c.width=512;c.height=352;const g=c.getContext('2d')!;
  const paint=(emblem?:HTMLImageElement)=>{g.fillStyle='#f4f1e8';g.fillRect(0,0,512,352);g.fillStyle='#c8202a';g.fillRect(0,0,512,14);g.fillRect(0,338,512,14);
   if(emblem)g.drawImage(emblem,(512-300)/2+18,26,300,300);};
  paint();const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  const img=new Image();img.onload=()=>{paint(img);map.needsUpdate=true;};img.src=import.meta.env.BASE_URL+'assets3d/flag/nous-girl.png';
  flagCloth=new THREE.MeshPhysicalMaterial({map,roughness:0.85,sheen:1,sheenRoughness:0.6,sheenColor:new THREE.Color(0xffffff),side:THREE.DoubleSide});
  // Travelling waves whose height grows away from the pole (uv.x = 0), plus a cross ripple; the normal is the analytic surface normal.
  const wave=`uniform float uFlagTime;
vec3 flagWave(vec2 q){float a=q.x;float z=(0.03+0.1*a)*a*sin(q.x*7.0-uFlagTime)+0.035*a*sin(q.y*5.0+q.x*4.0-uFlagTime*1.37);return vec3(-0.05*a*a*(1.0-cos(q.x*7.0-uFlagTime)),-0.06*a*a+0.02*a*sin(q.x*5.0-uFlagTime*0.8),z);}
`;
  flagCloth.onBeforeCompile=sh=>{sh.uniforms.uFlagTime=FLAG_TIME;
   sh.vertexShader=wave+sh.vertexShader.replace('#include <beginnormal_vertex>',`vec3 fP=flagWave(uv),fU=vec3(${FLAG_W},0.0,0.0)+(flagWave(uv+vec2(0.01,0.0))-fP)*100.0,fV=vec3(0.0,${FLAG_H},0.0)+(flagWave(uv+vec2(0.0,0.01))-fP)*100.0;
 vec3 objectNormal=normalize(cross(fU,fV));
#ifdef USE_TANGENT
 vec3 objectTangent=normalize(fU);
#endif`).replace('#include <begin_vertex>','#include <begin_vertex>\n transformed+=fP;');};
  flagCloth.customProgramCacheKey=()=>'castle-flag-cloth';
 }
 const group=new THREE.Group(),metal=std(0xd4d6da,0.3,0.9),gold=std(0xe8b830,0.25,1);
 const cloth=new THREE.Mesh(new THREE.PlaneGeometry(FLAG_W,FLAG_H,28,14).translate(FLAG_W/2,0,0),flagCloth);cloth.position.set(-0.43,0.05,0);
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.025,0.03,0.78,10),metal);pole.position.set(-0.455,-0.01,0);
 const knob=new THREE.Mesh(new THREE.SphereGeometry(0.05,14,10),gold);knob.position.set(-0.455,0.41,0);
 group.add(cloth,pole,knob);return group;
}
const std=(color:number,rough=0.5,metal=0,extra:Partial<THREE.MeshStandardMaterialParameters>={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
type Maker=()=>THREE.Object3D;
export class Props{
 constructor(private kit:Kit){}
 private draw={offset:255,background:false};
 readonly group=new THREE.Group();private pools=new Map<string,THREE.Object3D[]>();private used=new Map<string,number>();
 private take(key:string,make:Maker){let l=this.pools.get(key);if(!l)this.pools.set(key,l=[]);const i=this.used.get(key)??0;this.used.set(key,i+1);
  let o=l[i];if(!o){o=make();o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});this.group.add(o);l.push(o);}o.userData.nativeSprite={...this.draw};o.visible=true;return o;}
 private mats={lift:std(0xd8642a,0.4,0.6),liftEdge:std(0x8a3a18,0.4,0.7),cloud:std(0xffffff,0.95,0,{emissive:0x9ab4d8,emissiveIntensity:0.15}),
  bubble:std(0x9cdcff,0.05,0,{transparent:true,opacity:0.65,depthWrite:false}),spring:std(0xd02a2a,0.3,0.7),springCap:std(0xe8e8f0,0.3,0.8),vine:std(0x2fa040,0.7),leaf:std(0x5ad04a,0.7),
  spark:std(0xffffff,0.3,0,{emissive:0xffd070,emissiveIntensity:3}),toad:std(0xf0f0f0,0.6),toadSpot:std(0xd82a2a,0.6)};
 /** Hide the castle retainer stand-in while the rest of the last castle picture is held. */
 hideRetainer(){for(const o of this.pools.get('retainer')??[])o.visible=false;}
 sync(s:Simulation){
  for(const l of this.pools.values())for(const o of l)o.visible=false;this.used.clear();
  if(s.spritePictureOwner!=='empty'&&s.spritePictureOwner!=='victory'){
  // DrawBlock writes four independent OAM pieces. Clipped GLB quarters preserve its byte wrapping and column hiding.
  for(const b of s.blockGraphics??[])for(const p of nativeBlockSprites(b,!['water','underground','castle'].includes(s.area.theme),s.camera)){
   const col=((p.x-((Math.floor(b.x)-Math.floor(s.camera))&255))&255)/8,row=(((p.y-1)-(b.pictureY!&255))&255)/8,used=b.metatile===196,base=used?'block_used':'block_brick';
   this.draw={offset:(s.spriteShuffle.offsets[8+b.slot]+4*(row*2+col))&255,background:false};
   const suffix=s.area.theme==='underground'?'_ug':['water','castle','snow'].includes(s.area.theme)?'_'+s.area.theme:'',model=this.kit.has(base+suffix)?base+suffix:base;
   const o=this.take((used?'blockUsed':'blockBrick')+'@'+model+'#'+b.slot+'.'+row+'.'+col,()=>{const g=new THREE.Group(),planes=[new THREE.Plane(new THREE.Vector3(1,0,0)),new THREE.Plane(new THREE.Vector3(-1,0,0)),new THREE.Plane(new THREE.Vector3(0,1,0)),new THREE.Plane(new THREE.Vector3(0,-1,0))];g.userData.clipPlanes=planes;
    for(const part of this.kit.parts(model)??procBlock(used?'used':'brick')!){const material=part.material.clone();material.clippingPlanes=planes;material.clipShadows=true;material.polygonOffset=true;material.polygonOffsetFactor=material.polygonOffsetUnits=-1;const mesh=new THREE.Mesh(part.geometry,material);mesh.matrix.copy(part.matrix);mesh.matrixAutoUpdate=false;g.add(mesh);}return g;});
   const x=Math.floor(s.camera)+p.x,planes=o.userData.clipPlanes as THREE.Plane[];o.position.set((x-col*8+8)/16,(232-p.y+row*8)/16,0);
   planes[0].constant=-x/16;planes[1].constant=(x+8)/16;planes[2].constant=-(232-p.y)/16;planes[3].constant=(240-p.y)/16;
  }
  if(s.area.theme==='water')for(const [slot,b] of (s.bubbles??[]).entries())if(nativeBubbleShown(b,s.player.y,s.camera)){this.draw={offset:s.spriteShuffle.offsets[10+slot],background:false};const o=this.take('bubble',()=>new THREE.Mesh(new THREE.SphereGeometry(0.125,12,8),this.mats.bubble));
   const x=Math.floor(s.camera)+((Math.floor(b.x)-Math.floor(s.camera))&255);o.position.set((x+4)/16,(235-b.y)/16,-0.15);o.castShadow=o.receiveShadow=false;}
  for(const pl of s.area.platforms??[]){const pos=s.platformPicturePosition(pl),context={levelId:s.level.id,areaId:s.area.id},ys=nativePlatformArtworkYs(pl,context,pos.y);
   for(const y of ys){this.draw={offset:(s.spriteShuffle.offsets[(s.spriteObjectSlot(pl)??0)+1]+(y===pos.y?0:12))&255,background:false};const width=s.platformWidth(pl),w=width/16,cx=(pos.x+width/2)/16,cy=(236-y)/16;
   if(platformMotionModel(pl,{levelId:s.level.id,areaId:s.area.id})==='contact-cloud'){
    const o=this.take('cloud'+w,()=>{const g=new THREE.Group();for(let i=0;i<Math.round(w*1.6);i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.42,20,14),this.mats.cloud);m.position.set((i/(Math.round(w*1.6)-1)-0.5)*(w-0.7),0,0);g.add(m);}return g;});o.position.set(cx,cy,0);
   }else{const o=this.take('lift'+w,()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new RoundedBoxGeometry(w,0.42,1,3,0.08),this.mats.lift));
     for(let x=-w/2+0.25;x<w/2;x+=0.5){const r=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.05,12),this.mats.liftEdge);r.rotation.x=Math.PI/2;r.position.set(x,0,0.51);g.add(r);}return g;});o.position.set(cx,cy,0);}
   }
  }
  for(const bar of s.area.firebars??[])for(const [part,{x,y}] of s.firebarCenters(bar).entries()){this.draw={offset:(s.spriteShuffle.offsets[(s.spriteObjectSlot(bar)??0)+1]+4*part)&255,background:false};const o=this.take('fire',()=>fireballGroup());o.position.set(x/16,(240-y-(bar.visualOffsetY??0))/16,0.1);o.scale.setScalar(1);o.rotation.set(part*1.3,part*0.7,nativeFireballPhase(s.random.frame)*Math.PI/2);}
  FIRE_TIME.value=s.frame*0.35;
  for(const sp of s.area.springs??[]){this.draw={offset:s.spriteShuffle.offsets[(s.spriteObjectSlot(sp)??0)+1],background:false};const c=s.springCompression(sp),h=(24-c*8)/16,o=this.take('spring',()=>{const g=new THREE.Group();
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.06,8,24),this.mats.spring);for(let i=0;i<4;i++){const k=coil.clone();k.rotation.x=Math.PI/2;k.position.y=0.2+i*0.3;k.name='coil';g.add(k);}
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.12,24),this.mats.springCap);top.name='top';top.position.y=1.44;g.add(top);const bot=top.clone();bot.position.y=0.06;g.add(bot);return g;});
   o.position.set((sp.x+8)/16,(239-sp.y)/16,0);o.scale.y=h/1.5;}
  for(const v of s.vines)if(v.height>0){this.draw={offset:s.spriteShuffle.offsets[(s.specialSlot5.vineSlots[0]??5)+1],background:true};const h=v.height/16,o=this.take('vine',()=>{const g=new THREE.Group();const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,8),this.mats.vine);st.position.y=0.5;g.add(st);
    for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),this.mats.leaf);l.scale.set(1.4,0.5,0.8);l.position.set(i%2?0.14:-0.14,(i+0.5)/6,0);g.add(l);}return g;});
   o.position.set((v.x+4)/16,(240-v.baseY)/16,0);o.scale.set(1,h,1);}
  const flag=s.castleFlag;if(flag){this.draw={offset:s.spriteShuffle.offsets[(s.nativeCastleFlag?.slot??5)+1],background:true};const o=this.take('castleFlag',castleFlagGroup);o.position.set((flag.x+8)/16,(232-flag.y)/16,-0.4);FLAG_TIME.value=s.frame*0.16;}
  for(const fw of s.flagFireworks){this.draw={offset:s.spriteShuffle.offsets[(s.nativeFireworks.find(f=>f.index===fw.index)?.slot??0)+1],background:false};const o=this.take('spark',()=>new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,2),this.mats.spark));o.position.set((fw.x+8)/16,(232-fw.y)/16,0.5);o.scale.setScalar(0.4+0.4*(fw.phase??0));}
  }
  const picture=s.castleRetainer;if(picture?.graphicsVisible&&!this.kit.has(s.level.id==='8-4'?'princess':'toad')){this.draw={offset:s.spriteShuffle.offsets[picture.slot+1],background:false};
   const o=this.take('retainer',()=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.4,6,12),this.mats.toad);b.position.y=0.5;g.add(b);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,14,0,Math.PI*2,0,Math.PI/2),this.mats.toad);cap.position.y=1.05;g.add(cap);
    for(const a of [-0.9,0,0.9]){const sp=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,8),this.mats.toadSpot);sp.position.set(Math.sin(a)*0.42,1.25,Math.cos(a)*0.42);sp.scale.set(1,0.6,1);g.add(sp);}return g;});
   o.position.set((picture.x+8)/16,(215-picture.y)/16,0);o.rotation.y=-0.5;}
 }
}
