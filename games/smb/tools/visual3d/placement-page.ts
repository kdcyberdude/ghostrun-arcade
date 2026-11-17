// In-page half of tools/visual3d/placement.ts (loaded into the ?view=3d dev page with a dynamic import; never part of the game bundle).
// Draws the live simulation once more with the ORIGINAL 2D renderer on an offscreen canvas, recording what it draws (tile ids per cell, sprite rects per
// object), and reads back what the 3D renderer drew (tile instances per cell, visible actors / props projected to NES screen pixels). The comparison itself
// is pure (placement-match.ts) so it is unit-tested without a browser.
import * as THREE from 'three';
import {GameRenderer} from '../../src/renderer.js';
import {type Simulation} from '../../src/simulation.js';
import {nativeFlagSprites} from '../../src/native-flag-picture.js';
import {enemyPicture} from '../../src/enemy-picture.js';
import {platformMotionModel,nativePlatformArtworkYs} from '../../src/platform-motion.js';
import {renderEquivalenceSnapshot} from './equivalence-snapshot.js';
import {sceneState,visiblePixels} from './visibility-pass.js';
import {compareFrame,family,pieceModels,cells3d as cellsOf,type Obj,type Cell,type FrameReport,type Look} from './placement-match.js';
import {kindIn} from '../../src/render3d/semantics.js';
import nesPalette from '../../assets/nes-rgb-palette.json';
import {nativeBubbleShown} from '../../src/view-rules.js';
import {nativeBlockSprites} from '../../src/native-block-picture.js';
import {ENEMY_MODEL} from '../../src/render3d/entities.js';
import {PIECES} from '../../src/render3d/semantics.js';
import popupAssemblies from '../../data/popup-assemblies.json';
type Any=any;  // eslint-disable-line @typescript-eslint/no-explicit-any
interface Rect{x:number;y:number;w:number;h:number;draws?:number[]}
const union=(rs:Rect[]):Rect|undefined=>{if(!rs.length)return undefined;const x0=Math.min(...rs.map(r=>r.x)),y0=Math.min(...rs.map(r=>r.y)),x1=Math.max(...rs.map(r=>r.x+r.w)),y1=Math.max(...rs.map(r=>r.y+r.h));return {x:x0,y:y0,w:x1-x0,h:y1-y0,draws:rs.flatMap(r=>r.draws??[])};};
const hit=(a:Rect,b:Rect,pad=2)=>a.x<b.x+b.w+pad&&b.x<a.x+a.w+pad&&a.y<b.y+b.h+pad&&b.y<a.y+a.h+pad;

