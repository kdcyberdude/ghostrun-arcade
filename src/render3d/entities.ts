// Player, enemies and items. Positions come straight from the simulation (feet / hit box); animation never feeds back into it.
// Pose selection mirrors the original renderer's sprite-cell choice (renderer.ts player()/enemy()), mapped onto 3D clips.
import * as THREE from 'three';
import {Simulation,POWERUPS} from '../simulation.js';
import type {Enemy,EnemyKind,Item} from '../types.js';
import {Kit} from './kit.js';
import {ActorPool,Actor,turnToward,yawFor} from './actors.js';
import {coinGeometry,GOLD} from './proc.js';
const DIMS:Record<EnemyKind,[number,number]>={goomba:[1,1],koopa:[1,1.5],redKoopa:[1,1.5],paratroopa:[1,1.5],beetle:[1,1],spiny:[1,1],piranha:[1,1.5],blooper:[1,1.5],cheep:[1,1],bullet:[1,1],lakitu:[1,1.5],hammerBro:[1,1.5],podoboo:[1,1],bowser:[2,2]};
const COLORS:Record<EnemyKind,number>={goomba:0x8a4a1a,koopa:0x2fae3a,redKoopa:0xd23a2a,paratroopa:0x2fae3a,beetle:0x222233,spiny:0xd23a2a,piranha:0x2fae3a,blooper:0xf0f0f0,cheep:0xd23a2a,bullet:0x333333,lakitu:0xeeeeee,hammerBro:0x2fae3a,podoboo:0xff6a00,bowser:0x3a8a2a};
/** Model per enemy kind (absent = procedural stand-in). */
export const ENEMY_MODEL:Partial<Record<EnemyKind,string>>={goomba:'goomba',koopa:'koopa',redKoopa:'koopa',paratroopa:'koopa',beetle:'beetle',spiny:'spiny',piranha:'piranha',blooper:'blooper',cheep:'cheep',bullet:'bullet',lakitu:'lakitu',hammerBro:'hammer_bro',podoboo:'podoboo',bowser:'bowser'};
const ITEM_MODEL:Partial<Record<Item['kind'],string>>={mushroom:'mushroom',flower:'fire_flower',star:'star','1up':'one_up',fireball:'fireball',hammer:'hammer',flame:'bowser_flame'};
export const ACTOR_MODELS=['mario',...new Set(Object.values(ENEMY_MODEL)),'koopa_shell','beetle_shell',...Object.values(ITEM_MODEL)] as string[];
const PALETTE={mario:['#d8241c','#2a4fc8'],luigi:['#2fae3a','#1d2f7a'],fire:['#f4f0e6','#d8241c']};
const STAR=[['#d8241c','#2a4fc8'],['#1a1a1a','#d86a1c'],['#f4f0e6','#d8241c'],['#2fae3a','#e8c020']];
const std=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:0.55});
export class Entities{
 readonly group=new THREE.Group();private debug=new THREE.Group();private cache=new Map<string,THREE.Mesh[]>();private used=new Map<string,number>();
 private hitboxes:THREE.LineSegments[]=[];private hbUsed=0;private pools=new Map<string,ActorPool>();
 private mario?:Actor;private marioYaw=yawFor(1);private walkPhase=0;private lastX=NaN;private lastFrame=-1;private lastVariant='';
 private enemyYaw=new WeakMap<Enemy,number>();private coins:THREE.Mesh[]=[];private coinsUsed=0;readonly standIns=new Set<string>();
 constructor(private kit:Kit,private debugBoxes:boolean){
  this.group.add(this.debug);
  const inst=kit.instance('mario');if(inst){this.mario=new Actor(inst.root,inst.clips);this.group.add(this.mario.root);}
 }
 private pool(name:string){let p=this.pools.get(name);if(!p){p=new ActorPool(this.kit,name,this.group);this.pools.set(name,p);}return p;}
 private take(key:string,make:()=>THREE.Mesh){
  let list=this.cache.get(key);if(!list)this.cache.set(key,list=[]);const i=this.used.get(key)??0;this.used.set(key,i+1);
  let m=list[i];if(!m){m=make();m.castShadow=true;m.receiveShadow=true;this.group.add(m);list.push(m);}m.visible=true;this.standIns.add(key);return m;
 }
 private box(x0:number,y0:number,x1:number,y1:number,color=0x00ff66){
  if(!this.debugBoxes)return;let l=this.hitboxes[this.hbUsed];
  if(!l){l=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,0.02)),new THREE.LineBasicMaterial({color,depthTest:false,transparent:true}));l.renderOrder=999;this.debug.add(l);this.hitboxes.push(l);}
  (l.material as THREE.LineBasicMaterial).color.setHex(color);l.visible=true;l.position.set((x0+x1)/2,(y0+y1)/2,0.3);l.scale.set(x1-x0,y1-y0,1);this.hbUsed++;
 }
 sync(s:Simulation,_camPx:number){
  for(const list of this.cache.values())for(const m of list)m.visible=false;this.used.clear();this.hbUsed=0;for(const l of this.hitboxes)l.visible=false;
  for(const p of this.pools.values())p.begin();for(const c of this.coins)c.visible=false;this.coinsUsed=0;
  const advanced=s.frame!==this.lastFrame;
  this.player(s,advanced);
  for(const e of s.enemies)if(e.active&&e.dead<90)this.enemy(e,s);
  for(const i of s.items)this.item(i,s);
  for(const p of this.pools.values())p.end();
  this.lastFrame=s.frame;
 }
 private player(s:Simulation,advanced:boolean){
  const p=s.player,feet=(239-p.y)/16,x=(p.x+8)/16;
  const visible=s.vineEntryStage!=='grow'&&!s.entryFallHidden&&!s.flagInside&&!s.pipeHidden&&(Boolean(s.powerChange)||!p.invincible||Math.floor(s.frame/4)%2===0);
  // Size: small 0.5 (+Chibi), big 1.0; the three growth frames of the original map to 0.5 / 0.75 / 1.0.
  const change=s.powerChange,age=change?POWERUPS.transformFreezeNativeFrames.value-change.remaining:0;
  let size=p.size===0?0:1;
  if(change?.kind==='grow'&&age>=8)size=age<32?0:age<40?0.5:age<48?0:age<56?1:0;
  if(change?.kind==='shrink')size=[1,0.5,0][Math.floor(age/4)%3];
  this.box(p.x/16,feet,p.x/16+1,feet+(p.size===0?1:2));
  if(!this.mario){if(visible){const h=size>0.5?2:1,m=this.take('player'+h,()=>new THREE.Mesh(new THREE.CapsuleGeometry(0.34,h-0.68,8,16),std(0xd02020)));m.position.set(x,feet+h/2,0);}return;}
  const a=this.mario;a.root.visible=visible;if(!visible)return;
  const scale=0.5+0.5*size;a.root.scale.setScalar(scale);a.morph('Chibi',1-size);a.root.position.set(x,feet,0);
  // Pose (same decision tree as the 2D sprite cell).
  const pose=s.phase==='play'?(s.wallDisplayPose??s.locomotionPose):undefined,water=s.area.theme==='water',speed=Math.abs(p.vx);
  if(advanced){const dx=Number.isNaN(this.lastX)?0:Math.abs(p.x-this.lastX);this.walkPhase+=dx<8?dx:0;}this.lastX=p.x;
  // Strides measured on the authored clips (check_gait.py): walk 1.05 tiles per cycle, run 2.10 tiles per cycle -> no foot sliding.
  const cyclePx=(clip:string)=>(clip==='run'?33.6:16.8)*scale;
  let clip='idle',t=s.frame/60,loop=true;
  if(p.dead){clip='death';t=0;loop=false;}
  else if(p.climbing){clip=s.phase==='flag'?'slide':'climb';t=s.phase==='flag'?0:p.anim/24*a.duration('climb');}
  else if(s.phase==='flag'&&!s.flagInside){clip='walk';}
  else if(p.duck&&p.size>0)clip='duck';
  else if(water&&!p.grounded){clip='swim';t=s.frame/60;}
  else if(pose){clip=pose.kind==='jump'?(p.vy>0?'fall':'jump'):pose.kind==='skid'?'skid':pose.kind==='walk'?(speed>=2?'run':'walk'):'idle';}
  else if(!p.grounded)clip=p.vy>0?'fall':'jump';
  else if(speed>0.1)clip=p.vx*p.facing<0?'skid':speed>=2?'run':'walk';
  if(clip==='walk'||clip==='run'){t=this.walkPhase/cyclePx(clip)*a.duration(clip);}
  if(p.size===2&&s.fireballThrowAge>=0&&s.fireballThrowAge<8&&!p.duck&&!p.dead&&!p.climbing&&speed<=0.1){clip='throw';t=s.fireballThrowAge/60;loop=false;}
  if(!loop&&clip==='death')t=a.duration('death');
  a.pose(clip,t,s.frame,loop);
  const facing=pose&&!water&&!p.climbing&&!p.duck&&!s.entryFallPose?pose.facing:p.facing;
  const target=p.dead?0:clip==='climb'||clip==='slide'?yawFor(facing)*0.4+(facing<0?Math.PI*0.6:0):yawFor(facing);
  if(advanced)this.marioYaw=turnToward(this.marioYaw,target);a.root.rotation.y=this.marioYaw;
  // Palette: Mario / Luigi / Fire, star flashing like the original's four palettes.
  let colors=p.size===2||(change?.kind==='fire'&&Math.floor(age/4)%2===1)?PALETTE.fire:s.currentPlayer?PALETTE.luigi:PALETTE.mario;
  if(p.star)colors=STAR[Math.floor(s.frame/(p.star>128?8:2))%4];
  const variant=colors.join();if(variant!==this.lastVariant){this.lastVariant=variant;a.recolor('M_Cloth_Primary',colors[0]);a.recolor('M_Cloth_Secondary',colors[1]);}
 }
 private yaw(e:Enemy,target:number){const y=turnToward(this.enemyYaw.get(e)??target,target);this.enemyYaw.set(e,y);return y;}
 private enemy(e:Enemy,s:Simulation){
  const [w,h]=DIMS[e.kind],cx=(e.x+8)/16,feet=(239-e.y)/16;this.box(e.x/16,feet,e.x/16+w,feet+h,0xff3030);
  const shell=e.shell&&(e.kind==='koopa'||e.kind==='redKoopa'||e.kind==='beetle');
  const name=shell?(e.kind==='beetle'?'beetle_shell':'koopa_shell'):ENEMY_MODEL[e.kind];
  const a=name?this.pool(name).take():undefined;
  if(!a){const m=this.take('e'+e.kind,()=>new THREE.Mesh(new THREE.CapsuleGeometry(w*0.4,Math.max(0.1,h-w*0.8),8,16),std(COLORS[e.kind])));m.position.set(cx,feet+h/2,0);m.scale.y=e.squashed?0.3:1;return;}
  const flipped=e.dead>20,facing=e.vx<0?-1:1;
  a.root.position.set(cx,feet,0);a.root.scale.set(1,e.squashed||e.kind==='goomba'&&e.dead>0&&e.dead<20?0.28:1,1);
  a.root.rotation.set(0,0,flipped?Math.PI:0);if(flipped)a.root.position.y+=h;
  if(shell){a.root.rotation.y=e.movingShell?e.age*0.5:0;a.recolor('M_Shell',e.kind==='redKoopa'?'#d23a2a':e.kind==='koopa'?'#2fae3a':'#1c1c2a');a.pose('idle',0,s.frame);return;}
  if(e.kind==='redKoopa'||e.kind==='koopa'||e.kind==='paratroopa')a.recolor('M_Shell',(e.palette??'').includes('16')||e.kind==='redKoopa'?'#d23a2a':'#2fae3a');
  const wings=a.node('Wings');if(wings)wings.visible=e.kind==='paratroopa'&&!e.dead;
  a.root.rotation.y=e.kind==='piranha'?-Math.PI/2:this.yaw(e,yawFor(e.kind==='hammerBro'?(s.player.x<e.x?-1:1):facing));
  a.pose(e.kind==='paratroopa'&&a.has('fly')?'fly':e.dead?'idle':'walk',e.age/60,s.frame);
 }
 private item(i:Item,s:Simulation){
  const cx=(i.x+8)/16,cy=(232-i.y)/16;this.box(i.x/16,(240-i.y-16)/16,i.x/16+1,(240-i.y)/16,0xffaa00);
  if(i.kind==='debris'){const m=this.take('debris',()=>new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42),std(0xb8521e)));m.position.set((i.x+4)/16,(236-i.y)/16,0.2);m.rotation.set(i.age*0.3,i.age*0.2,i.age*0.25);return;}
  if(i.kind==='coin'){  // block coin: the same minted gold coin as the tile coins, spinning fast while it pops
   let m=this.coins[this.coinsUsed++];if(!m){m=new THREE.Mesh(coinGeometry(),GOLD);m.castShadow=true;this.group.add(m);this.coins.push(m);}
   m.visible=true;m.position.set((i.x+4)/16,(232-i.y)/16,0);m.rotation.y=i.age*0.35;return;}
  const name=ITEM_MODEL[i.kind],a=name?this.pool(name).take():undefined;
  if(!a){const m=this.take('item'+i.kind,()=>new THREE.Mesh(new THREE.SphereGeometry(0.4,20,14),std(i.kind==='mushroom'?0xe03030:0xffffff)));m.position.set(cx,cy,0);return;}
  a.root.position.set(cx,(240-i.y-16)/16,0);
  if(i.kind==='fireball'||i.kind==='star'){a.root.position.set((i.x+4)/16,(232-i.y)/16-0.5,0);}
  a.pose(i.kind==='star'||i.kind==='fireball'?'spin':i.kind==='flower'?'sway':'idle',i.age/60,s.frame);
 }
}
