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
const std=(color:number,rough=0.5,metal=0,extra:Partial<THREE.MeshStandardMaterialParameters>={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
type Maker=()=>THREE.Object3D;
export class Props{
 constructor(private kit:Kit){}
 private draw={offset:255,background:false};
 readonly group=new THREE.Group();private pools=new Map<string,THREE.Object3D[]>();private used=new Map<string,number>();
 private take(key:string,make:Maker){let l=this.pools.get(key);if(!l)this.pools.set(key,l=[]);const i=this.used.get(key)??0;this.used.set(key,i+1);
  let o=l[i];if(!o){o=make();o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});this.group.add(o);l.push(o);}o.userData.nativeSprite={...this.draw};o.visible=true;return o;}
 private mats={lift:std(0xd8642a,0.4,0.6),liftEdge:std(0x8a3a18,0.4,0.7),cloud:std(0xffffff,0.95,0,{emissive:0x9ab4d8,emissiveIntensity:0.15}),
  bubble:std(0x9cdcff,0.05,0,{transparent:true,opacity:0.65,depthWrite:false}),fire:std(0xffa020,0.4,0,{emissive:0xff5a00,emissiveIntensity:2.2}),spring:std(0xd02a2a,0.3,0.7),springCap:std(0xe8e8f0,0.3,0.8),vine:std(0x2fa040,0.7),leaf:std(0x5ad04a,0.7),
  flag:std(0xf2f2ee,0.8,0,{side:THREE.DoubleSide}),star:std(0xff4a3a,0.5),spark:std(0xffffff,0.3,0,{emissive:0xffd070,emissiveIntensity:3}),toad:std(0xf0f0f0,0.6),toadSpot:std(0xd82a2a,0.6)};
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
  for(const bar of s.area.firebars??[])for(const [part,{x,y}] of s.firebarCenters(bar).entries()){this.draw={offset:(s.spriteShuffle.offsets[(s.spriteObjectSlot(bar)??0)+1]+4*part)&255,background:false};const o=this.take('fire',()=>new THREE.Mesh(new THREE.SphereGeometry(0.24,16,12),this.mats.fire));o.position.set(x/16,(240-y-(bar.visualOffsetY??0))/16,0.1);o.scale.setScalar(1);o.rotation.z=nativeFireballPhase(s.random.frame)*Math.PI/2;}
  for(const sp of s.area.springs??[]){this.draw={offset:s.spriteShuffle.offsets[(s.spriteObjectSlot(sp)??0)+1],background:false};const c=s.springCompression(sp),h=(24-c*8)/16,o=this.take('spring',()=>{const g=new THREE.Group();
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.06,8,24),this.mats.spring);for(let i=0;i<4;i++){const k=coil.clone();k.rotation.x=Math.PI/2;k.position.y=0.2+i*0.3;k.name='coil';g.add(k);}
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.12,24),this.mats.springCap);top.name='top';top.position.y=1.44;g.add(top);const bot=top.clone();bot.position.y=0.06;g.add(bot);return g;});
   o.position.set((sp.x+8)/16,(239-sp.y)/16,0);o.scale.y=h/1.5;}
  for(const v of s.vines)if(v.height>0){this.draw={offset:s.spriteShuffle.offsets[(s.specialSlot5.vineSlots[0]??5)+1],background:true};const h=v.height/16,o=this.take('vine',()=>{const g=new THREE.Group();const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,8),this.mats.vine);st.position.y=0.5;g.add(st);
    for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),this.mats.leaf);l.scale.set(1.4,0.5,0.8);l.position.set(i%2?0.14:-0.14,(i+0.5)/6,0);g.add(l);}return g;});
   o.position.set((v.x+4)/16,(240-v.baseY)/16,0);o.scale.set(1,h,1);}
  const flag=s.castleFlag;if(flag){this.draw={offset:s.spriteShuffle.offsets[(s.nativeCastleFlag?.slot??5)+1],background:true};const o=this.take('castleFlag',()=>{const g=new THREE.Group();const c=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.7),this.mats.flag);g.add(c);const st=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,8),this.mats.star);st.position.z=0.02;g.add(st);return g;});o.position.set((flag.x+8)/16,(232-flag.y)/16,-0.4);o.rotation.y=Math.sin(s.frame*0.1)*0.2;}
  for(const fw of s.flagFireworks){this.draw={offset:s.spriteShuffle.offsets[(s.nativeFireworks.find(f=>f.index===fw.index)?.slot??0)+1],background:false};const o=this.take('spark',()=>new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,2),this.mats.spark));o.position.set((fw.x+8)/16,(232-fw.y)/16,0.5);o.scale.setScalar(0.4+0.4*(fw.phase??0));}
  }
  const picture=s.castleRetainer;if(picture?.graphicsVisible&&!this.kit.has(s.level.id==='8-4'?'princess':'toad')){this.draw={offset:s.spriteShuffle.offsets[picture.slot+1],background:false};
   const o=this.take('retainer',()=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.4,6,12),this.mats.toad);b.position.y=0.5;g.add(b);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,14,0,Math.PI*2,0,Math.PI/2),this.mats.toad);cap.position.y=1.05;g.add(cap);
    for(const a of [-0.9,0,0.9]){const sp=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,8),this.mats.toadSpot);sp.position.set(Math.sin(a)*0.42,1.25,Math.cos(a)*0.42);sp.scale.set(1,0.6,1);g.add(sp);}return g;});
   o.position.set((picture.x+8)/16,(215-picture.y)/16,0);o.rotation.y=-0.5;}
 }
}
