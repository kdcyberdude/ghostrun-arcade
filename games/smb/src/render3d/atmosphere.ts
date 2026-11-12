// Camera rig, themed sky/fog, sun + shadows, image-based light and the post chain.
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {GTAOPass} from 'three/examples/jsm/postprocessing/GTAOPass.js';
import {FXAAShader} from 'three/examples/jsm/shaders/FXAAShader.js';
import {SKY_IDS} from './asset-policy.js';
/** Photoreal skies (CC0 Poly Haven, fetched by visual3d/tools/polyhaven.py): 2k HDR for light, 8k tonemapped panorama for the visible sky. */
const PH=import.meta.env.BASE_URL+'assets3d/ph/hdri/';
export const SKIES:Record<string,string>=SKY_IDS;
interface Sky{env:THREE.Texture;bg:THREE.Texture;rotation:number;sunDir:THREE.Vector3;horizon:THREE.Color}
import {NES_W,NES_H} from './coords.js';
import {GOLD} from './proc.js';
export type Quality='ultra'|'high'|'low';
export interface Theme{skyTop:string;skyMid:string;skyBottom:string;fog:string;fogNear:number;fogFar:number;sun:number;sunI:number;hemiSky:number;hemiGround:number;hemiI:number;env:number;bloom:number}
export const THEMES:Record<string,Theme>={
 ground:{skyTop:'#2f6fd6',skyMid:'#6aa6ee',skyBottom:'#cfe6fb',fog:'#b9d6f2',fogNear:45,fogFar:300,sun:0xffe6c0,sunI:4.2,hemiSky:0xa9ccff,hemiGround:0x5a4030,hemiI:0.55,env:0.4,bloom:0.22},
 underground:{skyTop:'#04060c',skyMid:'#070a14',skyBottom:'#0a0f1e',fog:'#070a14',fogNear:40,fogFar:120,sun:0xffd2a0,sunI:2.6,hemiSky:0x7d93d0,hemiGround:0x2a2238,hemiI:1.3,env:0.6,bloom:0.3},
 water:{skyTop:'#46c2ee',skyMid:'#1784d0',skyBottom:'#0b3f86',fog:'#2f86d3',fogNear:20,fogFar:120,sun:0xcfe9ff,sunI:2.0,hemiSky:0x6fb7ff,hemiGround:0x153a6a,hemiI:0.9,env:0.4,bloom:0.25},
 castle:{skyTop:'#06070c',skyMid:'#0d0f18',skyBottom:'#1a1420',fog:'#0d0f18',fogNear:40,fogFar:130,sun:0xffe2c4,sunI:2.6,hemiSky:0x8c9ab8,hemiGround:0x4a2416,hemiI:1.3,env:0.6,bloom:0.4},
 night:{skyTop:'#050a24',skyMid:'#0d1a4a',skyBottom:'#1f3a7a',fog:'#0d1a4a',fogNear:50,fogFar:220,sun:0xa8c4ff,sunI:1.4,hemiSky:0x4a64b0,hemiGround:0x1a1a30,hemiI:0.8,env:0.3,bloom:0.3},
 snow:{skyTop:'#6fa3d8',skyMid:'#b4d2ee',skyBottom:'#eef6ff',fog:'#dcebf7',fogNear:50,fogFar:220,sun:0xfff6e6,sunI:3.0,hemiSky:0xdcecff,hemiGround:0x9aa8b8,hemiI:1.1,env:0.6,bloom:0.2},
};
export const FOV=24,PITCH=4.5*Math.PI/180,ASPECT=NES_W/NES_H;
/** Distance at which the 256-px-wide window spans exactly 16 world units at the gameplay plane. */
export const DIST=8/(ASPECT*Math.tan(FOV*Math.PI/360));
export const TARGET_Y=7.5;
/** Final colour grade in display space: vibrance (lifts muted colours most), gentle S-curve contrast and a warm lift, for a colourful, sunlit look on top of physically based lighting. */
const GRADE={uniforms:{tDiffuse:{value:null},vibrance:{value:0.6},contrast:{value:0.1},warmth:{value:0.02}},
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`uniform sampler2D tDiffuse;uniform float vibrance,contrast,warmth;varying vec2 vUv;
 void main(){vec4 c=texture2D(tDiffuse,vUv);vec3 x=c.rgb;float l=dot(x,vec3(0.2126,0.7152,0.0722));float mx=max(x.r,max(x.g,x.b)),mn=min(x.r,min(x.g,x.b));
  x=mix(vec3(l),x,1.0+vibrance*(1.0-(mx-mn)));x=mix(x,x*x*(3.0-2.0*x),contrast*4.0);x+=vec3(warmth,warmth*0.4,-warmth);gl_FragColor=vec4(clamp(x,0.0,1.0),c.a);}`};