let r2:Any;
const opaqueRects=new Map<string,Rect|null>();
/** Bounds of the source sprite's nontransparent pixels, not the padded8px/24px CHR container. */
function opaqueRect(name:string,rect:number[],x:number,y:number,flipX:boolean,flipY:boolean):Rect|undefined{
 const key=name+':'+rect.join(',');let bounds=opaqueRects.get(key);
 if(bounds===undefined){const canvas=document.createElement('canvas');canvas.width=rect[2];canvas.height=rect[3];const context=canvas.getContext('2d')!;context.drawImage(r2.textures.get(name).image,rect[0],rect[1],rect[2],rect[3],0,0,rect[2],rect[3]);const pixels=context.getImageData(0,0,rect[2],rect[3]).data;let x0=rect[2],y0=rect[3],x1=-1,y1=-1;for(let yy=0;yy<rect[3];yy++)for(let xx=0;xx<rect[2];xx++)if(pixels[(yy*rect[2]+xx)*4+3]>=128){x0=Math.min(x0,xx);y0=Math.min(y0,yy);x1=Math.max(x1,xx);y1=Math.max(y1,yy);}bounds=x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};opaqueRects.set(key,bounds);}
 if(!bounds)return;return {x:Math.floor(x)+(flipX?rect[2]-bounds.x-bounds.w:bounds.x),y:Math.floor(y)+(flipY?rect[3]-bounds.y-bounds.h:bounds.y),w:bounds.w,h:bounds.h};
}
export async function setup(){
 r2=new GameRenderer(document.createElement('canvas'));await r2.load();
}
/** Everything the 2D renderer draws this frame: tiles (cell + id) and sprite quads tagged with the object being drawn. */
type Draw2d={quads:{tag:string;r:Rect;source?:Rect;z:number;chr?:number;sourceName?:string;hidden?:boolean}[];draws:{id:number;tag:string;r:Rect;z:number;sprite:boolean;mesh:THREE.Object3D}[];tiles:{id:number;x:number;y:number;z:number;tag:string;palette?:number}[];camera?:number};
function draw2d(s:Simulation):Draw2d{
 const quads:{tag:string;r:Rect;source?:Rect;z:number;chr?:number;sourceName?:string;hidden?:boolean}[]=[],draws:{id:number;tag:string;r:Rect;z:number;sprite:boolean;mesh:THREE.Object3D}[]=[],tiles:{id:number;x:number;y:number;z:number;tag:string}[]=[];let tag='misc',drawId=0;
 const q0=r2.quad,t0=r2.tile,p0=r2.player,e0=r2.enemy,i0=r2.item,c0=r2.castlePriorityTile,txt=r2.text,hud=r2.hud,cr=r2.castleRescue;
 let depth=0;
 r2.quad=function(name:string,rect:number[],x:number,y:number,z=0,fx=false,fy=false,sprite=true){
  // Balance lift ropes are drawn as background tile quads (162/163) per 8-pixel row: recorded as rope cells (tile 64) like map rope tiles.
  if(!sprite&&name.startsWith('background-tiles-')&&rect[0]===16&&rect[1]===80&&depth===0)tiles.push({id:64,x:Math.floor(x),y:Math.floor(y/16)*16,z:0,tag});
  const id=drawId++,q={tag,r:opaqueRect(name,rect,x,y,fx,fy)??{x:Math.floor(x),y:Math.floor(y),w:0,h:0},source:{x:Math.floor(x),y:Math.floor(y),w:rect[2],h:rect[3]},z,sourceName:name,chr:name.startsWith('sprite-tiles-')?rect[1]/8*16+rect[0]/8:undefined};q.r.draws=[id];
  const start=quads.length,before=this.scene.children.length,masked=Boolean(this.oamContext&&this.oamRows);let result;depth++;try{result=q0.call(this,name,rect,x,y,z,fx,fy,sprite);}finally{depth--;}
  // The OAM row mask draws a partly hidden tile as strips (nested calls): it stays one whole quad, as the 3D view need not copy the NES sprite hardware.
  const drawn=this.scene.children.length>before,strips=quads.splice(start);if(strips.length)q.r.draws=[id,...strips.flatMap(p=>p.r.draws??[])];
  // Not drawn under an OAM context: hidden by the NES sprite hardware (8 per line, cycling), which the 3D view need not copy.
  if((drawn||masked&&depth===0)&&sprite&&tag!=='skip'&&q.r.w&&q.r.h)quads.push(drawn?q:{...q,hidden:true});
  if(drawn)draws.push({id,tag,r:q.r,z,sprite,mesh:this.scene.children.at(-1)});return result;
 };
 r2.tile=function(id:number,x:number,y:number,palette:number,z=0){tiles.push({id,x,y,z,tag,palette});return t0.call(this,id,x,y,palette,z);};
 r2.castlePriorityTile=function(id:number,x:number,y:number,p:number){tiles.push({id,x,y,z:0,tag});const t=tag;tag='skip';try{return c0.call(this,id,x,y,p);}finally{tag=t;}}; // background repainted over a behind-background sprite: not part of the object
 r2.player=function(ss:Simulation){tag='player';const r=p0.call(this,ss);tag='misc';return r;};
 r2.enemy=function(e:Any,ss:Simulation){tag='enemy#'+ss.enemies.indexOf(e);const r=e0.call(this,e,ss);tag='misc';return r;};
 if(i0)r2.item=function(it:Any,ss:Simulation){tag='item#'+ss.items.indexOf(it);const r=i0.call(this,it,ss);tag='misc';return r;};
 r2.text=function(...a:Any[]){const t=tag;tag='skip';const r=txt.apply(this,a);tag=t;return r;};
 r2.hud=function(...a:Any[]){const t=tag;tag='skip';const r=hud.apply(this,a);tag=t;return r;};
 r2.castleRescue=function(...a:Any[]){tag='retainer';const r=cr.apply(this,a);tag='misc';return r;};
 try{r2.render(s);}finally{for(const k of ['quad','tile','player','enemy','item','castlePriorityTile','text','hud','castleRescue'])delete r2[k];}
 // After a castle victory the 2D renderer re-shows its held castle picture without drawing (retainer removed): audit that held picture.
 if(!quads.length&&!tiles.length&&r2.castleHeld&&s.phase==='intro'&&lastDraw)return {...lastDraw,quads:lastDraw.quads.filter(q=>q.tag!=='retainer')};
 // A block write-back keeps the cell's original palette group and is then drawn as four background tile quads, not a metatile: record its cell.
 const cam=Math.floor(s.camera);
 if(tiles.length)for(const [key,id] of s.blockBackground){const original=r2.originalTiles.get(key);if(id===null||original===undefined||original>>6===id>>6)continue;const [col,row]=key.split(',').map(Number);tiles.push({id,x:col*16-cam,y:row*16,z:0,tag:'misc'});}
 return lastDraw={quads,tiles,draws,camera:cam};
}
let lastDraw:Draw2d|undefined;
/** The sprite palette most of an object's quads were drawn with (its colour variant: red/green Koopa, grey/red Cheep Cheep...). */
function spritePalette(quads:{sourceName?:string}[]){const n=new Map<string,number>();for(const q of quads){const m=/^sprite-tiles-(.+)\.png$/.exec(q.sourceName??'');if(m)n.set(m[1],(n.get(m[1])??0)+1);}return [...n].sort((a,b)=>b[1]-a[1])[0]?.[0];}
/** Sim objects with the rect the 2D renderer drew for each (union of its quads). */
function objects2d(s:Simulation,all:{tag:string;r:Rect;source?:Rect;z:number;chr?:number;sourceName?:string;hidden?:boolean}[]):Obj[]{
 // Tiles the NES sprite hardware hid (8 per line, OAM cycling) still place their object; an object with every tile hidden is marked oamHidden.
 const quads=all,allHidden=(list:{hidden?:boolean}[])=>list.length>0&&list.every(q=>q.hidden)||undefined;
 const cam=Math.floor(s.camera),out:Obj[]=[],misc=quads.filter(q=>q.tag==='misc'&&q.z!==2.5);  // z 2.5 = score popups (HUD text in 3D)
 const near=(r:Rect)=>union(misc.filter(q=>hit(q.r,r)).map(q=>q.r));
 const exact=(x:number,y:number)=>union(misc.filter(q=>(q.source??q.r).x===Math.floor(x)&&(q.source??q.r).y===Math.floor(y)).map(q=>q.r));
 const ps=quads.filter(q=>q.tag==='player'),pr=union(ps.map(q=>q.r));if(pr)out.push({id:'player',sourceId:'player',kind:'player',oamHidden:allHidden(ps),...pr});
 s.enemies.forEach((physical,i)=>{const e=enemyPicture(physical),sprites=quads.filter(q=>q.tag==='enemy#'+i),r=union(sprites.map(q=>q.r));if(r)out.push({oamHidden:allHidden(sprites),id:'enemy#'+i,sourceId:'enemy#'+i,kind:e.kind,state:e.kind==='blooper'?(sprites.some(q=>q.chr===223)?'contracted':'extended'):e.kind==='lakitu'?(sprites.some(q=>q.chr===189)?'ducked':'normal'):e.kind==='piranha'?(sprites.some(q=>q.chr===229)?'open':'closed'):e.shell?(e.kind!=='beetle'&&sprites.some(q=>q.chr===109)?'shell-expanded':'shell'):e.kind==='spiny'&&e.motion==='falling'&&!e.dead?'egg':e.kind==='podoboo'?(e.podobooFalling?'falling':'rising'):e.greenShellLaunchFrame!==undefined||e.defeat||(e.hbro?.state??0)&32||e.dead>0&&(e.kind==='cheep'||e.kind==='lakitu'||e.kind==='beetle'&&!e.squashed)?'flipped':e.squashed||e.kind==='goomba'&&e.dead>0&&e.dead<20?'squashed':e.kind==='bowser'?(e.dead>0&&!s.castleBowserFalls(e)?'flipped':'normal'):e.dead>20?'flipped':'normal',variant:spritePalette(sprites),...r});});
 s.items.forEach((it,i)=>{const r=typeof r2.item==='function'?union(quads.filter(q=>q.tag==='item#'+i&&q.z!==2.5).map(q=>q.r)):near({x:it.x-cam,y:it.y,w:it.kind==='debris'?8:16,h:16});if(r)out.push({id:'item#'+i,kind:it.kind,...r});});
 (s.area.platforms??[]).forEach((pl,i)=>{const p=s.platformPicturePosition(pl),context={levelId:s.level.id,areaId:s.area.id},ys=nativePlatformArtworkYs(pl,context,p.y);
  ys.forEach((y,copy)=>{const cloud=platformMotionModel(pl,context)==='contact-cloud',r=cloud?near({x:p.x-cam,y,w:pl.width,h:8}):union(misc.filter(q=>(q.source??q.r).y===Math.floor(y)&&(q.source??q.r).w===8&&(q.source??q.r).h<=8&&(q.source??q.r).x>=Math.floor(p.x-cam)&&(q.source??q.r).x<Math.floor(p.x-cam)+pl.width).map(q=>q.r));if(r)out.push({id:`platform#${i}.${copy}`,kind:platformMotionModel(pl,context)==='contact-cloud'?'cloud':'lift',...r});});
 });
 const fireDraws=misc.filter(q=>q.sourceName?.startsWith('special/sprite-fireball_or_firebar-'));
 // Each ball is the quad drawn at its own centre (renderer.ts: x-4, y-4 + visualOffsetY); a ball the OAM rows hide draws none.
 (s.area.firebars??[]).forEach((bar,i)=>s.firebarCenters(bar).forEach(({x,y},k)=>{const at={x:Math.floor(x-4-s.camera),y:Math.floor(y-4+(bar.visualOffsetY??0))},q=fireDraws.find(q=>q.source?.x===at.x&&q.source?.y===at.y);if(q){fireDraws.splice(fireDraws.indexOf(q),1);out.push({id:`fire#${i}.${k}`,sourceId:`fire#${i}.${k}`,kind:'fire',oamHidden:q.hidden,...q.r});}}));
 (s.area.springs??[]).forEach((sp,i)=>{const r=near({x:sp.x-cam,y:sp.y-23,w:16,h:24});if(r)out.push({id:'spring#'+i,kind:'spring',...r});});
 if(s.area.exit?.kind==='flag'){const pieces=nativeFlagSprites(s.specialSlot5,undefined,cam),r=union(pieces.flatMap(p=>misc.filter(q=>q.chr===p.tile&&(q.source??q.r).x===p.x&&(q.source??q.r).y===p.y).map(q=>q.r)));if(r)out.push({id:'flag',kind:'flag',...r});}
 if(s.phase==='flag'){
  if(s.castleFlag){const f=s.castleFlag,r=exact(f.x-cam,f.y);if(r)out.push({id:'castleFlag',kind:'castleFlag',...r});}
  s.flagFireworks.forEach((f,i)=>{const r=exact(f.x-cam,f.y);if(r)out.push({id:'spark#'+i,kind:'spark',...r});});
 }
 (s.blockGraphics??[]).forEach(b=>nativeBlockSprites(b,!['water','underground','castle'].includes(s.area.theme),s.camera).forEach((p,i)=>{const q=quads.find(q=>q.tag==='misc'&&q.chr===p.tile&&(q.source??q.r).x===p.x&&(q.source??q.r).y===p.y);if(q)out.push({id:'block#'+b.slot+'.'+i,kind:b.metatile===196?'blockUsed':'blockBrick',...q.r});}));
 const bubbleDraws=misc.filter(q=>q.chr===0x74);
 // Each bubble is the tile drawn at its own position (renderer.ts: x & 255, y + 1); one the OAM rows hide draws none.
 if(s.area.theme==='water')(s.bubbles??[]).forEach((b,i)=>{if(nativeBubbleShown(b,s.player.y,s.camera)){const at={x:(Math.floor(b.x)-Math.floor(s.camera))&255,y:Math.floor(b.y+1)},q=bubbleDraws.find(q=>q.source?.x===at.x&&q.source?.y===at.y);if(q){bubbleDraws.splice(bubbleDraws.indexOf(q),1);out.push({id:'bubble#'+i,sourceId:'bubble#'+i,kind:'bubble',oamHidden:q.hidden,...q.r});}}});
 for(const [i,vine]of s.vines.entries()){const r=union(misc.filter(q=>(q.chr===224||q.chr===225)&&q.r.x>=vine.x-cam&&q.r.x<vine.x-cam+16&&q.r.y>=vine.baseY-vine.height&&q.r.y<vine.baseY).map(q=>q.r));if(r)out.push({id:'vine#'+i,kind:'vine',...r});}
 // Score popups (floatey numbers): the tiles of the popup's assembly at its position; the 3D view draws them as HUD text.
 s.popups.forEach((popup,i)=>{const pieces=popupAssemblies.records.find(record=>record.value===popup.value)?.pieces??[],mine=(q:{chr?:number;source?:Rect;sourceName?:string})=>q.sourceName==='sprite-tiles-0f-16-30-27.png'&&pieces.some(p=>q.chr===p.tile&&q.source?.x===Math.floor(popup.x+p.x)&&q.source?.y===Math.floor(popup.y+p.y));
  const list=all.filter(mine),r=union(list.map(q=>q.r));if(r)out.push({id:'popup#'+i,sourceId:'popup#'+i,kind:'popup',state:String(popup.value),oamHidden:allHidden(list),...r});});
 const rt=union(quads.filter(q=>q.tag==='retainer').map(q=>q.r));if(rt)out.push({id:'retainer',kind:'retainer',state:s.level.id==='8-4'?'princess':'toad',...rt});
 return out;
}
/** Visible 3D gameplay objects, each with its projected NES-pixel rect. */
function objects3d(r3:Any,s:Simulation):(Obj&{root:THREE.Object3D})[]{
 const cam:THREE.Camera=r3.atmosphere.camera,box=new THREE.Box3(),meshBox=new THREE.Box3(),v=new THREE.Vector3(),out:(Obj&{root:THREE.Object3D})[]=[];
 cam.updateMatrixWorld();r3.atmosphere.scene.updateMatrixWorld(true);
 const project=(o:THREE.Object3D):Rect|undefined=>{
  box.makeEmpty();o.traverseVisible(c=>{const m=c as Any;if(!m.isMesh||(Array.isArray(m.material)?m.material:[m.material]).every((material:THREE.Material)=>!material.visible))return;if(m.isSkinnedMesh)m.boundingBox=null;meshBox.setFromObject(m,false);const material=Array.isArray(m.material)?m.material[0]:m.material;
   for(const plane of material.clippingPlanes??[]){const n=plane.normal;if(n.x===1)meshBox.min.x=Math.max(meshBox.min.x,-plane.constant);else if(n.x===-1)meshBox.max.x=Math.min(meshBox.max.x,plane.constant);else if(n.y===1)meshBox.min.y=Math.max(meshBox.min.y,-plane.constant);else if(n.y===-1)meshBox.max.y=Math.min(meshBox.max.y,plane.constant);}if(!meshBox.isEmpty())box.union(meshBox);});
  if(box.isEmpty())return undefined;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(let i=0;i<8;i++){v.set(i&1?box.max.x:box.min.x,i&2?box.max.y:box.min.y,i&4?box.max.z:box.min.z).project(cam);const x=(v.x+1)/2*256,y=(1-v.y)/2*240;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  return {x:x0,y:y0,w:x1-x0,h:y1-y0};
 };
 const enemyModels=new Set(Object.values(ENEMY_MODEL));
 // Midpoints between the two sampled authored asset poses distinguish actual bone transforms, not simulation tags.
 const state=(kind:string,o:THREE.Object3D)=>kind==='blooper'?((o.getObjectByName('Body')?.position.y??0.65)<0.6?'contracted':'extended'):kind==='lakitu'?((o.getObjectByName('Body')?.position.y??0.35)<0?'ducked':'normal'):kind==='piranha'?(Math.sin(o.rotation.y)<=0?'back-facing':Math.abs(o.getObjectByName('JawF')?.quaternion.z??0)>0.3?'open':'closed'):kind==='toad'||kind==='princess'?kind:kind.endsWith('_shell')?(o.rotation.z?'flipped':kind==='koopa_shell'&&o.scale.y>1?'shell-expanded':'shell'):kind==='espinyEgg'?'egg':kind==='podoboo'?(o.rotation.z?'falling':'rising'):enemyModels.has(kind)?(kind==='goomba'&&o.scale.y<1?'squashed':o.rotation.z?'flipped':'normal'):undefined;
 const add=(kind:string,o:THREE.Object3D|undefined,i:number,sourceId?:string)=>{if(!o?.visible)return;const r=project(o);if(r)out.push({id:`${kind}@${i}`,kind,state:state(kind,o),variant:o.userData.nativePalette,root:o,sourceId,...r});};
 const e=r3.entities;
 if(e.mario)add('player',e.mario.root,0,'player');
 for(const [name,pool] of e.pools as Map<string,Any>)(pool.items as Any[]).forEach((a,i)=>{const index=s.enemies.indexOf(pool.owners.get(a));add(name,a.root,i,index>=0?'enemy#'+index:undefined);});
 for(const [key,list] of e.cache as Map<string,THREE.Mesh[]>)list.forEach((m,i)=>add(key,m,i));
 (e.coins as THREE.Mesh[]).forEach((m,i)=>add('coin',m,i));
 const bubbleIds=s.bubbles.map((bubble,i)=>({bubble,i})).filter(({bubble})=>nativeBubbleShown(bubble,s.player.y,s.camera)).map(({i})=>'bubble#'+i),fireIds=(s.area.firebars??[]).flatMap((bar,i)=>s.firebarCenters(bar).map((_,j)=>`fire#${i}.${j}`));
 for(const [key,list] of r3.props.pools as Map<string,THREE.Object3D[]>)list.forEach((o,i)=>add(key.startsWith('blockUsed@')?'blockUsed':key.startsWith('blockBrick@')?'blockBrick':key.replace(/[\d.]+$/,''),o,i,key==='bubble'?bubbleIds[i]:key==='fire'?fireIds[i]:undefined));
 if(r3.world.flag.visible&&r3.world.group.visible)add('flag',r3.world.flag,0);
 for(const p of r3.hud.popups as {index:number;value:string|number;x:number;y:number}[])out.push({id:'popup@'+p.index,sourceId:'popup#'+p.index,kind:'popup',state:String(p.value),root:r3.hud.scene,x:p.x,y:p.y,w:String(p.value).length*6,h:6});  // hud.ts: 6 px text
 return out;
}
/** Tiles the 3D world drew this frame, by the pool model name, recorded by re-running World.sync with a logging pool(). */
let lastCells:{name:string;x:number;y:number;key:string}[]=[];
function cells3d(r3:Any,s:Simulation){
 if(r3.held)return lastCells;  // the held castle picture: the world was not re-synced
 return lastCells=logCells(r3,s);
}
function logCells(r3:Any,s:Simulation){
 const w=r3.world,orig=w.pool,log:{name:string;x:number;y:number}[]=[];
 const keys=()=>new Map([...(w.pools as Map<string,unknown>)].map(([k,p])=>[p,k]));
 w.pool=function(name:string,...rest:Any[]){const p=orig.call(this,name,...rest),key=keys().get(p) as string;return {add:(m:THREE.Matrix4)=>{log.push({name,x:m.elements[12],y:m.elements[13],key});return p.add(m);}};};
 try{w.sync(s,Math.floor(s.camera));}finally{delete w.pool;}
 return log as {name:string;x:number;y:number;key:string}[];
}
const nes=(index:number)=>nesPalette.colors[index] as number[];
/** Colour of a 3D pool: its palette tint (linear, before the night light balance), else the model's own colour (green pipes, gold used blocks). */
function poolColour(key:string,natural:number){const m=/@tint([\d.,]+)/.exec(key);if(!m)return nes(natural);
 const v=m[1].split(',').map(Number),max=Math.max(...v,1);return v.map(v=>{const c=v/max;return Math.round(255*(c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055));});}
/** Palette identity of both pictures: outdoor sky night/day, pipe colour per cell, block write-back colour per cell. */
function looks(s:Simulation,r3:Any,tiles2d:{id:number;x:number;y:number;z:number;palette?:number}[],tiles3d:{name:string;x:number;y:number;key:string}[]){
 const cam=Math.floor(s.camera),outdoor=['ground','night','snow'].includes(s.area.theme),a:Look[]=[],b:Look[]=[];if(!tiles2d.length)return {a,b};
 if(outdoor){a.push({what:'sky',at:'',night:r2.renderer.getClearColor(new THREE.Color()).getHex()===0});b.push({what:'sky',at:'',night:r3.atmosphere.theme==='night'});}
 for(const t of tiles2d){const k=kindIn(t.id,s.area.theme);if(t.z===0&&t.palette!==undefined&&(k==='pipe'||k==='sidePipe'))a.push({what:'pipe',at:`${Math.round((t.x+cam)/16)},${Math.round(t.y/16)}`,rgb:nes(r2.palettes[t.palette][(t.id>>6)*4+1])});}
 for(const [key,id] of s.blockBackground){const original=r2.originalTiles.get(key);if(id===196&&original!==undefined&&original>>6!==id>>6)a.push({what:'used',at:key,rgb:nes(r2.palettes[s.area.palette][(original>>6)*4+2])});}
 for(const t of tiles3d){const pipe=t.name.startsWith('pipe_');if(!pipe&&!t.name.startsWith('block_used'))continue;for(const [c,r] of cellsOf(t.name,t.x,t.y).cells)b.push({what:pipe?'pipe':'used',at:`${c},${r}`,rgb:poolColour(t.key,pipe?0x29:0x17)});}
 return {a,b};
}
/** One audit of the current frame (call after the page has drawn it). */
export function audit():FrameReport{
 const win=window as Any,s:Simulation=win.marioDebug.simulation,r3=win.render3d;
 // A held castle picture keeps the camera it was drawn with.
 const {quads,tiles,camera}=draw2d(s),cam=camera??Math.floor(s.camera);
 // z 1: late scroll-split strips (single shifted scanlines of the NES picture, a raster artifact the 3D view does not reproduce).
 const t2:Cell[]=tiles.filter(t=>t.z!==2&&t.z!==1).map(t=>({col:Math.round((t.x+cam)/16),row:Math.round(t.y/16),id:t.id}));
 // Debris is a tile-sheet sprite in 2D (z 2): it is an object, not terrain.
 const debris=tiles.filter(t=>t.z===2);
 const o2=objects2d(s,quads.concat(debris.map(t=>({tag:t.tag,r:{x:t.x,y:t.y,w:8,h:8},z:2}))));
 const black=!r3.world.group.visible;
 const t3=black?[]:cells3d(r3,s),o3=black?[]:objects3d(r3,s);
 const look=black?{a:[],b:[]}:looks(s,r3,tiles,t3);
 return compareFrame({theme:s.area.theme,camera:cam,tiles2d:t2,tiles3d:t3,objects2d:o2,objects3d:o3,pieceModel:pieceModels(PIECES),looks2d:look.a,looks3d:look.b});
}
/** Optional depth/alpha candidate audit. It does not assert pixel-shape equality between authored3D and NES sprites. */
export function visibilityAudit(){
 const win=window as Any,s:Simulation=win.marioDebug.simulation,r3=win.render3d;
 const hash=(text:string)=>{let h=2166136261;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(16);};
 const bounds:any[]=[];r3.atmosphere.scene.traverse((o:any)=>{if(o.isMesh)bounds.push({object:o,box:o.boundingBox,sphere:o.boundingSphere,geometry:o.geometry,geometryBox:o.geometry.boundingBox,geometrySphere:o.geometry.boundingSphere});});
 const restoreBounds=()=>{for(const b of bounds){if('boundingBox'in b.object)b.object.boundingBox=b.box;if('boundingSphere'in b.object)b.object.boundingSphere=b.sphere;b.geometry.boundingBox=b.geometryBox;b.geometry.boundingSphere=b.geometrySphere;}};
 const before={simulation:hash(renderEquivalenceSnapshot(s)),scene:hash(sceneState(r3.atmosphere.scene)),hud:hash(sceneState(r3.hud.scene))};
 try{
 const {quads,tiles,draws}=draw2d(s),debris=tiles.filter(t=>t.z===2),want=objects2d(s,quads.concat(debris.map(t=>({tag:t.tag,r:{x:t.x,y:t.y,w:8,h:8},z:2})))),have=r3.world.group.visible?objects3d(r3,s):[];
 const labels2=new Map<THREE.Object3D,number>(),roots=new Map<THREE.Object3D,number>(),used=new Set<THREE.Object3D>(),pairs:any[]=want.map((o,index)=>({...o,label:index+1}));
 for(const o of pairs){const direct=have.find(h=>!used.has(h.root)&&o.sourceId&&h.sourceId===o.sourceId),found=direct??have.filter(h=>!used.has(h.root)&&family(h.kind)===family(o.kind)&&!(o.sourceId&&h.sourceId&&o.sourceId!==h.sourceId)).sort((a,b)=>Math.hypot(a.x+a.w/2-o.x-o.w/2,a.y+a.h/2-o.y-o.h/2)-Math.hypot(b.x+b.w/2-o.x-o.w/2,b.y+b.h/2-o.y-o.h/2))[0];if(found&&(direct||Math.hypot(found.x+found.w/2-o.x-o.w/2,found.y+found.h/2-o.y-o.h/2)<40)){roots.set(found.root,o.label);used.add(found.root);o.matched=true;o.rect3d={x:found.x,y:found.y,w:found.w,h:found.h};o.pose3d={nativeSprite:found.root.userData.nativeSprite,position:found.root.position.toArray(),rotation:found.root.rotation.toArray(),scale:found.root.scale.toArray()};}}
 for(const h of have)if(!used.has(h.root)){const label=pairs.length+1;pairs.push({id:'unmatched3d:'+h.id,kind:h.kind,label,matched:false,only3d:true});roots.set(h.root,label);}
 for(const d of draws){let wanted=pairs.find(o=>o.id===d.tag);if(!wanted&&d.tag==='misc'&&d.sprite&&d.z!==2.5)wanted=pairs.find(o=>!o.only3d&&o.draws?.includes(d.id));if(wanted)labels2.set(d.mesh,wanted.label);}
 const labels3=new Map<THREE.Object3D,number>();r3.atmosphere.scene.traverse((o:THREE.Object3D)=>{for(let root:THREE.Object3D|null=o;root;root=root.parent){const label=roots.get(root);if(label!==undefined){labels3.set(o,label);break;}}});
 const p2=visiblePixels(r2.renderer,r2.scene,r2.camera,labels2,pairs.length),overlays=r3.hud.last?[{scene:r3.hud.scene,camera:r3.hud.camera}]:[],p3=visiblePixels(r3.gl,r3.atmosphere.scene,r3.atmosphere.camera,labels3,pairs.length,overlays,false,{draws:r3.atmosphere.sprites.draws,banks:[r3.world.group,r3.entities.group,r3.props.group]});
 const isolated2=visiblePixels(r2.renderer,r2.scene,r2.camera,labels2,pairs.length,[],true),isolated3=visiblePixels(r3.gl,r3.atmosphere.scene,r3.atmosphere.camera,labels3,pairs.length,[],true);
 restoreBounds();
 const after={simulation:hash(renderEquivalenceSnapshot(s)),scene:hash(sceneState(r3.atmosphere.scene)),hud:hash(sceneState(r3.hud.scene))};
 const objects=pairs.map(o=>({id:o.id,kind:o.kind,matched:Boolean(o.matched),rect2d:o.only3d?undefined:{x:o.x,y:o.y,w:o.w,h:o.h},rect3d:o.rect3d,pose3d:o.pose3d,pixels2d:p2.pixels[o.label],pixels3d:p3.pixels[o.label],isolatedPixels2d:isolated2.pixels[o.label],isolatedPixels3d:isolated3.pixels[o.label],occludedFraction2d:isolated2.pixels[o.label]?1-p2.pixels[o.label]/isolated2.pixels[o.label]:null,occludedFraction3d:isolated3.pixels[o.label]?1-p3.pixels[o.label]/isolated3.pixels[o.label]:null,contribution2d:p2.contribution[o.label],contribution3d:p3.contribution[o.label]}));
 const candidates=objects.filter(o=>(o.pixels2d>0)!==(o.pixels3d>0)||o.occludedFraction2d!==null&&o.occludedFraction3d!==null&&o.occludedFraction3d>o.occludedFraction2d+0.01).map(o=>({...o,reason:!o.pixels3d?'visible2d-invisible3d':!o.pixels2d?'invisible2d-visible3d':'more-occluded-3d'}));
 return {before,after,instrumentationUnchanged:JSON.stringify(before)===JSON.stringify(after),objects,candidates,unsupported:{orig:p2.unsupported,v3d:p3.unsupported},precision:p3.precision,passes:{orig:p2.passes+isolated2.passes,v3d:p3.passes+isolated3.passes},scope:'Actual world/HUD depth-alpha contribution; selected frames unless the driver explicitly uses every1. Geometry shape, lighting, z-fighting and temporal flicker require separate checks.'};
 }finally{restoreBounds();}
}
/** The 2D and 3D object lists of the current frame (inspection). */
export function objects(){
 const win=window as Any,s:Simulation=win.marioDebug.simulation,r3=win.render3d,{quads,tiles}=draw2d(s),debris=tiles.filter(t=>t.z===2);
 return {objects2d:objects2d(s,quads.concat(debris.map(t=>({tag:t.tag,r:{x:t.x,y:t.y,w:8,h:8},z:2})))),objects3d:r3.world.group.visible?objects3d(r3,s).map(({root:_,...o})=>o):[]};
}
(window as Any).placement={setup,audit,visibilityAudit,objects};
