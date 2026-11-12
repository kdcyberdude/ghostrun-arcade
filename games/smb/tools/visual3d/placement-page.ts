// In-page half of tools/visual3d/placement.ts (loaded into the ?view=3d dev page with a dynamic import; never part of the game bundle).
// Draws the live simulation once more with the ORIGINAL 2D renderer on an offscreen canvas, recording what it draws (tile ids per cell, sprite rects per
// object), and reads back what the 3D renderer drew (tile instances per cell, visible actors / props projected to NES screen pixels). The comparison itself
// is pure (placement-match.ts) so it is unit-tested without a browser.
import * as THREE from 'three';
import {GameRenderer} from '../../src/renderer.js';
import {FLAG_COMPLETION,type Simulation} from '../../src/simulation.js';
import {enemyPicture} from '../../src/enemy-picture.js';
import {platformMotionModel,nativePlatformArtworkYs} from '../../src/platform-motion.js';
import {compareFrame,pieceModels,type Obj,type Cell,type FrameReport} from './placement-match.js';
import {titleBootColor} from '../../src/view-rules.js';
import {ENEMY_MODEL} from '../../src/render3d/entities.js';
import {PIECES} from '../../src/render3d/semantics.js';
type Any=any;  // eslint-disable-line @typescript-eslint/no-explicit-any
interface Rect{x:number;y:number;w:number;h:number}
const union=(rs:Rect[]):Rect|undefined=>{if(!rs.length)return undefined;const x0=Math.min(...rs.map(r=>r.x)),y0=Math.min(...rs.map(r=>r.y)),x1=Math.max(...rs.map(r=>r.x+r.w)),y1=Math.max(...rs.map(r=>r.y+r.h));return {x:x0,y:y0,w:x1-x0,h:y1-y0};};
const hit=(a:Rect,b:Rect,pad=2)=>a.x<b.x+b.w+pad&&b.x<a.x+a.w+pad&&a.y<b.y+b.h+pad&&b.y<a.y+a.h+pad;

