// Tile layer: every frame the visible tiles of the live simulation map are written into instanced pools (blocks, pipes, castle), so broken bricks, bumps and
// used blocks follow the simulation exactly. Static scenery/pole come from the area layout and are rebuilt when the area changes.
import * as THREE from 'three';
import type {Simulation} from '../simulation.js';
import {Kit,type Part} from './kit.js';
import {procBlock,procPipe,procCoin,procDeco,LIQUIDS} from './proc.js';
import {kindOf,kindIn,isPipeTop,isPipeBody,PIECES} from './semantics.js';
import {analyseArea} from './layout.js';
import {buildStatics,disposeGroup} from './scenery.js';
import {buildBackdrop,type LightSpot} from './backdrop.js';
import {photoBackdrop} from './nature.js';
import {FLAG_COMPLETION} from '../simulation.js';
import {makeFlag,waveFlag} from './flag.js';
class Pool{
 private meshes:THREE.InstancedMesh[]=[];private n=0;private tmp=new THREE.Matrix4();
 constructor(private parts:Part[],private cap:number,group:THREE.Group,varied=false){
  for(const p of parts){if(varied)vary(p.material);const m=new THREE.InstancedMesh(p.geometry,p.material,cap);m.castShadow=m.receiveShadow=true;m.frustumCulled=false;m.count=0;group.add(m);this.meshes.push(m);}
 }
 begin(){this.n=0;}
 add(m:THREE.Matrix4){if(this.n>=this.cap)return;for(let i=0;i<this.parts.length;i++)this.meshes[i].setMatrixAt(this.n,this.tmp.multiplyMatrices(m,this.parts[i].matrix));this.n++;}
 end(){for(const m of this.meshes){m.count=this.n;m.instanceMatrix.needsUpdate=true;}}
}
/** Per-block variety for stone/soil/brick pieces, so walls of identical blocks stop looking copy-pasted: from the block's TILE cell (stable while a brick
 * bumps) each instance gets a mirror of its texture in u and/or v and a small brightness/warmth shift. UV mirroring is safe for the normal map: without
 * a tangent attribute three.js derives the tangent frame from the UV derivatives. Render-only; one shader variant per material. */
