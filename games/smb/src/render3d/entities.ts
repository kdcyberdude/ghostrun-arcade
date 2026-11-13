// Player, enemies and items. Positions come straight from the simulation (feet / hit box); animation never feeds back into it.
// Pose selection mirrors the original renderer's sprite-cell choice (renderer.ts player()/enemy()), mapped onto 3D clips.
import * as THREE from 'three';
import {enemyPicture,nativeHammerBroCell,nativeEnemyCyclePhase,nativeBlooperPicture,nativeLakituCell,enemyPictureTimersStopped} from '../enemy-picture.js';
import {Simulation,POWERUPS} from '../simulation.js';
import {nativeFireballPhase} from '../native-fireball-picture.js';
import {playerVisible,playerCell} from '../player-cell.js';
import {itemShown,fireFlashVariant,starVariant} from '../view-rules.js';
import type {Enemy,EnemyKind,Item} from '../types.js';
import {Kit} from './kit.js';
import {ActorPool,Actor,turnToward,yawFor} from './actors.js';
import {coinGeometry,GOLD} from './proc.js';
import nesPalette from '../../assets/nes-rgb-palette.json';
const PIRANHA_GREEN=new THREE.Color().fromArray(nesPalette.colors[0x1a].map(v=>v/255)).convertSRGBToLinear();
const DIMS:Record<EnemyKind,[number,number]>={goomba:[1,1],koopa:[1,1.5],redKoopa:[1,1.5],paratroopa:[1,1.5],beetle:[1,1],spiny:[1,1],piranha:[1,1.5],blooper:[1,1.5],cheep:[1,1],bullet:[1,1],lakitu:[1,1.5],hammerBro:[1,1.5],podoboo:[1,1],bowser:[2,2]};
const COLORS:Record<EnemyKind,number>={goomba:0x8a4a1a,koopa:0x2fae3a,redKoopa:0xd23a2a,paratroopa:0x2fae3a,beetle:0x222233,spiny:0xd23a2a,piranha:0x2fae3a,blooper:0xf0f0f0,cheep:0xd23a2a,bullet:0x333333,lakitu:0xeeeeee,hammerBro:0x2fae3a,podoboo:0xff6a00,bowser:0x3a8a2a};
/** Model per enemy kind (absent = procedural stand-in). */
export const ENEMY_MODEL:Partial<Record<EnemyKind,string>>={goomba:'goomba',koopa:'koopa',redKoopa:'koopa',paratroopa:'koopa',beetle:'beetle',spiny:'spiny',piranha:'piranha',blooper:'blooper',cheep:'cheep',bullet:'bullet',lakitu:'lakitu',hammerBro:'hammer_bro',podoboo:'podoboo',bowser:'bowser'};
const ITEM_MODEL:Partial<Record<Item['kind'],string>>={mushroom:'mushroom',flower:'fire_flower',star:'star','1up':'one_up',fireball:'fireball',hammer:'hammer',flame:'bowser_flame'};
export const ACTOR_MODELS=['mario','toad','princess',...new Set(Object.values(ENEMY_MODEL)),'koopa_shell','beetle_shell',...Object.values(ITEM_MODEL)] as string[];
export const SMALL_SCALE=0.6,SMALL_CHIBI=0.5;const DEATH_FREEZE=15;  // death-rules.json freezeFrames
export const PALETTE={mario:['#d8241c','#2a4fc8'],luigi:['#2fae3a','#1d2f7a'],fire:['#f4f0e6','#d8241c']};
const STAR:Record<string,string[]>={'star-dark':['#1a1a1a','#d86a1c'],'star-white':['#f4f0e6','#d8241c'],'star-green':['#2fae3a','#e8c020']};
const std=(c:number)=>new THREE.MeshStandardMaterial({color:c,roughness:0.55});
export class Entities{
 readonly group=new THREE.Group();private debug=new THREE.Group();private cache=new Map<string,THREE.Mesh[]>();private used=new Map<string,number>();
 private hitboxes:THREE.LineSegments[]=[];private hbUsed=0;private pools=new Map<string,ActorPool>();
 private mario?:Actor;private marioYaw=yawFor(1);private walkPhase=0;private lastX=NaN;private lastFrame=-1;private lastVariant='';
 private enemyYaw=new WeakMap<Enemy,{frame:number;yaw:number}>();private coins:THREE.Mesh[]=[];private coinsUsed=0;readonly standIns=new Set<string>();
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
  if(s.frame<this.lastFrame){this.walkPhase=0;this.lastX=NaN;this.marioYaw=yawFor(s.player.facing);this.enemyYaw=new WeakMap();}
  const advanced=s.frame!==this.lastFrame;
  this.player(s,advanced);
  for(const e of s.enemies)if(s.enemyPictureShown(e)&&e.active&&e.graphicsVisible!==false&&enemyPicture(e).dead<90)this.enemy(e,s);
  if(s.spritePictureOwner==='engine')for(const i of s.items)if(itemShown(i))this.item(i,s);
  this.retainer(s);
  for(const p of this.pools.values())p.end();
  this.lastFrame=s.frame;
 }
 private player(s:Simulation,advanced:boolean){
  const p=s.player,feet=(239-p.y)/16,x=(p.x+8)/16;
  const visible=playerVisible(s);
  const appearance=playerCell(s),change=s.powerChange;
  const size=appearance.cell===24?0.5:appearance.cell<12||appearance.cell===25?1:0;
  this.box(p.x/16,feet,p.x/16+1,feet+(p.size===0?1:2));
  if(!this.mario){if(visible){const h=size>0.5?2:1,m=this.take('player'+h,()=>new THREE.Mesh(new THREE.CapsuleGeometry(0.34,h-0.68,8,16),std(0xd02020)));m.position.set(x,feet+h/2,0);}return;}
  const a=this.mario;a.root.visible=visible;if(!visible)return;
  // Small Mario: 0.6 of big Mario with half the Chibi morph (about 1.1 tiles tall). Full Chibi at 0.5 made the head dominate and the legs
  // too short to read a run (tools/visual3d/tune-small.ts lineups); the stride below scales with the legs, so the run cadence slows too.
  const scale=SMALL_SCALE+(1-SMALL_SCALE)*size;a.root.scale.setScalar(scale);a.morph('Chibi',(1-size)*SMALL_CHIBI);a.root.position.set(x,feet,0);
  // Pose (same decision tree as the 2D sprite cell).
  const speed=Math.abs(p.vx),cell=appearance.cell;
  if(advanced){const dx=Number.isNaN(this.lastX)?0:Math.abs(p.x-this.lastX);this.walkPhase+=dx<8?dx:0;}this.lastX=p.x;
  // Strides measured on the authored clips (check_gait.py): walk 1.05 tiles per cycle, run 2.10 tiles per cycle -> no foot sliding.
  const cyclePx=(clip:string)=>(clip==='run'?33.6:16.8)*scale;
  let clip='idle',t=s.frame/60,loop=true;
  if(cell===22){clip='death';t=0;loop=false;}
  else if([8,9,20,21].includes(cell)){clip=s.phase==='flag'?'slide':'climb';t=(cell===9||cell===21?0.5:0)*a.duration(clip);}
  else if(cell===10)clip='duck';
  else if([5,6,7,17,18,19].includes(cell))clip='swim';
  else if(cell===4||cell===16)clip=p.vy>0?'fall':'jump';
  else if(cell===3||cell===15)clip='skid';
  else if([0,1,2,12,13,14].includes(cell))clip=speed>=2?'run':'walk';
  if(clip==='walk'||clip==='run'){t=this.walkPhase/cyclePx(clip)*a.duration(clip);}
  if(appearance.throwing){clip='throw';t=s.fireballThrowAge/60;loop=false;}
  // Death: play the clip over the original's 15-frame freeze instead of snapping to its last pose.
  const dyingFrame=p.dead&&s.phase==='dying'?s.phaseFrame:p.dead?DEATH_FREEZE+60:0;
  if(!loop&&clip==='death')t=Math.min(1,dyingFrame/DEATH_FREEZE)*a.duration('death');
  a.pose(clip,t,s.frame,loop);
  if(clip==='swim'){const kick=(appearance.swimKick===undefined?0.75:0.25)*a.duration('swim');for(const bone of ['ThighL','ShinL','FootL','ThighR','ShinR','FootR'])a.poseRotation(bone,'swim',kick);}
  const facing=appearance.facing;
  const target=p.dead?0:clip==='climb'||clip==='slide'?yawFor(facing)*0.4+(facing<0?Math.PI*0.6:0):yawFor(facing);
  if(p.dead)this.marioYaw=target;else if(advanced)this.marioYaw=turnToward(this.marioYaw,target);a.root.rotation.y=this.marioYaw;
  // Palette: Mario / Luigi / Fire, star flashing like the original's four palettes.
  let palette:string=(change?.kind==='fire'?fireFlashVariant(POWERUPS.transformFreezeNativeFrames.fireValue-change.remaining):undefined)??(p.size===2?'fire':s.currentPlayer?'luigi':'mario');
  if(s.starDrawPalette!==undefined)palette=starVariant(s.starDrawPalette,palette);
  const colors=STAR[palette]??PALETTE[palette as keyof typeof PALETTE];
  const variant=colors.join();if(variant!==this.lastVariant){this.lastVariant=variant;a.recolor('M_Cloth_Primary',colors[0]);a.recolor('M_Cloth_Secondary',colors[1]);}
 }
 private yaw(e:Enemy,target:number,frame:number){const prev=this.enemyYaw.get(e);if(prev?.frame===frame)return prev.yaw;const y=turnToward(prev?.yaw??target,target);this.enemyYaw.set(e,{frame,yaw:y});return y;}
 private enemy(e:Enemy,s:Simulation){
  const physical=e;e=enemyPicture(e);const timersStopped=enemyPictureTimersStopped(e,s.frame,s.nativeTimersStopped);
  const pictureX=!e.dead?e.graphicsX??e.x:e.x,pictureY=!e.dead?e.graphicsY??e.y:e.y;
  const [w,h]=DIMS[e.kind],cx=(pictureX+(e.kind==='bowser'?16:8))/16,feet=(239-pictureY)/16;this.box(physical.x/16,(239-physical.y)/16,physical.x/16+w,(239-physical.y)/16+h,0xff3030);
  if(e.kind==='spiny'&&e.motion==='falling'&&!e.dead){
   const egg=this.take('espinyEgg',()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(0.34,20,12),std(0xd23a2a));m.name='spinyEgg';
    const material=std(0xf4ecd8),up=new THREE.Vector3(0,1,0);
    for(const d of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const v=new THREE.Vector3(...d),spike=new THREE.Mesh(new THREE.ConeGeometry(0.09,0.2,8),material);spike.position.copy(v).multiplyScalar(0.4);spike.quaternion.setFromUnitVectors(up,v);m.add(spike);}return m;});
   egg.position.set(cx,feet+0.5,0);egg.rotation.z=e.age*Math.PI/8;return;
  }
  const shell=e.shell&&(e.kind==='koopa'||e.kind==='redKoopa'||e.kind==='beetle');
  const name=shell?(e.kind==='beetle'?'beetle_shell':'koopa_shell'):ENEMY_MODEL[e.kind];
  const a=name?this.pool(name).take(physical):undefined;
  if(!a){const m=this.take('e'+e.kind,()=>new THREE.Mesh(new THREE.CapsuleGeometry(w*0.4,Math.max(0.1,h-w*0.8),8,16),std(COLORS[e.kind])));m.position.set(cx,feet+h/2,0);m.scale.y=e.squashed?0.3:1;return;}
  const squashed=e.squashed||e.kind==='goomba'&&e.dead>0&&e.dead<20&&e.greenShellLaunchFrame===undefined&&!e.defeat;
  const flipped=e.kind==='bowser'?e.dead>0&&!s.castleBowserFalls(physical):Boolean(e.defeat)||e.greenShellLaunchFrame!==undefined||e.dead>20&&!squashed,facing=e.kind==='bowser'?(e.bowser?.side??(e.vx<0?-1:1)):(!e.dead?e.graphicsFacing??e.vx:e.vx)<0?-1:1;
  a.root.position.set(cx,feet,0);a.root.scale.set(1,squashed?0.28:1,1);
  a.root.rotation.set(0,0,flipped?Math.PI:0);if(flipped)a.root.position.y+=h;
  // Flipping a native 24px enemy cell moves a 16px body above its transparent leading row.
  if(flipped&&h===1&&e.greenShellLaunchFrame===undefined&&!(e.defeat&&e.kind==='goomba'))a.root.position.y+=0.5;
  // Podoboo is authored around its glowing center; walkers are authored from the feet.
  if(e.kind==='podoboo'){a.root.position.y=feet+0.5;a.root.rotation.z=e.podobooFalling?Math.PI:0;}
  if(shell){a.root.rotation.y=e.movingShell?e.age*0.5:0;a.recolor('M_Shell',e.kind==='redKoopa'?'#d23a2a':e.kind==='koopa'?'#2fae3a':'#1c1c2a');a.pose('idle',0,s.frame);return;}
  if(e.kind==='redKoopa'||e.kind==='koopa'||e.kind==='paratroopa')a.recolor('M_Shell',(e.palette??'').includes('16')||e.kind==='redKoopa'?'#d23a2a':'#2fae3a');
  if(e.kind==='piranha')a.recolor('M_Head',PIRANHA_GREEN); // Native Piranha palette is $0f/$1a/$30/$27.
  const wings=a.node('Wings');if(wings)wings.visible=e.kind==='paratroopa'&&!e.dead;
  a.root.rotation.y=e.kind==='piranha'?Math.PI/2:this.yaw(physical,yawFor(e.kind==='hammerBro'?(e.nativeDir??-1):facing),s.frame);
  const broCell=e.kind==='hammerBro'&&e.hbro?nativeHammerBroCell(e.dead?0x20:e.hbro.state,s.random.frame,timersStopped):undefined;
  const blooper=e.kind==='blooper'?nativeBlooperPicture(e.bloop?.timer??0,Boolean(e.dead),timersStopped):undefined;
  if(blooper)a.root.position.y-=blooper.yOffset/16;
  const nativePhase=e.kind==='piranha'?((e.dead?Math.floor(e.age/8)%2:nativeEnemyCyclePhase(s.random.frame,timersStopped))?0:0.5):blooper?(blooper.cell===10?0.5:0):e.nativeBowser?((e.nativeBowser.controls&1)?0.75:0.25):broCell!==undefined?((broCell&1)?0.75:0.25):undefined;
  const clip=e.kind==='piranha'?'idle':nativePhase!==undefined?'walk':e.kind==='paratroopa'&&a.has('fly')?'fly':e.dead?'idle':'walk';
  a.pose(clip,nativePhase===undefined?e.age/60:nativePhase*a.duration(clip),s.frame);
  if(e.kind==='lakitu'&&nativeLakituCell(e.graphicsFrenzyTimer??0,Boolean(e.dead))===25)a.poseYOffset('Body',-8/16);
  if(e.nativeBowser)a.poseRotation('Jaw','idle',(e.nativeBowser.controls&0x80)?a.duration('idle')/4:0);
  if(e.kind==='hammerBro'){
   for(const name of ['M_Handle','M_Metal'])for(const material of a.materials.get(name)??[])material.visible=!e.hbro;
   if(broCell!==undefined)a.poseRotation('ArmR',broCell>=30?'walk':undefined,a.duration('walk')/4);
  }
 }
 private retainer(s:Simulation){
  const picture=s.castleRetainer;if(!picture?.graphicsVisible)return;
  const name=s.level.id==='8-4'?'princess':'toad',actor=this.pool(name).take();if(!actor)return;
  if(name==='toad')actor.recolor('M_Vest',PALETTE.mario[0]);
  actor.root.position.set((picture.x+8)/16,(215-picture.y)/16,0);actor.root.rotation.set(0,-Math.PI/2,0);actor.root.scale.setScalar(1);actor.pose('idle',s.frame/60,s.frame);
 }
 private item(i:Item,s:Simulation){
  const pictureX=i.nativeCoin||i.nativeHammer?Math.floor(s.camera)+(Math.floor(i.x-s.camera)&255):i.x;
  const pictureY=i.nativeCoin||i.nativeHammer?(Math.floor(i.y)&255)+1:i.nativePowerState!==undefined?Math.floor(i.y)+1:i.y;
  const cx=(pictureX+8)/16,cy=(232-pictureY)/16;this.box(i.x/16,(240-i.y-16)/16,i.x/16+1,(240-i.y)/16,0xffaa00);
  if(i.kind==='debris'){const m=this.take('debris',()=>new THREE.Mesh(new THREE.BoxGeometry(0.42,0.42,0.42),std(0xb8521e)));m.position.set((i.x+4)/16,(236-i.y)/16,0.2);m.rotation.set(i.age*0.3,i.age*0.2,i.age*0.25);return;}
  if(i.kind==='coin'&&(i.nativeCoin?.state??0)>=2)return; // native misc slot now draws its floatey 200, in Hud
  if(i.kind==='coin'){  // block coin: the same minted gold coin as the tile coins, spinning fast while it pops
   let m=this.coins[this.coinsUsed++];if(!m){m=new THREE.Mesh(coinGeometry(),GOLD);m.castShadow=true;this.group.add(m);this.coins.push(m);}
   m.visible=true;m.position.set((pictureX+4)/16,(232-pictureY)/16,0);m.rotation.y=(i.nativeCoin?(s.random.frame>>1)&3:Math.floor(i.age/4)%4)*Math.PI/2;return;}
  const name=ITEM_MODEL[i.kind],a=name?this.pool(name).take():undefined;
  if(!a){const m=this.take('item'+i.kind,()=>new THREE.Mesh(new THREE.SphereGeometry(0.4,20,14),std(i.kind==='mushroom'?0xe03030:0xffffff)));m.position.set(cx,cy,0);return;}
  a.root.position.set(cx,(240-pictureY-16)/16,0);
  if(i.kind==='hammer')a.root.position.y=cy;
  if(i.kind==='flame')a.root.position.set((pictureX+12)/16,(236-pictureY)/16,0);
  if(i.kind==='fireball'||i.kind==='star'){a.root.position.set((i.x+4)/16,(232-i.y)/16-0.5,0);}
  a.pose(i.kind==='star'||i.kind==='fireball'||i.kind==='hammer'?'spin':i.kind==='flower'?'sway':'idle',i.kind==='hammer'?(i.nativeHammer?(i.nativeHammer.state===0x81&&!s.powerChange?(s.random.frame>>2)&3:0):Math.floor(i.age/4)%4)/4*a.duration('spin'):i.kind==='fireball'?nativeFireballPhase(s.random.frame)/4*a.duration('spin'):i.age/60,s.frame);
 }
}