let r2:Any;
export async function setup(){
 r2=new GameRenderer(document.createElement('canvas'));await r2.load();
}
/** Everything the 2D renderer draws this frame: tiles (cell + id) and sprite quads tagged with the object being drawn. */
function draw2d(s:Simulation){
 const quads:{tag:string;r:Rect;z:number}[]=[],tiles:{id:number;x:number;y:number;z:number;tag:string}[]=[];let tag='misc';
 const q0=r2.quad,t0=r2.tile,p0=r2.player,e0=r2.enemy,i0=r2.item,c0=r2.castlePriorityTile,txt=r2.text,hud=r2.hud,cr=r2.castleRescue;
 r2.quad=function(name:string,rect:number[],x:number,y:number,z=0,fx=false,fy=false,sprite=true){if(sprite&&tag!=='skip')quads.push({tag,r:{x:Math.floor(x),y:Math.floor(y),w:rect[2],h:rect[3]},z});return q0.call(this,name,rect,x,y,z,fx,fy,sprite);};
 r2.tile=function(id:number,x:number,y:number,palette:number,z=0){tiles.push({id,x,y,z,tag});return t0.call(this,id,x,y,palette,z);};
 r2.castlePriorityTile=function(id:number,x:number,y:number,p:number){tiles.push({id,x,y,z:0,tag});return c0.call(this,id,x,y,p);};
 r2.player=function(ss:Simulation){tag='player';const r=p0.call(this,ss);tag='misc';return r;};
 r2.enemy=function(e:Any,ss:Simulation){tag='enemy#'+ss.enemies.indexOf(e);const r=e0.call(this,e,ss);tag='misc';return r;};
 if(i0)r2.item=function(it:Any,ss:Simulation){tag='item#'+ss.items.indexOf(it);const r=i0.call(this,it,ss);tag='misc';return r;};
 r2.text=function(...a:Any[]){const t=tag;tag='skip';const r=txt.apply(this,a);tag=t;return r;};
 r2.hud=function(...a:Any[]){const t=tag;tag='skip';const r=hud.apply(this,a);tag=t;return r;};
 r2.castleRescue=function(...a:Any[]){tag='retainer';const r=cr.apply(this,a);tag='misc';return r;};
 try{r2.render(s);}finally{for(const k of ['quad','tile','player','enemy','item','castlePriorityTile','text','hud','castleRescue'])delete r2[k];}
 return {quads,tiles};
}
/** Sim objects with the rect the 2D renderer drew for each (union of its quads). */
function objects2d(s:Simulation,quads:{tag:string;r:Rect;z:number}[]):Obj[]{
 const cam=Math.floor(s.camera),out:Obj[]=[],misc=quads.filter(q=>q.tag==='misc'&&q.z!==2.5);  // z 2.5 = score popups (HUD text in 3D)
 const near=(r:Rect)=>union(misc.filter(q=>hit(q.r,r)).map(q=>q.r));
 const exact=(x:number,y:number)=>union(misc.filter(q=>q.r.x===Math.floor(x)&&q.r.y===Math.floor(y)).map(q=>q.r));
 const pr=union(quads.filter(q=>q.tag==='player').map(q=>q.r));if(pr)out.push({id:'player',kind:'player',...pr});
 s.enemies.forEach((physical,i)=>{const e=enemyPicture(physical),r=union(quads.filter(q=>q.tag==='enemy#'+i).map(q=>q.r));if(r)out.push({id:'enemy#'+i,kind:e.kind,state:e.shell?'shell':e.kind==='spiny'&&e.motion==='falling'&&!e.dead?'egg':e.kind==='podoboo'?(e.podobooFalling?'falling':'rising'):e.greenShellLaunchFrame!==undefined?'flipped':e.squashed||e.kind==='goomba'&&e.dead>0&&e.dead<20?'squashed':e.kind==='bowser'?(e.dead>0&&!s.castleBowserFalls(e)?'flipped':'normal'):e.dead>20?'flipped':'normal',...r});});
 s.items.forEach((it,i)=>{const r=typeof r2.item==='function'?union(quads.filter(q=>q.tag==='item#'+i&&q.z!==2.5).map(q=>q.r)):near({x:it.x-cam,y:it.y,w:it.kind==='debris'?8:16,h:16});if(r)out.push({id:'item#'+i,kind:it.kind,...r});});
 (s.area.platforms??[]).forEach((pl,i)=>{const p=s.platformPicturePosition(pl),context={levelId:s.level.id,areaId:s.area.id},ys=nativePlatformArtworkYs(pl,context,p.y);
  ys.forEach((y,copy)=>{const cloud=platformMotionModel(pl,context)==='contact-cloud',r=cloud?near({x:p.x-cam,y,w:pl.width,h:8}):union(misc.filter(q=>q.r.y===Math.floor(y)&&q.r.w===8&&q.r.h<=8&&q.r.x>=Math.floor(p.x-cam)&&q.r.x<Math.floor(p.x-cam)+pl.width).map(q=>q.r));if(r)out.push({id:`platform#${i}.${copy}`,kind:platformMotionModel(pl,context)==='contact-cloud'?'cloud':'lift',...r});});
 });
 (s.area.firebars??[]).forEach((bar,i)=>s.firebarCenters(bar).forEach(({x,y},k)=>{const r=exact(x-4-cam,y-4+(bar.visualOffsetY??0));if(r)out.push({id:`fire#${i}.${k}`,kind:'fire',...r});}));
 (s.area.springs??[]).forEach((sp,i)=>{const r=near({x:sp.x-cam,y:sp.y-23,w:16,h:24});if(r)out.push({id:'spring#'+i,kind:'spring',...r});});
 const exit=s.area.exit;if(exit?.kind==='flag'){const r=near({x:exit.x-16-cam,y:s.phase==='flag'?s.flagTop:FLAG_COMPLETION.flagTopY,w:16,h:16});if(r)out.push({id:'flag',kind:'flag',...r});}
 if(s.phase==='flag'){
  if(s.castleFlag){const f=s.castleFlag,r=exact(f.x-cam,f.y);if(r)out.push({id:'castleFlag',kind:'castleFlag',...r});}
  s.flagFireworks.forEach((f,i)=>{const r=exact(f.x-cam,f.y);if(r)out.push({id:'spark#'+i,kind:'spark',...r});});
 }
 const rt=union(quads.filter(q=>q.tag==='retainer').map(q=>q.r));if(rt)out.push({id:'retainer',kind:'retainer',state:s.level.id==='8-4'?'princess':'toad',...rt});
 return out;
}
/** Visible 3D gameplay objects, each with its projected NES-pixel rect. */
function objects3d(r3:Any):Obj[]{
 const cam:THREE.Camera=r3.atmosphere.camera,box=new THREE.Box3(),v=new THREE.Vector3(),out:Obj[]=[];
 cam.updateMatrixWorld();r3.atmosphere.scene.updateMatrixWorld(true);
 const project=(o:THREE.Object3D):Rect|undefined=>{
  box.makeEmpty();o.traverseVisible(c=>{const m=c as Any;if(!m.isMesh||(Array.isArray(m.material)?m.material:[m.material]).every((material:THREE.Material)=>!material.visible))return;if(m.isSkinnedMesh)m.boundingBox=null;box.expandByObject(m,false);});
  if(box.isEmpty())return undefined;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let i=0;i<8;i++){v.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(cam);const x=(v.x+1)/2*256,y=(1-v.y)/2*240;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
 };
 const enemyModels=new Set(Object.values(ENEMY_MODEL));
 const state=(kind:string,o:THREE.Object3D)=>kind==='toad'||kind==='princess'?kind:kind.endsWith('_shell')?'shell':kind==='espinyEgg'?'egg':kind==='podoboo'?(o.rotation.z?'falling':'rising'):enemyModels.has(kind)?(kind==='goomba'&&o.scale.y<1?'squashed':o.rotation.z?'flipped':'normal'):undefined;
 const add=(kind:string,o:THREE.Object3D|undefined,i:number)=>{if(!o?.visible)return;const r=project(o);if(r)out.push({id:`${kind}@${i}`,kind,state:state(kind,o),...r});};
 const e=r3.entities;
 if(e.mario)add('player',e.mario.root,0);
 for(const [name,pool] of e.pools as Map<string,Any>)(pool.items as Any[]).forEach((a,i)=>add(name,a.root,i));
 for(const [key,list] of e.cache as Map<string,THREE.Mesh[]>)list.forEach((m,i)=>add(key,m,i));
 (e.coins as THREE.Mesh[]).forEach((m,i)=>add('coin',m,i));
 for(const [key,list] of r3.props.pools as Map<string,THREE.Object3D[]>)list.forEach((o,i)=>add(key.replace(/[\d.]+$/,''),o,i));
 if(r3.world.flag.visible&&r3.world.group.visible)add('flag',r3.world.flag,0);
 return out;
}
/** Tiles the 3D world drew this frame, by the pool model name, recorded by re-running World.sync with a logging pool(). */
function cells3d(r3:Any,s:Simulation){
 const w=r3.world,orig=w.pool,log:{name:string;x:number;y:number}[]=[];
 w.pool=function(name:string,theme:string){const p=orig.call(this,name,theme);return {add:(m:THREE.Matrix4)=>{log.push({name,x:m.elements[12],y:m.elements[13]});return p.add(m);}};};
 try{w.sync(s,Math.floor(s.camera));}finally{delete w.pool;}
 return log;
}
/** One audit of the current frame (call after the page has drawn it). */
export function audit():FrameReport{
 const win=window as Any,s:Simulation=win.marioDebug.simulation,r3=win.render3d,cam=Math.floor(s.camera);
 const {quads,tiles}=draw2d(s);
 const t2:Cell[]=tiles.filter(t=>t.z!==2).map(t=>({col:Math.round((t.x+cam)/16),row:Math.round(t.y/16),id:t.id}));
 // Debris is a tile-sheet sprite in 2D (z 2): it is an object, not terrain.
 const debris=tiles.filter(t=>t.z===2);
 const o2=objects2d(s,quads.concat(debris.map(t=>({tag:t.tag,r:{x:t.x,y:t.y,w:8,h:8},z:2}))));
 const black=['intro','gameover'].includes(s.phase)||s.pipeLoading||s.pipeClearing||(s.phase==='title'&&!!titleBootColor(s.titleFrame));
 const t3=black?[]:cells3d(r3,s),o3=black?[]:objects3d(r3);
 return compareFrame({theme:s.area.theme,camera:cam,tiles2d:t2,tiles3d:t3,objects2d:o2,objects3d:o3,pieceModel:pieceModels(PIECES)});
}
(window as Any).placement={setup,audit};