/** Fantasy moonlit sky, painted procedurally (deterministic). The camera only translates, so a sky at infinity is fixed on screen: a screen-space background is exact.
 * Horizon sits ~31% from the top for FOV 24 / PITCH 4.5 (everything below it is terrain). */
function nightSky():THREE.Texture{
 const W=2048,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,r=((seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;})(42);
 const hz=0.33*H,grad=g.createLinearGradient(0,0,0,hz*1.25);grad.addColorStop(0,'#060a24');grad.addColorStop(0.5,'#14205a');grad.addColorStop(0.85,'#3b3f8c');grad.addColorStop(1,'#6a5aa0');g.fillStyle=grad;g.fillRect(0,0,W,H);
 // Milky Way: a soft diagonal band of haze and dense faint stars
 g.save();g.translate(W*0.55,hz*0.45);g.rotate(-0.38);for(let i=0;i<60;i++){const x=(r()-0.5)*W*1.4,y=(r()-0.5)*90,rad=60+r()*140,h=g.createRadialGradient(x,y,0,x,y,rad);h.addColorStop(0,`rgba(${150+r()*60|0},${140+r()*50|0},255,0.07)`);h.addColorStop(1,'rgba(120,110,220,0)');g.fillStyle=h;g.fillRect(x-rad,y-rad,rad*2,rad*2);}
 for(let i=0;i<2600;i++){const x=(r()-0.5)*W*1.4,y=(r()+r()+r()-1.5)*70;g.fillStyle=`rgba(230,235,255,${0.25+r()*0.5})`;g.fillRect(x,y,1.3,1.3);}g.restore();
 for(let i=0;i<1400;i++){const x=r()*W,y=Math.pow(r(),1.3)*hz*1.05,big=r()<0.06,s=big?2.2+r()*1.8:0.8+r()*1.2,hue=r();
  g.fillStyle=hue<0.15?'#ffd9a8':hue<0.3?'#a8c8ff':'#ffffff';g.globalAlpha=(0.35+r()*0.65)*Math.min(1,(hz*1.05-y)/(hz*0.25));g.beginPath();g.arc(x,y,s,0,7);g.fill();
  if(big){const h=g.createRadialGradient(x,y,0,x,y,s*6);h.addColorStop(0,'rgba(200,220,255,0.35)');h.addColorStop(1,'rgba(200,220,255,0)');g.fillStyle=h;g.fillRect(x-s*6,y-s*6,s*12,s*12);}}
 g.globalAlpha=1;
 // Moon with halo and soft maria
 const mx=W*0.2,my=hz*0.55,mr=64,halo=g.createRadialGradient(mx,my,mr*0.8,mx,my,mr*5);halo.addColorStop(0,'rgba(210,225,255,0.45)');halo.addColorStop(1,'rgba(160,180,255,0)');g.fillStyle=halo;g.fillRect(mx-mr*5,my-mr*5,mr*10,mr*10);
 const disc=g.createRadialGradient(mx-mr*0.3,my-mr*0.3,mr*0.1,mx,my,mr);disc.addColorStop(0,'#fffdf2');disc.addColorStop(1,'#d8dcea');g.fillStyle=disc;g.beginPath();g.arc(mx,my,mr,0,7);g.fill();
 g.fillStyle='rgba(150,158,185,0.35)';for(const [dx,dy,rr] of [[-0.3,-0.2,0.28],[0.25,0.1,0.22],[-0.05,0.38,0.18],[0.35,-0.35,0.12]]){g.beginPath();g.arc(mx+dx*mr,my+dy*mr,rr*mr,0,7);g.fill();}
 // thin moonlit clouds near the horizon
 for(let i=0;i<40;i++){const x=r()*W,y=hz*(0.62+r()*0.3),w=120+r()*260,h=g.createRadialGradient(x,y,0,x,y,w);h.addColorStop(0,'rgba(150,160,215,0.14)');h.addColorStop(1,'rgba(120,130,200,0)');g.save();g.scale(1,0.22);g.fillStyle=h;g.fillRect(x-w,y/0.22-w,w*2,w*2);g.restore();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
/** Above-the-clouds sky (bonus areas): deep azure overhead fading to a warm sunlit band over a far cloud horizon. Screen-space like nightSky. */
function cloudSky():THREE.Texture{
 const W=2048,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d')!,r=((seed:number)=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;})(7);
 const hz=0.42*H,grad=g.createLinearGradient(0,0,0,hz);grad.addColorStop(0,'#1452c4');grad.addColorStop(0.45,'#2f7fe0');grad.addColorStop(0.82,'#86c2f3');grad.addColorStop(1,'#d6e9fb');  // hz: where the far cloud sea meets the fog (camera sits above it)
 g.fillStyle=grad;g.fillRect(0,0,W,H);
 // sun glow (off-screen upper left) and far towering cumulus on the horizon, lit warm from the left
 const sun=g.createRadialGradient(-W*0.05,-H*0.05,0,-W*0.05,-H*0.05,W*0.7);sun.addColorStop(0,'rgba(255,245,215,0.55)');sun.addColorStop(1,'rgba(255,245,215,0)');g.fillStyle=sun;g.fillRect(0,0,W,H);
 for(let i=0;i<34;i++){const cx=r()*W,base=hz*(0.98+r()*0.04),h=40+r()*170,w=90+r()*220;
  for(let k=0;k<14;k++){const x=cx+(r()-0.5)*w,y=base-r()*h,rad=24+r()*60,b=g.createRadialGradient(x-rad*0.35,y-rad*0.35,rad*0.1,x,y,rad);
   b.addColorStop(0,'rgba(255,252,244,0.95)');b.addColorStop(0.7,'rgba(226,236,250,0.85)');b.addColorStop(1,'rgba(190,212,240,0)');g.fillStyle=b;g.beginPath();g.arc(x,y,rad,0,7);g.fill();}}
 // a few high wisps
 for(let i=0;i<18;i++){const x=r()*W,y=hz*(0.15+r()*0.55),w=200+r()*400;g.save();g.translate(x,y);g.rotate(-0.08+r()*0.16);g.scale(1,0.08);const h=g.createRadialGradient(0,0,0,0,0,w);h.addColorStop(0,'rgba(255,255,255,0.35)');h.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=h;g.fillRect(-w,-w,w*2,w*2);g.restore();}
 const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}
export class Atmosphere{
 readonly scene=new THREE.Scene();readonly camera=new THREE.PerspectiveCamera(FOV,ASPECT,1,600);
 readonly sun=new THREE.DirectionalLight(0xffffff,3);readonly hemi=new THREE.HemisphereLight(0xffffff,0x444444,1);
 private composer!:EffectComposer;private bloomStrength=0.22;private bloom?:UnrealBloomPass;private theme='';private sky:THREE.Texture|null=null;private black=false;private fog:THREE.Fog|null=null;private skies=new Map<string,Sky>();private skyLoads=new Map<string,Promise<void>>();private gradient?:THREE.Texture;private sunDir=new THREE.Vector3(-0.45,0.75,0.5).normalize();private fallbackEnv!:THREE.Texture;private pmrem:THREE.PMREMGenerator;private gtao?:GTAOPass;private fxaa?:ShaderPass;private night?:THREE.Texture;private cloud?:THREE.Texture;
 constructor(readonly renderer:THREE.WebGLRenderer,width:number,height:number,private quality:Quality){
  renderer.setPixelRatio(1);renderer.setSize(width,height,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1.05;  // Khronos PBR Neutral keeps hue and saturation (AgX greys out bright colours)
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  this.pmrem=new THREE.PMREMGenerator(renderer);this.fallbackEnv=this.pmrem.fromScene(new RoomEnvironment(),0.04).texture;this.scene.environment=this.fallbackEnv;GOLD.envMap=this.fallbackEnv;
  this.sun.castShadow=true;const sc=this.sun.shadow.camera;sc.left=-13;sc.right=13;sc.top=12;sc.bottom=-8;sc.near=1;sc.far=90;
  this.sun.shadow.bias=-0.0004;this.sun.shadow.normalBias=0.03;this.sun.shadow.radius=3;
  this.scene.add(this.sun,this.sun.target,this.hemi);
  this.build(width,height);
 }
 /** Ultra: 4x MSAA, ambient occlusion, bloom, 4096 shadow map. High: FXAA edge smoothing and bloom, 2048 shadows (about 3x cheaper than Ultra on an M4 laptop). Low: no post effects. */
 setQuality(quality:Quality){if(quality===this.quality)return;this.quality=quality;const size=this.renderer.getSize(new THREE.Vector2());this.build(size.x,size.y);}
 private build(width:number,height:number){
  const ultra=this.quality==='ultra',glow=this.quality!=='low';
  this.gtao?.dispose();this.bloom?.dispose();this.fxaa?.dispose();this.gtao=this.bloom=this.fxaa=undefined;this.composer?.dispose();
  this.sun.shadow.mapSize.set(ultra?4096:2048,ultra?4096:2048);this.sun.shadow.map?.dispose();this.sun.shadow.map=null;
  const target=new THREE.WebGLRenderTarget(width,height,{type:THREE.HalfFloatType,samples:ultra?4:0});
  this.composer=new EffectComposer(this.renderer,target);this.composer.setPixelRatio(1);this.composer.setSize(width,height);
  this.composer.addPass(new RenderPass(this.scene,this.camera));
  if(ultra){this.gtao=new GTAOPass(this.scene,this.camera,width,height);this.gtao.updateGtaoMaterial({radius:0.6,distanceExponent:1.5,thickness:1,scale:1.2,samples:16});this.gtao.blendIntensity=0.85;this.composer.addPass(this.gtao);}
  if(glow){this.bloom=new UnrealBloomPass(new THREE.Vector2(width/2,height/2),this.bloomStrength,0.6,0.92);this.composer.addPass(this.bloom);}
  this.composer.addPass(new OutputPass());
  this.composer.addPass(new ShaderPass(GRADE));
  if(this.quality==='high'){this.fxaa=new ShaderPass(FXAAShader);this.fxaa.material.uniforms.resolution.value.set(1/width,1/height);this.composer.addPass(this.fxaa);}
 }
 /** Daylight is needed at startup; the moonlit HDR is loaded only on entering a night area. */
 async loadSkies(key='ground'){
  const id=SKIES[key];if(!id)return;
  const existing=this.skyLoads.get(id);if(existing)return existing;
  const load=async()=>{
   const [hdr,bg]=await Promise.all([new RGBELoader().setDataType(THREE.FloatType).loadAsync(PH+id+'_2k.hdr'),id===SKIES.night?Promise.resolve(this.night??=nightSky()):new THREE.TextureLoader().loadAsync(PH+id+'_bg.jpg')]);
   // Sun = brightest texel of the HDR; rotate sky + light so the sun sits behind the camera's left shoulder (front light, no glare in view).
   const img=hdr.image as unknown as {data:Float32Array;width:number;height:number};let best=0,bi=0;for(let i=0;i<img.width*img.height;i++){const l=img.data[i*4]+img.data[i*4+1]+img.data[i*4+2];if(l>best){best=l;bi=i;}}
   const u=(bi%img.width+0.5)/img.width,v=(Math.floor(bi/img.width)+0.5)/img.height,lat=Math.max(0.35,Math.abs((0.5-v)*Math.PI)),lon=(u-0.5)*2*Math.PI;
   const rotation=Math.atan2(0.75,-0.55)-lon;const sunDir=new THREE.Vector3(Math.cos(lat)*Math.cos(lon+rotation),Math.sin(lat),Math.cos(lat)*Math.sin(lon+rotation)).normalize();
   hdr.mapping=THREE.EquirectangularReflectionMapping;const env=this.pmrem.fromEquirectangular(hdr).texture;hdr.dispose();
   if(id!==SKIES.night)bg.mapping=THREE.EquirectangularReflectionMapping;bg.colorSpace=THREE.SRGBColorSpace;bg.anisotropy=8;
   // Horizon colour seen behind the level (view direction -Z) for the fog that blends 3D terrain into the photograph.
   const c=document.createElement('canvas');c.width=64;c.height=32;const g=c.getContext('2d')!;g.drawImage(bg.image as CanvasImageSource,0,0,64,32);
   const viewU=(((Math.atan2(-1,0)-rotation)/(2*Math.PI)+0.5)%1+1)%1,px=g.getImageData(Math.floor(viewU*64),15,1,2).data;
   const horizon=new THREE.Color().setRGB(px[0]/255,px[1]/255,px[2]/255,THREE.SRGBColorSpace);
   const sky={env,bg,rotation,sunDir,horizon};
   for(const [theme,photo] of Object.entries(SKIES))if(photo===id)this.skies.set(theme,sky);
   // A deferred load must refresh the current theme, including above-cloud area overrides.
   if(SKIES[this.theme]===id){const current=this.theme;this.theme='';this.setTheme(current,current==='sky'?'sky':'');}
  };
  const pending=load().catch(e=>{console.warn('3d: sky',id,'unavailable, using painted sky',e);});
  this.skyLoads.set(id,pending);return pending;
 }
 setTheme(name:string,areaId=''){
  const key=areaId.includes('sky')?'sky':name;if(key===this.theme)return;this.theme=key;const t=THEMES[name]??THEMES.ground;
  if(SKIES[key]&&!this.skies.has(key))void this.loadSkies(key);
  const c=document.createElement('canvas');c.width=4;c.height=256;const g=c.getContext('2d')!,grad=g.createLinearGradient(0,0,0,256);
  grad.addColorStop(0,t.skyTop);grad.addColorStop(0.55,t.skyMid);grad.addColorStop(1,t.skyBottom);g.fillStyle=grad;g.fillRect(0,0,4,256);
  this.gradient?.dispose();const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;this.sky=this.gradient=tex;this.fog=new THREE.Fog(t.fog,t.fogNear,t.fogFar);this.applyBlackout();
  this.sun.color.setHex(t.sun);this.sun.intensity=t.sunI;
  this.hemi.color.setHex(t.hemiSky);this.hemi.groundColor.setHex(t.hemiGround);this.hemi.intensity=t.hemiI;this.scene.environmentIntensity=t.env;this.bloomStrength=t.bloom;if(this.bloom)this.bloom.strength=t.bloom;
  const sky=this.skies.get(key)??(name==='underground'||name==='castle'||name==='water'?undefined:undefined);
  const lightSky=sky??this.skies.get('ground');
  this.scene.environment=lightSky?.env??this.fallbackEnv;this.scene.environmentRotation.set(0,lightSky?.rotation??0,0);
  if(sky){this.sky=sky.bg;this.scene.backgroundRotation.set(0,sky.rotation,0);this.scene.backgroundIntensity=1.0;this.fog=new THREE.Fog(sky.horizon,45,400);this.sunDir.copy(sky.sunDir);  // fog = aerial perspective: distant ridges fade into the sky
   this.hemi.intensity=0.15;this.scene.environmentIntensity=1.3;this.sun.intensity=key==='sky'?3.4:key==='snow'?2.6:3.0;this.sun.color.setHex(0xfff1e0);
   if(key==='snow')this.fog=new THREE.Fog(sky.horizon,70,560);  // crisp winter air
   if(key==='sky'){  // above the clouds: painted azure sky, light-blue haze over the cloud sea, blue fill so cloud undersides read as volume
    this.sky=this.cloud??=cloudSky();this.fog=new THREE.Fog(0xd6e9fb,25,230);this.sun.intensity=2.2;this.hemi.color.setHex(0xa8d0ff);this.hemi.groundColor.setHex(0x5a74a8);this.hemi.intensity=0.7;this.scene.environmentIntensity=0.7;}
   if(key==='night'){  // moonlit fantasy night: painted starry sky, cool moonlight, blue fill so nothing sinks to black
    this.sky=this.night??=nightSky();this.fog=new THREE.Fog(0x2a2f6e,40,330);this.sunDir.set(-0.5,0.7,0.5).normalize();
    this.sun.color.setHex(0xc4d4ff);this.sun.intensity=1.7;this.hemi.color.setHex(0x6c84e0);this.hemi.groundColor.setHex(0x1c2440);this.hemi.intensity=0.55;this.scene.environmentIntensity=0.35;}}
  else{this.sunDir.set(-0.45,0.75,0.5).normalize();if(lightSky)this.scene.environmentIntensity=t.env*0.6;}
  this.applyBlackout();
 }
 /** Full-black transition screens (intro, game over, pipe loading): sky and fog off. */
 setBlackout(on:boolean){if(on===this.black)return;this.black=on;this.applyBlackout();}
 private applyBlackout(){this.scene.background=this.black?new THREE.Color(0x000000):this.sky;this.scene.fog=this.black?null:this.fog;}
 /** Follows the simulation camera: camPx is the left edge of the 256 px window. */
 place(camPx:number){
  const cx=(camPx+128)/16;this.camera.position.set(cx,TARGET_Y+DIST*Math.sin(PITCH),DIST*Math.cos(PITCH));this.camera.lookAt(cx,TARGET_Y,0);
  // Shadow camera follows in whole-texel steps so shadows do not shimmer while scrolling.
  const texel=26/this.sun.shadow.mapSize.x,sx=Math.round(cx/texel)*texel;
  this.sun.target.position.set(sx,4,0);this.sun.position.copy(this.sun.target.position).addScaledVector(this.sunDir,40);this.sun.target.updateMatrixWorld();
 }
 /** Changes the internal render resolution (all post passes follow the composer). */
 resize(width:number,height:number){this.renderer.setSize(width,height,false);this.composer.setSize(width,height);this.bloom?.resolution.set(width/2,height/2);this.fxaa?.material.uniforms.resolution.value.set(1/width,1/height);}
 render(){this.composer.render();}
}
