/** Content hash of everything a three.js WebGLRenderer.render(scene,camera) call reads, so an audit can reuse a picture verdict when a later
 * run builds the identical scene for the same native frame (combined-monitor-audit.ts --cache). Textures and geometry are hashed by content,
 * materials and objects by every field the draw depends on: no renderer source change can make two different pictures share a hash.
 * Two independent 32-bit FNV-style lanes give a 64-bit key. */
export function createSceneHasher(){
 const f64=new Float64Array(1),u32=new Uint32Array(f64.buffer);let a=0,b=0;
 const word=w=>{a=Math.imul(a^w,0x01000193);b=Math.imul(b^w,0x5bd1e995);b^=b>>>15;};
 const num=v=>{if(v===undefined||v===null){word(0x7fc00001);return;}if(typeof v==='boolean'){word(v?0x7fc00003:0x7fc00002);return;}f64[0]=v;word(u32[0]);word(u32[1]);};
 const str=s=>{s=String(s);word(s.length);for(let i=0;i<s.length;i++)word(s.charCodeAt(i));};
 const nums=list=>{word(list.length);for(const v of list)num(v);};
 const lanes=()=>[a>>>0,b>>>0],fresh=()=>{a=0x811c9dc5;b=0x9747b28c;};
 const textures=new WeakMap(),geometries=new WeakMap();
 const imageWords=image=>{
  const canvas=document.createElement('canvas'),width=image.width,height=image.height;canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);return new Uint32Array(context.getImageData(0,0,width,height).data.buffer);
 };
 const texture=t=>{
  if(!t){word(0);return;}
  let cached=textures.get(t);
  if(!cached||cached.version!==t.version){
   const sa=a,sb=b;fresh();const image=t.image;
   if(image?.data){str('data');nums([image.width,image.height]);for(const w of new Uint32Array(image.data.buffer,image.data.byteOffset,image.data.byteLength>>2))word(w);}
   else if(image){str('image');nums([image.width,image.height]);for(const w of imageWords(image))word(w);}
   else str('empty');
   nums([t.flipY,t.premultiplyAlpha,t.unpackAlignment,t.magFilter,t.minFilter,t.wrapS,t.wrapT,t.generateMipmaps,t.format,t.type,t.anisotropy]);str(t.colorSpace);
   cached={version:t.version,h:lanes()};textures.set(t,cached);a=sa;b=sb;
  }
  word(cached.h[0]);word(cached.h[1]);
  nums([t.offset.x,t.offset.y,t.repeat.x,t.repeat.y,t.center.x,t.center.y,t.rotation,t.matrixAutoUpdate]);nums(t.matrix.elements);
 };
 const geometry=g=>{
  if(!g){word(0);return;}
  const versions=[g.index?.version,...Object.values(g.attributes).map(x=>x.version)].join(',');let cached=geometries.get(g);
  if(!cached||cached.versions!==versions){
   const sa=a,sb=b;fresh();
   if(g.index)nums(g.index.array);else word(0);
   for(const name of Object.keys(g.attributes).sort()){const x=g.attributes[name];str(name);nums([x.itemSize,x.normalized,x.count]);nums(x.array);}
   for(const group of g.groups)nums([group.start,group.count,group.materialIndex]);
   cached={versions,h:lanes()};geometries.set(g,cached);a=sa;b=sb;
  }
  word(cached.h[0]);word(cached.h[1]);nums([g.drawRange.start,g.drawRange.count]);
 };
 const material=m=>{
  if(!m){word(0);return;}
  if(Array.isArray(m)){word(m.length);m.forEach(material);return;}
  str(m.type);
  nums([m.visible,m.transparent,m.opacity,m.alphaTest,m.alphaToCoverage,m.depthTest,m.depthWrite,m.depthFunc,m.side,m.blending,m.blendSrc,m.blendDst,m.blendEquation,m.premultipliedAlpha,
   m.colorWrite,m.toneMapped,m.vertexColors,m.fog,m.wireframe,m.polygonOffset,m.polygonOffsetFactor,m.polygonOffsetUnits,m.dithering,
   m.stencilWrite,m.stencilRef,m.stencilFunc,m.stencilFuncMask,m.stencilWriteMask,m.stencilFail,m.stencilZFail,m.stencilZPass]);
  if(m.color)nums([m.color.r,m.color.g,m.color.b]);else word(0);
  texture(m.map);texture(m.alphaMap);
 };
 const object=o=>{
  str(o.type);nums([o.visible,o.renderOrder,o.frustumCulled,o.layers.mask,o.matrixAutoUpdate,o.userData?.drawOrder]);
  nums([o.position.x,o.position.y,o.position.z,o.quaternion.x,o.quaternion.y,o.quaternion.z,o.quaternion.w,o.scale.x,o.scale.y,o.scale.z]);
  if(!o.matrixAutoUpdate)nums(o.matrix.elements);
  if(o.isMesh||o.isSprite||o.isLine||o.isPoints){geometry(o.geometry);material(o.material);}
  word(o.children.length);for(const child of o.children)object(child);
 };
 /** Hash of one render call: renderer settings, camera and the whole scene graph. */
 return (renderer,scene,camera)=>{
  fresh();
  const clear=renderer.getClearColor({r:0,g:0,b:0,copy(c){this.r=c.r;this.g=c.g;this.b=c.b;return this;}});nums([clear.r,clear.g,clear.b,renderer.getClearAlpha(),renderer.autoClear,renderer.autoClearColor,renderer.autoClearDepth,renderer.autoClearStencil,
   renderer.toneMapping,renderer.toneMappingExposure,renderer.sortObjects,renderer.getPixelRatio()]);str(renderer.outputColorSpace);
  const size=renderer.getSize({x:0,y:0,set(x,y){this.x=x;this.y=y;return this;}});nums([size.x,size.y]);
  camera.updateMatrixWorld();nums(camera.projectionMatrix.elements);nums(camera.matrixWorld.elements);
  if(scene.background?.isColor)nums([scene.background.r,scene.background.g,scene.background.b]);else if(scene.background)texture(scene.background);else word(0);
  word(scene.fog?1:0);word(scene.overrideMaterial?1:0);
  object(scene);
  return lanes();
 };
}
/** Defer every draw of a WebGLRenderer: render(scene,camera) only records the scene and its hash; draw() renders the pending scene once. */
export function deferDraws(renderer){
 const draw=renderer.render.bind(renderer),hash=createSceneHasher(),state={pending:null,hash:(scene,camera)=>hash(renderer,scene,camera),draw:()=>{const p=state.pending;if(!p.drawn){draw(p.scene,p.camera);p.drawn=true;}}};
 renderer.render=(scene,camera)=>{state.pending={scene,camera,drawn:false,key:state.hash(scene,camera)};};
 return state;
}