const VARY=/^(block_(ground|brick|hard|wall)|castle_(brick|crenel|dark))/;
function vary(material:THREE.Material){
 const m=material as THREE.MeshStandardMaterial;if(m.userData.varied)return;m.userData.varied=true;
 m.onBeforeCompile=sh=>{
  sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vVary;').replace('#include <uv_vertex>',`#include <uv_vertex>
#ifdef USE_INSTANCING
 vec2 cell=floor(instanceMatrix[3].xy);
 vVary=fract(sin(vec3(dot(cell,vec2(127.1,311.7)),dot(cell,vec2(269.5,183.3)),dot(cell,vec2(419.2,371.9))))*43758.5453);
 vec2 fl=step(0.5,vVary.xy);
 #ifdef USE_MAP
 vMapUv=mix(vMapUv,1.0-vMapUv,fl);
 #endif
 #ifdef USE_NORMALMAP
 vNormalMapUv=mix(vNormalMapUv,1.0-vNormalMapUv,fl);
 #endif
 #ifdef USE_ROUGHNESSMAP
 vRoughnessMapUv=mix(vRoughnessMapUv,1.0-vRoughnessMapUv,fl);
 #endif
 #ifdef USE_METALNESSMAP
 vMetalnessMapUv=mix(vMetalnessMapUv,1.0-vMetalnessMapUv,fl);
 #endif
 #ifdef USE_AOMAP
 vAoMapUv=mix(vAoMapUv,1.0-vAoMapUv,fl);
 #endif
#else
 vVary=vec3(0.5);
#endif`);
  sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vVary;').replace('#include <map_fragment>',
   '#include <map_fragment>\n diffuseColor.rgb*=(0.9+0.18*vVary.z)*mix(vec3(0.97,0.99,1.04),vec3(1.05,0.99,0.92),fract(vVary.x*7.0+vVary.y*3.0));');
 };
 m.customProgramCacheKey=()=>'vary';m.needsUpdate=true;
}
export const TILE_MODELS=['block_ground','block_ground_top','block_brick','block_question','block_used','block_hard','block_wall','pipe_top','pipe_body','castle_brick','castle_crenel','castle_dark'];
const PHOTO_THEMES=new Set(['ground','snow','night']);const GRASS_THEMES=new Set(['ground','night','snow']);const SOLIDISH=new Set(['ground','wall','hard','brick','question','used','pipe','castle']);
/** Castle pipes are grey in the original palette: same pipe model, its green albedo turned to light steel grey. */
function castlePipe(m:THREE.Material){const c=m.clone() as THREE.MeshStandardMaterial;
 c.onBeforeCompile=sh=>{sh.fragmentShader=sh.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb=vec3(dot(diffuseColor.rgb,vec3(0.299,0.587,0.114)))*vec3(3.4,3.45,3.6);');};
 c.customProgramCacheKey=()=>'castle-pipe';return c;}
const VARIANT:Record<string,string>={underground:'_ug',castle:'_castle',water:'_water',snow:'_snow'};
export class World{
 readonly group=new THREE.Group();private pools=new Map<string,Pool>();private area?:object;private statics?:THREE.Group;
 readonly unmapped=new Set<number>();private m=new THREE.Matrix4();
 private flag=makeFlag();private spots:LightSpot[]=[];
 /** A few point lights re-aimed every frame at the torches / crystals nearest the camera (only visible in cave and castle areas). */
 private lamps=Array.from({length:6},()=>{const l=new THREE.PointLight(0xffffff,0,14,2);l.visible=false;return l;});
 constructor(private kit:Kit){this.group.add(this.flag,...this.lamps);}
 private fallback(name:string,theme:string):Part[]{
  const deco=procDeco(name,theme);if(deco)return deco;
  if(name==='coin_tile')return procCoin();
  if(name==='pipe_top')return procPipe(true);if(name==='pipe_body')return procPipe(false);
  const base=name.replace(/^block_/,'').replace(/^castle_/,'');
  return procBlock(name.startsWith('castle_')?(name==='castle_dark'?'used':'castle'):base)??procBlock('hard')!;
 }
 private pool(name:string,theme:string){
  const v=VARIANT[theme]??'',want=v&&this.kit.has(name+v)?name+v:name,greyPipe=theme==='castle'&&name.startsWith('pipe_');
  const key=name.startsWith('liquid')?want+'@'+(theme==='castle'?'lava':'water'):greyPipe?want+'@castle':want;let p=this.pools.get(key);
  if(!p){let parts=this.kit.parts(want)??this.fallback(name,theme);if(greyPipe)parts=parts.map(q=>({...q,material:castlePipe(q.material)}));
   p=new Pool(parts,want.startsWith('pipe_body')?600:900,this.group,VARY.test(want));this.pools.set(key,p);}
  return p;
 }
 private light(camPx:number,frame:number){
  const cx=(camPx+128)/16,near=this.spots.filter(p=>Math.abs(p.x-cx)<14).sort((a,b)=>Math.abs(a.x-cx)-Math.abs(b.x-cx));
  this.lamps.forEach((l,i)=>{const p=near[i];l.visible=this.spots.length>0;if(!p){l.intensity=0;return;}
   const torch=p.color===0xff9a40,f=torch?0.82+0.1*Math.sin(frame*0.31+p.x*3.1)+0.08*Math.sin(frame*0.83+p.x):0.85+0.15*Math.sin(frame*0.05+p.x);
   l.position.set(p.x,p.y,p.z);l.color.setHex(p.color);l.intensity=p.power*f;});
 }
 sync(s:Simulation,camPx:number){
  if(this.area!==s.area){
   this.area=s.area;if(this.statics){this.group.remove(this.statics);disposeGroup(this.statics);}
   const photo=PHOTO_THEMES.has(s.area.theme)&&!s.area.id.includes('sky')&&this.kit.has('veg_shrub_02');
   this.statics=buildStatics(analyseArea(s.area),s.area.theme,photo?this.kit:undefined);const wallPart=this.kit.parts(s.area.theme==='castle'?'block_wall_castle':'block_ground_ug')?.[0];const bd=photo?photoBackdrop(this.kit,s.area.theme,-40,s.area.width/16+60):buildBackdrop(s.area.theme,s.area.width,wallPart?.material as THREE.MeshStandardMaterial|undefined,s.area.id);this.statics.add(bd);this.group.add(this.statics);
   this.spots=(bd.userData.lights as LightSpot[]|undefined)??[];
  }
  const theme=s.area.theme;for(const p of this.pools.values())p.begin();
  const c0=Math.floor(camPx/16)-2,c1=c0+21;
  for(let col=c0;col<=c1;col++)for(let row=2;row<15;row++){
   const id=s.tiles.get(`${col},${row}`);if(id===undefined)continue;
   const kind=kindIn(id,theme),key=`${col},${row}`,age=s.bump.get(key),bump=age!==undefined&&!s.usedBlockRehits.has(key)?Math.sin(age/16*Math.PI)*0.25:0;
   const put=(name:string,x:number,y:number,dz=0)=>this.pool(name,theme).add(this.m.makeTranslation(x,y,dz));
   switch(kind){
    case 'ground':{const above=kindOf(s.tiles.get(`${col},${row-1}`)??0);put(GRASS_THEMES.has(theme)&&!SOLIDISH.has(above)?'block_ground_top':'block_ground',col+0.5,14.5-row);break;}
    case 'wall':put('block_wall',col+0.5,14.5-row);break;
    case 'brick':put('block_brick',col+0.5,14.5-row+bump);break;
    case 'question':put('block_question',col+0.5,14.5-row+bump);break;
    case 'used':put('block_used',col+0.5,14.5-row+bump);break;
    case 'hard':put('block_hard',col+0.5,14.5-row);break;
    case 'castle':put(id===71?'castle_brick':id===69||id===73?'castle_crenel':'castle_dark',col+0.5,14.5-row);break;
    case 'pipe':
     // Per tile, so shafts without a cap (pipes reaching the ceiling) are drawn too.
     if(isPipeTop(id))put('pipe_top',col+1,14.5-row);else if(isPipeBody(id))put('pipe_body',col+1,14.5-row);
     break;
    case 'sidePipe':
     // Upper-row tiles carry the 2-tall horizontal piece; rotated so the lip faces left (-X).
     if(id===28||id===29||id===30||id===107)this.pool(id===28||id===107?'pipe_top':'pipe_body',theme).add(this.m.makeRotationZ(Math.PI/2).setPosition(col+0.5,14-row,0));
     break;
    case 'coin':this.pool('coin_tile',theme).add(this.m.makeRotationY(s.frame*0.06).setPosition(col+0.5,14.5-row,0));break;
    case 'piece':{const pc=PIECES[id];put(pc.model,col+0.5,14.5-row,pc.dz??0);break;}
    // Tile 37 is also the pulley-lift rope: only a column topped by a flag ball is the flagpole (drawn by the flag prop).
    case 'flagPole':{let ball=false;for(let r=0;r<15&&!ball;r++)ball=s.tiles.get(`${col},${r}`)===36;if(!ball)put('rope_v',col+0.5,14.5-row,-0.3);break;}
    case 'other':this.unmapped.add(id);break;
    default:break;
   }
  }
  for(const p of this.pools.values())p.end();
  this.light(camPx,s.frame);
  LIQUIDS.lava.emissiveIntensity=0.85+0.2*Math.sin(s.frame*0.07);if(LIQUIDS.lava.map){LIQUIDS.lava.map.offset.set(s.frame*0.0011,s.frame*0.0004);}LIQUIDS.water.opacity=0.62+0.05*Math.sin(s.frame*0.05);
  const exit=s.area.exit;this.flag.visible=exit?.kind==='flag';
  if(exit?.kind==='flag'){const top=s.phase==='flag'?s.flagTop:FLAG_COMPLETION.flagTopY;this.flag.position.set((exit.x-8)/16,(232-top)/16,0.05);waveFlag(this.flag,s.frame);}
 }
}
