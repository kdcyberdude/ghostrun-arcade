// Moving level objects that are not tiles: lifts, firebars, springs, vines, castle flag, fireworks, the castle retainer. All positions from the simulation.
import * as THREE from 'three';
import type {Simulation} from '../simulation.js';
import {platformMotionModel} from '../platform-motion.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
const std=(color:number,rough=0.5,metal=0,extra:Partial<THREE.MeshStandardMaterialParameters>={})=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal,...extra});
type Maker=()=>THREE.Object3D;
export class Props{
 readonly group=new THREE.Group();private pools=new Map<string,THREE.Object3D[]>();private used=new Map<string,number>();
 private take(key:string,make:Maker){let l=this.pools.get(key);if(!l)this.pools.set(key,l=[]);const i=this.used.get(key)??0;this.used.set(key,i+1);
  let o=l[i];if(!o){o=make();o.traverse(c=>{const m=c as THREE.Mesh;if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});this.group.add(o);l.push(o);}o.visible=true;return o;}
 private mats={lift:std(0xd8642a,0.4,0.6),liftEdge:std(0x8a3a18,0.4,0.7),cloud:std(0xffffff,0.95,0,{emissive:0x9ab4d8,emissiveIntensity:0.15}),
  fire:std(0xffa020,0.4,0,{emissive:0xff5a00,emissiveIntensity:2.2}),spring:std(0xd02a2a,0.3,0.7),springCap:std(0xe8e8f0,0.3,0.8),vine:std(0x2fa040,0.7),leaf:std(0x5ad04a,0.7),
  flag:std(0xf2f2ee,0.8,0,{side:THREE.DoubleSide}),star:std(0xff4a3a,0.5),spark:std(0xffffff,0.3,0,{emissive:0xffd070,emissiveIntensity:3}),toad:std(0xf0f0f0,0.6),toadSpot:std(0xd82a2a,0.6)};
 sync(s:Simulation){
  for(const l of this.pools.values())for(const o of l)o.visible=false;this.used.clear();
  for(const pl of s.area.platforms??[]){const pos=s.platformPosition(pl),w=pl.width/16,cx=(pos.x+pl.width/2)/16,cy=(236-pos.y)/16;
   if(platformMotionModel(pl,{levelId:s.level.id,areaId:s.area.id})==='contact-cloud'){
    const o=this.take('cloud'+w,()=>{const g=new THREE.Group();for(let i=0;i<Math.round(w*1.6);i++){const m=new THREE.Mesh(new THREE.SphereGeometry(0.42,20,14),this.mats.cloud);m.position.set((i/(Math.round(w*1.6)-1)-0.5)*(w-0.7),0,0);g.add(m);}return g;});o.position.set(cx,cy,0);
   }else{const o=this.take('lift'+w,()=>{const g=new THREE.Group();g.add(new THREE.Mesh(new RoundedBoxGeometry(w,0.42,1,3,0.08),this.mats.lift));
     for(let x=-w/2+0.25;x<w/2;x+=0.5){const r=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,0.05,12),this.mats.liftEdge);r.rotation.x=Math.PI/2;r.position.set(x,0,0.51);g.add(r);}return g;});o.position.set(cx,cy,0);}
  }
  for(const bar of s.area.firebars??[])for(const {x,y} of s.firebarCenters(bar)){const o=this.take('fire',()=>new THREE.Mesh(new THREE.SphereGeometry(0.24,16,12),this.mats.fire));o.position.set(x/16,(240-y-(bar.visualOffsetY??0))/16,0.1);o.scale.setScalar(0.9+0.15*Math.sin(s.frame*0.4+x));}
  for(const sp of s.area.springs??[]){const c=s.springCompression(sp),h=(24-c*8)/16,o=this.take('spring',()=>{const g=new THREE.Group();
    const coil=new THREE.Mesh(new THREE.TorusGeometry(0.34,0.06,8,24),this.mats.spring);for(let i=0;i<4;i++){const k=coil.clone();k.rotation.x=Math.PI/2;k.position.y=0.2+i*0.3;k.name='coil';g.add(k);}
    const top=new THREE.Mesh(new THREE.CylinderGeometry(0.46,0.46,0.12,24),this.mats.springCap);top.name='top';g.add(top);const bot=top.clone();bot.position.y=0.06;g.add(bot);return g;});
   o.position.set((sp.x+8)/16,(239-sp.y)/16,0);o.scale.y=h/1.5;}
  for(const v of s.vines)if(v.height>0){const h=v.height/16,o=this.take('vine',()=>{const g=new THREE.Group();const st=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,1,8),this.mats.vine);st.position.y=0.5;g.add(st);
    for(let i=0;i<6;i++){const l=new THREE.Mesh(new THREE.SphereGeometry(0.16,10,8),this.mats.leaf);l.scale.set(1.4,0.5,0.8);l.position.set(i%2?0.14:-0.14,(i+0.5)/6,0);g.add(l);}return g;});
   o.position.set((v.x+4)/16,(240-v.baseY)/16,0);o.scale.set(1,h,1);}
  const flag=s.castleFlag;if(flag){const o=this.take('castleFlag',()=>{const g=new THREE.Group();const c=new THREE.Mesh(new THREE.PlaneGeometry(0.9,0.7),this.mats.flag);g.add(c);const st=new THREE.Mesh(new THREE.SphereGeometry(0.15,12,8),this.mats.star);st.position.z=0.02;g.add(st);return g;});o.position.set((flag.x+8)/16,(232-flag.y)/16,-0.4);o.rotation.y=Math.sin(s.frame*0.1)*0.2;}
  for(const fw of s.flagFireworks){const o=this.take('spark',()=>new THREE.Mesh(new THREE.IcosahedronGeometry(0.5,2),this.mats.spark));o.position.set((fw.x+8)/16,(232-fw.y)/16,0.5);o.scale.setScalar(0.4+0.4*(fw.phase??0));}
  const exit=s.area.exit;if(exit?.kind==='axe'&&exit.retainerX!==undefined&&!['intro','gameover','title'].includes(s.phase)){
   const o=this.take('retainer',()=>{const g=new THREE.Group();const b=new THREE.Mesh(new THREE.CapsuleGeometry(0.28,0.4,6,12),this.mats.toad);b.position.y=0.5;g.add(b);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.5,20,14,0,Math.PI*2,0,Math.PI/2),this.mats.toad);cap.position.y=1.05;g.add(cap);
    for(const a of [-0.9,0,0.9]){const sp=new THREE.Mesh(new THREE.SphereGeometry(0.16,12,8),this.mats.toadSpot);sp.position.set(Math.sin(a)*0.42,1.25,Math.cos(a)*0.42);sp.scale.set(1,0.6,1);g.add(sp);}return g;});
   o.position.set((exit.retainerX+8)/16,(240-209)/16,0);o.rotation.y=-0.5;}
 }
}
