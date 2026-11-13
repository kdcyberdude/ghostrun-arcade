import * as THREE from 'three';
import {visiblePixels,sceneState} from './visibility-pass.js';
import {depthAttachment} from './depth-attachment.js';
import {SpritePass} from '../../src/render3d/sprite-pass.js';
export function check(gl:THREE.WebGLRenderer){
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0.1,100);camera.position.z=10;camera.updateMatrixWorld();
 const world=new THREE.Group(),actors=new THREE.Group();scene.add(world,actors);
 const make=(color:number,z:number,parent:THREE.Group)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color,toneMapped:false}));m.position.z=z;parent.add(m);return m;};
 const wall=make(0xff0000,2,world),back=make(0x00ff00,0,actors),front=make(0x0000ff,-1,actors),pass=new SpritePass(scene,camera,[world,actors]),target=new THREE.WebGLRenderTarget(32,32,{depthTexture:new THREE.DepthTexture(32,32,THREE.FloatType)});pass.setSize(32,32);
 const r=(window as any).render3d,formats=[r.atmosphere.composer.renderTarget1,r.atmosphere.composer.renderTarget2,r.atmosphere.sprites.world,target].map(t=>depthAttachment(gl,t));
 const results:any[]=[{name:'actual actor/composer/copy depth attachments',formats}],pixel=new Uint8Array(4),saved={target:gl.getRenderTarget(),auto:gl.autoClear,shadow:gl.shadowMap.autoUpdate};
 const run=(name:string,background:boolean,offset:number,frontOffset:number)=>{pass.draws=[{root:back,offset,background},{root:front,offset:frontOffset,background:false}];gl.autoClear=true;gl.setRenderTarget(target);pass.worldOnly(()=>gl.render(scene,camera));pass.render(gl,target,target);gl.readRenderTargetPixels(target,16,16,1,1,pixel);const rgb=[...pixel.slice(0,3)];results.push({name,rgb});return rgb;};
 try{
  let p=run('foreground over opaque terrain',false,4,8);if(p[1]<250||p[0]||p[2])throw Error(JSON.stringify(results));
  p=run('lowest OAM addresses stay distinct',false,0,4);if(p[1]<250||p[0]||p[2])throw Error('low OAM depth quantized: '+JSON.stringify(results));
  p=run('higher priority background sprite masks foreground sprite behind terrain',true,4,8);if(p[0]<250||p[1]||p[2])throw Error(JSON.stringify(results));
  p=run('higher priority foreground wins across priority-bit groups',true,8,4);if(p[2]<250||p[0]||p[1])throw Error(JSON.stringify(results));
  const labels=new Map<THREE.Object3D,number>([[back,1],[front,2]]),mask=visiblePixels(gl,scene,camera,labels,2,[],false,{draws:[{root:back,offset:4,background:true},{root:front,offset:8,background:false}],banks:[world,actors]});if(mask.pixels[1]||mask.pixels[2])throw Error('BG mask composition failed: '+JSON.stringify(mask));results.push({name:'MRT background sprite masks lower-priority actor',pixels:mask.pixels});
  wall.visible=false;p=run('background sprite visible without terrain',true,4,8);if(p[1]<250||p[0]||p[2])throw Error(JSON.stringify(results));
  scene.background=new THREE.Color(0xff0000);pass.draws=[{root:back,offset:4,background:true,clipRow:0},{root:front,offset:8,background:false}];gl.autoClear=true;gl.setRenderTarget(target);pass.worldOnly(()=>gl.render(scene,camera));const base=new Uint8Array(4);gl.readRenderTargetPixels(target,16,16,1,1,base);pass.render(gl,target,target);gl.readRenderTargetPixels(target,16,16,1,1,pixel);if(pixel.some((v,i)=>v!==base[i]))throw Error('native pipe row must retain world color/OAM masking: '+JSON.stringify({base:[...base],pixel:[...pixel]}));results.push({name:'native pipe row masks lower-priority sprite through authored pipe opening',rgb:[...pixel.slice(0,3)]});scene.background=null;
  const detail=make(0xffffff,0.01,actors);detail.geometry.dispose();detail.geometry=new THREE.PlaneGeometry(0.5,0.5);back.add(detail);detail.position.z=0.01;pass.draws=[{root:back,offset:4,background:false}];front.visible=false;
  gl.autoClear=true;gl.setRenderTarget(target);pass.worldOnly(()=>gl.render(scene,camera));pass.render(gl,target,target);gl.readRenderTargetPixels(target,16,16,1,1,pixel);if(pixel[0]<250||pixel[1]<250||pixel[2]<250)throw Error('self-depth lost');results.push({name:'model self-depth preserved',rgb:[...pixel.slice(0,3)]});
  const before=sceneState(scene),render=gl.render;try{gl.render=function(s,c){if(s===scene)throw Error('intentional sprite pass failure');return render.call(this,s,c);};try{pass.render(gl,target,target);}catch(error){if(!String(error).includes('intentional'))throw error;}}finally{gl.render=render;}if(before!==sceneState(scene))throw Error('sprite composition did not restore after failure');results.push({name:'exception restores materials, roots, order and visibility'});
  return results;
 }finally{gl.setRenderTarget(saved.target);gl.autoClear=saved.auto;gl.shadowMap.autoUpdate=saved.shadow;target.dispose();pass.dispose();}
}
