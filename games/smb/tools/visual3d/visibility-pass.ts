// GPU alpha/depth visibility instrumentation only. Materials and renderer/scene state restore in finally.
import * as THREE from 'three';
import {SpritePass,type SpriteDraw} from '../../src/render3d/sprite-pass.js';
const W=256,H=240,ATTACHMENTS=4,PER_PASS=ATTACHMENTS*3;
const materialCache=new WeakMap<THREE.Material,Map<number,{material:THREE.MeshBasicMaterial;id:{value:number}}>>();
function maskMaterial(source:any,id:number,isolated=false){
 let cache=materialCache.get(source);if(!cache)materialCache.set(source,cache=new Map());const key=id+(isolated?32:0);let entry=cache.get(key);
 if(!entry){
  const material=new THREE.MeshBasicMaterial({map:source.map,alphaMap:source.alphaMap,alphaTest:source.alphaTest,transparent:source.transparent,opacity:source.opacity,side:source.side,depthTest:source.depthTest,depthWrite:source.depthWrite,blending:source.blending,premultipliedAlpha:source.premultipliedAlpha,polygonOffset:source.polygonOffset,polygonOffsetFactor:source.polygonOffsetFactor,polygonOffsetUnits:source.polygonOffsetUnits,clippingPlanes:source.clippingPlanes,clipIntersection:source.clipIntersection,vertexColors:source.vertexColors,toneMapped:false,fog:false});
  material.userData.nativeBackgroundMask=Array.from({length:ATTACHMENTS},(_,i)=>`mask${i}.rgb=vec3(0.0);`).join('');material.visible=source.visible;(material as any).glslVersion=THREE.GLSL3;
  const uniform={value:id};
  material.onBeforeCompile=shader=>{
   shader.uniforms.pickId=uniform;
   const outputs=Array.from({length:ATTACHMENTS},(_,i)=>`layout(location=${i}) out highp vec4 mask${i};`).join('\n');
   const values=Array.from({length:ATTACHMENTS},(_,i)=>`mask${i}=vec4(vec3(${[0,1,2].map(c=>`abs(pickId-${i*3+c+1}.0)<0.25?1.0:0.0`).join(',')})${isolated||source.premultipliedAlpha?'*diffuseColor.a':''},diffuseColor.a);`).join('\n');
   shader.fragmentShader=`${outputs}\n#define gl_FragColor mask0\nuniform float pickId;\n`+shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>\n${values}`);
  };
  material.customProgramCacheKey=()=>`visibility-mrt-${ATTACHMENTS}-${isolated?'union':'visible'}`;
  entry={material,id:uniform};cache.set(key,entry);
 }
 for(const key of ['map','alphaMap','alphaTest','transparent','opacity','visible','side','depthTest','depthWrite','blending','premultipliedAlpha','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','clippingPlanes','clipIntersection','vertexColors','wireframe','colorWrite','depthFunc','alphaHash','blendSrc','blendDst','blendSrcAlpha','blendDstAlpha','blendEquation','blendEquationAlpha'])if(!(isolated&&['visible','transparent','depthTest','depthWrite','blending','blendSrc','blendDst','blendSrcAlpha','blendDstAlpha','blendEquation','blendEquationAlpha'].includes(key))&&(entry.material as any)[key]!==source[key]){(entry.material as any)[key]=source[key];if(key!=='opacity'&&key!=='visible')entry.material.needsUpdate=true;}
 if(isolated){entry.material.visible=source.visible&&id>0;entry.material.transparent=true;entry.material.depthTest=entry.material.depthWrite=false;entry.material.blending=THREE.CustomBlending;entry.material.blendEquation=entry.material.blendEquationAlpha=THREE.MaxEquation;entry.material.blendSrc=entry.material.blendDst=THREE.OneFactor;entry.material.blendSrcAlpha=entry.material.blendDstAlpha=THREE.OneFactor;}
 return entry.material;
}
export function sceneState(scene:THREE.Scene){
 const objects:any[]=[];scene.traverse(o=>{const m=o as any,materials=m.material?(Array.isArray(m.material)?m.material:[m.material]):[];objects.push([o.uuid,o.visible,o.position.toArray(),o.quaternion.toArray(),o.scale.toArray(),o.renderOrder,m.count,m.morphTargetInfluences,m.geometry?.attributes?.position?.version,m.geometry?.index?.version,materials.map((v:any)=>[v.uuid,v.visible,v.opacity,v.alphaTest,v.color?.toArray(),v.map?.uuid])]);});
 return JSON.stringify({background:(scene.background as any)?.uuid??(scene.background as any)?.getHex?.(),override:scene.overrideMaterial?.uuid,objects});
}
/** Each MRT RGB channel carries one object's alpha contribution through actual depth, alpha-test and transparent blending.
 * RGBA8 quantizes visibility to1/255. Unlike a single ID image, translucent foreground objects preserve objects behind them. */
export function visiblePixels(renderer:THREE.WebGLRenderer,scene:THREE.Scene,camera:THREE.Camera,labels:Map<THREE.Object3D,number>,count:number,overlays:{scene:THREE.Scene;camera:THREE.Camera}[]=[] ,isolated=false,composition?:{draws:SpriteDraw[];banks:THREE.Group[]},scale=1){
 const W=256*scale,H=240*scale;
 const gl=renderer.getContext() as WebGL2RenderingContext;if(gl.getParameter(gl.MAX_DRAW_BUFFERS)<ATTACHMENTS)throw Error('visibility pass requires four draw buffers');
 const target=new THREE.WebGLRenderTarget(W,H,{count:ATTACHMENTS,depthBuffer:true,depthTexture:new THREE.DepthTexture(W,H,THREE.FloatType),stencilBuffer:false,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
 const spritePass=composition&&!isolated?new SpritePass(scene,camera,composition.banks):undefined;if(spritePass){spritePass.draws=composition!.draws;spritePass.setSize(W,H);}
 for(const texture of target.textures)texture.colorSpace=THREE.NoColorSpace;
 const saved={target:renderer.getRenderTarget(),viewport:renderer.getViewport(new THREE.Vector4()),scissor:renderer.getScissor(new THREE.Vector4()),scissorTest:renderer.getScissorTest(),clear:renderer.getClearColor(new THREE.Color()),alpha:renderer.getClearAlpha(),autoClear:renderer.autoClear,shadow:renderer.shadowMap.autoUpdate,shadowNeedsUpdate:renderer.shadowMap.needsUpdate,renderInfo:{...renderer.info.render},background:scene.background,override:scene.overrideMaterial,readBuffer:gl.getParameter(gl.READ_BUFFER)};
 const layers=[{scene,camera},...overlays],layerStates=layers.map(l=>({scene:l.scene,background:l.scene.background,override:l.scene.overrideMaterial}));
 const meshes:any[]=[],hidden:THREE.Object3D[]=[],unsupported:string[]=[];for(const layer of layers)layer.scene.traverse(o=>{const m=o as any;if(m.isMesh)meshes.push({mesh:m,material:m.material});else if((m.isPoints||m.isLine||m.isSprite)&&o.visible){hidden.push(o);unsupported.push(o.type+':'+o.name);}});
 const pixels=Array.from({length:count+1},()=>0),contribution=Array.from({length:count+1},()=>0),buffer=new Uint8Array(W*H*4);
 try{
  for(const layer of layers){layer.scene.background=null;layer.scene.overrideMaterial=null;}renderer.autoClear=true;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=false;renderer.setRenderTarget(target);renderer.setViewport(0,0,W,H);renderer.setScissorTest(false);renderer.setClearColor(0,0);
  for(const o of hidden)o.visible=false;
  for(let base=0;base<count;base+=PER_PASS){
   for(const {mesh,material}of meshes){const label=labels.get(mesh)??0,local=label-base,id=label&&local>=1&&local<=PER_PASS?local:0;mesh.material=Array.isArray(material)?material.map(m=>maskMaterial(m,id,isolated)):maskMaterial(material,id,isolated);}
   renderer.autoClear=true;if(spritePass){spritePass.worldOnly(()=>renderer.render(scene,camera));spritePass.render(renderer,target,target);}else renderer.render(scene,camera);for(const overlay of overlays){renderer.autoClear=false;renderer.clearDepth();renderer.render(overlay.scene,overlay.camera);}
   for(let attachment=0;attachment<ATTACHMENTS;attachment++){
    gl.readBuffer(gl.COLOR_ATTACHMENT0+attachment);gl.readPixels(0,0,W,H,gl.RGBA,gl.UNSIGNED_BYTE,buffer);
    for(let y=0;y<H-32*scale;y++)for(let x=0;x<W;x++)for(let channel=0;channel<3;channel++){const id=base+attachment*3+channel+1;if(id>count)continue;const value=buffer[(y*W+x)*4+channel];if(value){pixels[id]++;contribution[id]+=value/255;}}
   }
  }
 }finally{
  for(const {mesh,material}of meshes)mesh.material=material;for(const o of hidden)o.visible=true;
  for(const layer of layerStates){layer.scene.background=layer.background;layer.scene.overrideMaterial=layer.override;}renderer.autoClear=saved.autoClear;renderer.shadowMap.autoUpdate=saved.shadow;renderer.shadowMap.needsUpdate=saved.shadowNeedsUpdate;Object.assign(renderer.info.render,saved.renderInfo);renderer.setRenderTarget(saved.target);renderer.setViewport(saved.viewport);renderer.setScissor(saved.scissor);renderer.setScissorTest(saved.scissorTest);renderer.setClearColor(saved.clear,saved.alpha);gl.readBuffer(saved.readBuffer);target.dispose();spritePass?.dispose();
 }
 return {pixels,contribution,unsupported,isolated,resolution:[W,H],precision:'RGBA8 alpha contribution;1/255; playfield rows32..239',passes:Math.ceil(count/PER_PASS)};
}
