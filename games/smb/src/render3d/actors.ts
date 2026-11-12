// Animated model instances. Clips are sampled at times derived from simulation counters (never wall-clock), so the same simulation
// frame always renders the same pose, and nothing here can feed back into gameplay.
import * as THREE from 'three';
import type {Kit} from './kit.js';
const BLEND_FRAMES=5;
export class Actor{
 readonly root=new THREE.Group();readonly model:THREE.Object3D;private mixer:THREE.AnimationMixer;private actions=new Map<string,THREE.AnimationAction>();
 private clip='';private prev='';private prevTime=0;private changedAt=-1;private time=0;readonly materials=new Map<string,THREE.MeshStandardMaterial[]>();
 private morphMeshes:THREE.Mesh[]=[];private chibi?:Chibi;private chibiValue=0;
 constructor(model:THREE.Object3D,clips:Map<string,THREE.AnimationClip>){
  this.model=model;this.root.add(model);this.mixer=new THREE.AnimationMixer(model);
  for(const [name,clip] of clips){const a=this.mixer.clipAction(clip);a.enabled=true;a.setEffectiveWeight(0);a.play();a.paused=true;this.actions.set(name,a);}
  const skinned:THREE.SkinnedMesh[]=[];
  model.traverse(o=>{const m=o as THREE.Mesh;if(!m.isMesh)return;if(m.morphTargetDictionary)this.morphMeshes.push(m);if((m as THREE.SkinnedMesh).isSkinnedMesh&&m.morphTargetDictionary?.Chibi!==undefined)skinned.push(m as THREE.SkinnedMesh);
   for(const mat of (Array.isArray(m.material)?m.material:[m.material]) as THREE.MeshStandardMaterial[]){const list=this.materials.get(mat.name)??[];list.push(mat);this.materials.set(mat.name,list);}});
  if(skinned.length)this.chibi=new Chibi(skinned,[...clips.values()]);
 }
 has(clip:string){return this.actions.has(clip);}
 duration(clip:string){return this.actions.get(clip)?.getClip().duration??1;}
 node(name:string){return this.model.getObjectByName(name);}
 /** Show `clip` at `seconds` (wrapped when loop). `frame` is the simulation frame, used only for the short cross-fade. */
 pose(clip:string,seconds:number,frame:number,loop=true){
  const name=this.actions.has(clip)?clip:this.actions.has('idle')?'idle':[...this.actions.keys()][0];if(name===undefined)return;
  if(name!==this.clip){this.prev=this.clip;this.prevTime=this.time;this.clip=name;this.changedAt=frame;}
  const d=this.duration(name);this.time=loop?((seconds%d)+d)%d:Math.min(Math.max(seconds,0),d-1e-4);
  const w=Math.min(1,Math.max(0,(frame-this.changedAt)/BLEND_FRAMES));
  for(const [n,a] of this.actions){if(n===name){a.time=this.time;a.setEffectiveWeight(this.prev&&this.prev!==name?w:1);}else if(n===this.prev&&w<1){a.time=this.prevTime;a.setEffectiveWeight(1-w);}else a.setEffectiveWeight(0);}
  this.chibi?.unpose();this.mixer.update(0);this.chibi?.pose(this.chibiValue);
 }
 morph(name:string,value:number){if(name==='Chibi'&&this.chibi){this.chibiValue=value;this.chibi.set(value);}for(const m of this.morphMeshes){const i=m.morphTargetDictionary![name];if(i!==undefined)m.morphTargetInfluences![i]=value;}}
 recolor(material:string,color:THREE.ColorRepresentation){for(const m of this.materials.get(material)??[])m.color.set(color);}
}
/** Pool of instances of one model; `begin()` each frame, `take()` per visible entity, `end()` hides the rest. */
export class ActorPool{
 private items:Actor[]=[];private used=0;
 constructor(private kit:Kit,private name:string,private group:THREE.Group){}
 get available(){return this.kit.has(this.name);}
 begin(){this.used=0;}
 take():Actor|undefined{
  let a=this.items[this.used];
  if(!a){const inst=this.kit.instance(this.name);if(!inst)return undefined;a=new Actor(inst.root,inst.clips);this.items.push(a);this.group.add(a.root);}
  this.used++;a.root.visible=true;return a;
 }
 end(){for(let i=this.used;i<this.items.length;i++)this.items[i].root.visible=false;}
}
/** Smoothly turn toward a target yaw (render-only state). */
export function turnToward(current:number,target:number,rate=0.3){let d=target-current;while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return current+d*rate;}
/** Facing right shows the character three-quarters toward the camera; left mirrors it. */
export const yawFor=(facing:number)=>facing>=0?-0.5:Math.PI+0.5;
/** Small-Mario `Chibi` morph companion. The morph reshapes the mesh (big head, short torso and limbs) but the skeleton keeps big Mario's joints, so animated
 * limbs would rotate about the wrong pivots (arms swinging into the face, folded legs). This moves every joint with the SAME per-part maps build_mario.py
 * uses for the morph (chibi_offsets): bind matrices (rest = morphed mesh exactly) and pose-time bone offsets, both scaled by the morph weight. */
