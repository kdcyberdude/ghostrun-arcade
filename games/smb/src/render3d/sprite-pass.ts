// NES sprite priority with ordinary 3D depth retained inside each authored actor.
import * as THREE from 'three';
import {Pass} from 'three/examples/jsm/postprocessing/Pass.js';
export interface SpriteDraw{root:THREE.Object3D;offset:number;background:boolean;clipRow?:number}
/** Each four-byte OAM address receives one floating-point exponent interval. This gives every actor
 * the full depth mantissa for its own linear view depth, even at the highest OAM address. */
export class SpritePass extends Pass{
 draws:SpriteDraw[]=[];
 private world=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,depthTexture:new THREE.DepthTexture(1,1,THREE.FloatType)});
 // FullScreenQuad's geometry is shared globally; audit disposal must not invalidate another composer.
 private copyCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
 private copy=new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-1,3,0,-1,-1,0,3,-1,0],3)).setAttribute('uv',new THREE.Float32BufferAttribute([0,2,0,0,2,0],2)),new THREE.ShaderMaterial({uniforms:{map:{value:null},depth:{value:null}},vertexShader:'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:'uniform sampler2D map,depth;varying vec2 uv0;void main(){gl_FragColor=texture2D(map,uv0);gl_FragDepth=texture2D(depth,uv0).r;}',depthTest:true,depthWrite:true,depthFunc:THREE.AlwaysDepth}));
 private owned=new Set<THREE.Material>();
 private ghosts=new WeakMap<THREE.Material,THREE.Material>();
 private clones=new WeakMap<THREE.Object3D,Map<THREE.Material,{material:THREE.Material;uniforms:any;version:number}>>();
 constructor(private scene:THREE.Scene,private camera:THREE.Camera,private banks:THREE.Group[]){super();this.needsSwap=false;}
 setSize(w:number,h:number){this.world.setSize(w,h);}
 /** Base world still receives actor shadows; suppress their color/depth writes rather than their visibility. */
 worldOnly<T>(fn:()=>T,hide=false){
  const meshes:{mesh:THREE.Mesh;material:THREE.Material|THREE.Material[]}[]=[],roots=this.draws.filter(d=>d.root.visible).map(d=>d.root),visibility=roots.map(root=>root.visible);
  const ghost=(source:THREE.Material)=>{let material=this.ghosts.get(source);if(!material){material=source.clone();this.owned.add(material);material.onBeforeCompile=(shader,renderer)=>source.onBeforeCompile(shader,renderer);material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-native-world-only';this.ghosts.set(source,material);}material.copy(source);(material as any).glslVersion=(source as any).glslVersion;material.colorWrite=material.depthWrite=false;return material;};
  try{if(hide)for(const root of roots)root.visible=false;else for(const root of roots)root.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const material=mesh.material;meshes.push({mesh,material});mesh.material=Array.isArray(material)?material.map(ghost):ghost(material);});return fn();}
  finally{for(const {mesh,material}of meshes)mesh.material=material;roots.forEach((root,i)=>root.visible=visibility[i]);}
 }

 private material(source:THREE.Material,root:THREE.Object3D,draw:SpriteDraw,depth:THREE.Texture,size:THREE.Vector2){
  let bank=this.clones.get(root);if(!bank)this.clones.set(root,bank=new Map());let entry=bank.get(source);
  if(!entry){const material=source.clone();this.owned.add(material);const uniforms={nativeWorld:{value:this.world.texture},nativeWorldDepth:{value:depth},nativeSize:{value:size.clone()},nativeOffset:{value:draw.offset},nativeBackground:{value:draw.background},nativeOrigin:{value:0},nativeClipRow:{value:-1}};
   material.onBeforeCompile=(shader,renderer)=>{source.onBeforeCompile(shader,renderer);Object.assign(shader.uniforms,uniforms);shader.vertexShader='varying float nativeViewDepth;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\nnativeViewDepth=-mvPosition.z;');shader.fragmentShader='varying float nativeViewDepth;uniform sampler2D nativeWorld,nativeWorldDepth;uniform vec2 nativeSize;uniform float nativeOffset,nativeOrigin,nativeClipRow;uniform bool nativeBackground;\n'+shader.fragmentShader.replace(/}\s*$/,`
 vec2 nativeUv=gl_FragCoord.xy/nativeSize;
 if(nativeBackground&&(gl_FragCoord.z>texture2D(nativeWorldDepth,nativeUv).r||(nativeClipRow>=0.0&&240.0*(1.0-nativeUv.y)>=nativeClipRow))){${source.userData.nativeBackgroundMask??'gl_FragColor.rgb=texture2D(nativeWorld,nativeUv).rgb;'}}
 gl_FragDepth=exp2(nativeOffset/4.0-64.0)*(1.5+atan(nativeViewDepth-nativeOrigin)/3.141592653589793);\n}`);};
   material.customProgramCacheKey=()=>source.customProgramCacheKey()+'-native-oam-depth-v1';entry={material,uniforms,version:-1};bank.set(source,entry);
  }
  entry.material.copy(source);(entry.material as any).glslVersion=(source as any).glslVersion;if(entry.version!==source.version){entry.material.needsUpdate=true;entry.version=source.version;}
  const u=entry.uniforms;u.nativeWorldDepth.value=depth;u.nativeSize.value.copy(size);u.nativeOffset.value=draw.offset&252;u.nativeBackground.value=draw.background;u.nativeClipRow.value=draw.clipRow??-1;u.nativeOrigin.value=-root.getWorldPosition(new THREE.Vector3()).applyMatrix4(this.camera.matrixWorldInverse).z;
  return entry.material;
 }
 render(renderer:THREE.WebGLRenderer,_write:THREE.WebGLRenderTarget,read:THREE.WebGLRenderTarget){
  if(!read.depthTexture)throw Error('native sprite composition requires world depth');
  const target=renderer.getRenderTarget(),background=this.scene.background,auto=renderer.autoClear,shadow=renderer.shadowMap.autoUpdate,needs=renderer.shadowMap.needsUpdate,bankVisibility=this.banks.map(b=>b.visible),saved:{mesh:THREE.Mesh;material:THREE.Material|THREE.Material[];order:number;receive:boolean}[]=[],moved:{root:THREE.Object3D;parent:THREE.Object3D;index:number}[]=[];
  const size=new THREE.Vector2(read.width,read.height),draws=this.draws.filter(d=>d.root.visible&&d.root.parent?.visible);
  try{
   (this.copy.material as THREE.ShaderMaterial).uniforms.map.value=read.texture;(this.copy.material as THREE.ShaderMaterial).uniforms.depth.value=read.depthTexture;renderer.setRenderTarget(this.world);renderer.render(this.copy,this.copyCamera);
   this.scene.background=null;renderer.autoClear=false;renderer.shadowMap.autoUpdate=renderer.shadowMap.needsUpdate=false;
   for(const draw of draws){draw.root.updateWorldMatrix(true,true);draw.root.traverse(o=>{const mesh=o as THREE.Mesh;if(!mesh.isMesh)return;const material=mesh.material;saved.push({mesh,material,order:mesh.renderOrder,receive:mesh.receiveShadow});mesh.renderOrder=255-draw.offset;mesh.receiveShadow=false; /* an NES sprite is never shaded by the background: a block it overlaps must not darken it as if it were inside */mesh.material=Array.isArray(material)?material.map(m=>this.material(m,draw.root,draw,this.world.depthTexture!,size)):this.material(material,draw.root,draw,this.world.depthTexture!,size);});
    // All three banks use the scene coordinate system. Reparent only during this pass, restoring exact child order below.
    const parent=draw.root.parent!;moved.push({root:draw.root,parent,index:parent.children.indexOf(draw.root)});this.scene.add(draw.root);
   }
   for(const bank of this.banks)bank.visible=false;
   renderer.setRenderTarget(read);renderer.clearDepth();renderer.render(this.scene,this.camera);
  }finally{
   for(const {mesh,material,order,receive}of saved){mesh.material=material;mesh.renderOrder=order;mesh.receiveShadow=receive;}
   for(const {root,parent,index}of moved.reverse()){parent.add(root);parent.children.splice(parent.children.indexOf(root),1);parent.children.splice(index,0,root);}
   this.banks.forEach((b,i)=>b.visible=bankVisibility[i]);this.scene.background=background;renderer.autoClear=auto;renderer.shadowMap.autoUpdate=shadow;renderer.shadowMap.needsUpdate=needs;renderer.setRenderTarget(target);
  }
 }
 dispose(){this.world.dispose();this.copy.material.dispose();this.copy.geometry.dispose();for(const material of this.owned)material.dispose();this.owned.clear();}
}