const LEG_Y=0.15,SH_Y=0.36;
function chibiMap(bone:string,p:THREE.Vector3):THREE.Vector3{  // Blender model space (z up), as in build_mario.chibi_offsets
 const sg=Math.sign(p.y+1e-9);
 if(/^(Root|Hips|Spine)/.test(bone))return new THREE.Vector3(p.x*1.06,p.y*1.06,0.58+(p.z-0.8)*0.62);
 if(/^Head/.test(bone))return new THREE.Vector3(p.x*1.3,p.y*1.36,0.86+(p.z-1.27)*1.38);
 if(/^(Thigh|Shin|Foot)/.test(bone))return new THREE.Vector3(p.x*1.16,sg*LEG_Y*0.95+(p.y-sg*LEG_Y)*1.16,p.z*0.72);
 return new THREE.Vector3(p.x*0.82,sg*SH_Y*0.98+(p.y-sg*SH_Y)*0.82,0.58+(1.14-0.8)*0.62+(p.z-1.14)*0.82);
}
class Chibi{
 private bones:THREE.Bone[];private rest:THREE.Vector3[];private offset:THREE.Vector3[];private animated:Set<string>;private base:THREE.Matrix4[][];
 private W:THREE.Matrix4[]=[];private Wt:THREE.Matrix4[]=[];private value=-1;private applied:THREE.Vector3[];
 constructor(private meshes:THREE.SkinnedMesh[],clips:THREE.AnimationClip[]){
  this.bones=meshes[0].skeleton.bones;
  for(const m of meshes)m.skeleton.boneInverses=m.skeleton.boneInverses.map(b=>b.clone());  // clones share the array: make it ours
  this.base=meshes.map(m=>m.skeleton.boneInverses.map(b=>b.clone()));
  this.animated=new Set(clips.flatMap(c=>c.tracks.filter(t=>t.name.endsWith('.position')).map(t=>t.name.slice(0,-9))));
  this.rest=this.bones.map(b=>b.position.clone());this.applied=this.bones.map(()=>new THREE.Vector3());
  // Rest joint frames in armature space (composed from the bone locals; the mesh's own bind space is quantised by meshopt, so it is not used).
  const p=new THREE.Vector3();
  this.bones.forEach((b,i)=>{b.updateMatrix();const pi=this.bones.indexOf(b.parent as THREE.Bone);const w=pi<0?b.matrix.clone():this.W[pi].clone().multiply(b.matrix);this.W.push(w);
   p.setFromMatrixPosition(w);const m=chibiMap(b.name,new THREE.Vector3(p.x,-p.z,p.y));this.Wt.push(w.clone().setPosition(m.x,m.z,-m.y));});  // glTF (x,y,z) = Blender (x,z,-y)
  const tmp=new THREE.Matrix4();
  this.offset=this.bones.map((b,i)=>{const pi=this.bones.indexOf(b.parent as THREE.Bone);
   const local=(arr:THREE.Matrix4[])=>new THREE.Vector3().setFromMatrixPosition(pi<0?arr[i]:tmp.copy(arr[pi]).invert().multiply(arr[i]));
   return local(this.Wt).sub(local(this.W));});
 }
 /** New bind: inverse(moved joint) * rest joint * original inverse bind, with the joint moved by the morph weight. */
 set(v:number){
  if(v===this.value)return;this.value=v;const a=new THREE.Vector3(),b=new THREE.Vector3(),m=new THREE.Matrix4();
  this.meshes.forEach((mesh,k)=>this.W.forEach((w,i)=>{a.setFromMatrixPosition(w);b.setFromMatrixPosition(this.Wt[i]);
   mesh.skeleton.boneInverses[i].copy(m.copy(w).setPosition(a.lerp(b,v)).invert().multiply(w).multiply(this.base[k][i]));}));
 }
 /** The mixer only writes a bone when its sampled value CHANGES, so the offset added last frame is taken off before every mixer update (no accumulation). */
 unpose(){this.bones.forEach((b,i)=>b.position.sub(this.applied[i]));}
 pose(v:number){this.bones.forEach((b,i)=>{if(!this.animated.has(b.name))b.position.copy(this.rest[i]);this.applied[i].copy(this.offset[i]).multiplyScalar(v);b.position.add(this.applied[i]);});}
}
