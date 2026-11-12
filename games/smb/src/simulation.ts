import type {Area,Button,CannonSpec,Enemy,EnemySpec,FirebarSpec,GeneratorSpec,Item,Level,MazeSpec,NativeHammerBro,Phase,Player,ScorePopup,SpringSpec,TilePiece,Vine} from './types.js';
import {PlatformMotion,platformSupportsX,nativePlatformObject,nativePlatformHoldsSlot} from './platform-motion.js';
import {NativeMotor,motionOf} from './native-motor.js';
import type {Direction} from './native-motor.js';
import {advanceFirebarMotor,createFirebarMotor,firebarFlameCenters} from './firebar-motion.js';
import {FirebarSlots} from './firebar-slots.js';
import {PiranhaColumns} from './piranha-columns.js';
import {advanceBowserX,bowserBodyX,bowserFaceMario,bowserFlameDue,bowserFlameSpeed,bowserHopPause,createBowserMotor,nativeBowserSpawnX,BOWSER_FLAME_OFFSET_X,BOWSER_HOP} from './bowser-motion.js';
import type {FirebarGeometry,FirebarMotor} from './firebar-motion.js';
import {advanceWater,WATER_FORCES} from './water-physics.js';
import {NativeWater,whirlpoolAt,whirlpoolPull,STROKE_TIMER,NO_INPUT_Y,SWIM_DEATH_Y,SWIM_WALL_DEPTH} from './native-water.js';
import type {WhirlpoolZone} from './native-water.js';
import whirlpoolData from '../data/water-whirlpools.json';
import transitionMeasurements from '../data/transition-measurements.json';
import powerupRules from '../data/powerup-rules.json';
import enemyRules from '../data/enemy-rules.json';
import swimmingCheepRules from '../data/cheep-swimming-rules.json';
import flyingFishData from '../data/native-flying-fish.json';
import {NativeRandom} from './native-random';
import waterActorData from '../data/native-water-actors.json';
import lakituData from '../data/native-lakitu.json';
import bulletData from '../data/native-bullets.json';
import deathRules from '../data/death-rules.json';
import shellRules from '../data/shell-rules.json';
import shellLaunchRules from '../data/shell-goomba-launch-rules.json';
import stompRules from '../data/stomp-rules.json';
import {nativeHurtHeight,nativeHurtReachX} from './native-hurtbox.js';
import goombaSquashRules from '../data/goomba-squash-rules.json';
import popupRules from '../data/popup-rules.json';
import hammerBroRules from '../data/hammerbro-rules.json';
import hammerBroData from '../data/native-hammer-bros.json';
import flagRules from '../data/flag-completion-rules.json';
import castleRules from '../data/castle-completion-rules.json';
import multiCoinRules from '../data/multi-coin-rules.json';
const CONTROL_GRACE_ROWS=2; // native: an A held through the load jumps on the same row as an A first pressed on the first control row; the remake's 2-frame input queue makes that two grace rows (campaign-compare MODEL_LOCAL seeds its own constant)
export const TRANSITIONS=transitionMeasurements.runtimeCandidates;
export const POWERUPS=powerupRules.timingAndScores;
export const FLAG_COMPLETION=flagRules.runtimeCandidates;
// 6-4 native: the rescue walk starts 14 rows later (146 vs 132) and ends 16 rows later, and the load is one clock step later: native 716 rows control end -> load vs about 690; cause not found, scoped constant.
const CASTLE_END_64_EXTRA=31,CASTLE_END_EARLY=15,CASTLE_END_PHASE=2; // remake areaFrame is 166 on the first play row, so frame % 21 == 2 puts the load on (load row - first play row) = 4 mod 21
export const CASTLE_COMPLETION=castleRules.runtimeCandidates;
const PIRANHA=enemyRules.piranha;
const SWIMMING_CHEEP_SPEEDS:Record<string,number>=swimmingCheepRules.horizontalSpeedByPalette;
// Native leaping Cheep Cheep (object id 20): one 187-frame parabola; launch times, start offset and speed come from the native random register and Mario's speed (docs/NATIVE_ROLES.md).
const FLYING_FISH=flyingFishData.rules;
const WATER_RULES=waterActorData.rules;
const SWIM_GEN=waterActorData.rules.swimCheepGenerator;
const SWIM_GEN_LEVELS:Record<string,{fromCamera:number;toCamera:number;highId:number;lowId:number}|undefined>=SWIM_GEN.levels;
// Native swimming Cheep Cheep (docs/NATIVE_ROLES.md): random byte s gives the id (>= 170: the level's high id) and a height index, which moves up past the heights
// already used since the bag of eight last emptied.
export function nativeSwimCheepPick(byte:number,bag:number,level:string){
 const rule=SWIM_GEN_LEVELS[level]!;if(bag===255)bag=0;
 let q=byte&7;while(bag>>q&1)q=(q+1)&7;
 return {id:byte>=SWIM_GEN.idThreshold?rule.highId:rule.lowId,y:SWIM_GEN.heights[q],bag:bag|1<<q};
}
const PODOBOO=waterActorData.rules.podoboo; // native lava Podoboo jump (tools/derive-water-actors.mjs)
const HAMMER_BRO=hammerBroRules.motor;
const LAKITU=lakituData.rules; // native Lakitu pursuit and Spiny egg (data/native-lakitu.json, docs/NATIVE_ROLES.md, Lakitu section)
const BULLETS=bulletData.rules; // native Bullet Bill cannons and 5-3/6-3 generator (data/native-bullets.json, docs/NATIVE_ROLES.md, Bullet Bill section)
const HAMMER_NATIVE=hammerBroData.rules; // native Hammer Bro roster, clock patrol, hammers and jumps (data/native-hammer-bros.json, docs/NATIVE_ROLES.md, Hammer Bro section)
// Area D: measured native contact reach (x distance) at which a walking enemy turns away from a squashed Goomba / a stationary shell.
const CORPSE_TURN_REACH=11,SHELL_TURN_REACH=13;
export function multiCoinExpiry(firstHitFrame:number){
 const {periodActiveNativeFrames:period,additionalQuantaAfterNextBoundary:quanta,phaseAtFreshReset:phase}=multiCoinRules;
 return phase+Math.ceil((firstHitFrame-phase)/period)*period+quanta*period;
}
// Native swimming Cheep Cheep height: constant, or a bobbing fish moves 1 px every 8 frames, 15 steps first and 30 per later leg (+-15 around its
// spawn height), each turn costing one more frame (tools/derive-water-actors.mjs). `k` is the frame count since the fish appeared.
export function swimBobOffset(bob:{dir:number;first:number}|undefined,k:number){
 if(!bob||k<bob.first)return 0;
 let t=k-bob.first,dir=bob.dir,offset=0,steps=15;
 for(;;){
  const length=8*(steps-1)+1;
  if(t<length)return offset+dir*(Math.floor(t/8)+1);
  offset+=dir*steps;t-=length;dir=-dir;steps=30;
 }
}
const hammerRandom=(state:number)=>(Math.imul(state,1664525)+1013904223)>>>0;
export const NATIVE_HZ=60.0988;
const AIR_CONTACT_CAMERA_HOLD=18;
// Native rows (RAM 0x500 collision map, 0x416 y sub-pixel, 0x70a fall class): feet this deep in a cell do not land; a fall before any jump of the area uses 40/256.
const FOOT_LAND_DEPTH=5,FALL_GRAVITY_AFTER_LOAD=0.15625;
export const PHYSICS={walkMax:1.5,runMax:2.5,walkAccel:0.037353515625,runAccel:0.0557861328125,brake:0.037109375,reverse:0.109375,jump:-4,runJump:-5,heldGravity:0.125,gravity:0.4375,maxFall:4.125};
// Small-player fit; three 3px discrepancies still exceed the unchanged 2px limit.
export const WATER_PHYSICS={groundMax:1,swimMax:1.5,accel:0.0390625,reverse:0.1044921875,brake:0.03759765625,entryGravity:0.1015625,...WATER_FORCES};
// Image samples support growth≈0.5 and up≈0.875px/native frame. Downward speed
// is inferred from a cap-limited sample; automatic-entry timing remains unmeasured.
export const VINE_PHYSICS={growth:0.5,climbUp:0.875,climbDown:1.5};
// Effective green-bounce fit; initial spawn phase remains unmeasured.
// See data/paratroopa-physics-candidate.json for independent trajectory checks.
export const GREEN_PARATROOPA_PHYSICS={gravity:7/64,bounce:-3.09375,maxFall:3.09375};
// Native-measured Paratroopa/Beetle rules, see evidence/paratroopa-beetle-findings-20261109.md. Contact with the floor only registers once the
// downward speed has reached 1 px per native frame (a Paratroopa that starts at rest on the floor sinks about 5 px and hops at age 11), and a
// sink of 5 px or more is a side collision that turns it around. The side probe of Paratroopas and Beetles sits at x (left) and x+16 (right), 5 px above the feet; the older 15/1 probe 8 px above the feet is kept for other walkers.
export const GREEN_PARATROOPA_LANDING={landingSpeed:1,sinkTurnDepth:5,sideProbe:{right:16,left:0,heightAboveFeet:5}};
const greenSpawnVy=(e:EnemySpec)=>e.kind==='paratroopa'&&e.palette!=='0f-16-30-27'&&(e.paratroopaMotion??'bounce')==='bounce'?(e.spawnVy??0)-GREEN_PARATROOPA_PHYSICS.gravity:0;
const isGreenParatroopa=(e:EnemySpec)=>e.kind==='paratroopa'&&e.palette!=='0f-16-30-27';
// Native Paratroopa and Beetle pairs turn each other around once when their boxes first overlap (|dx| < 12, |dy| < 8 over 14 measured bumps,
// including two Paratroopas that had already passed each other); they are not turned again until they have separated.
const bumpsOnOverlap=(a:{kind:string},b:{kind:string})=>['paratroopa','beetle'].some(k=>a.kind===k||b.kind===k);
const wallReach=(e:{kind:string},dx:number)=>e.kind==='paratroopa'||e.kind==='beetle'?(dx>0?GREEN_PARATROOPA_LANDING.sideProbe.right-15:GREEN_PARATROOPA_LANDING.sideProbe.left-1):0;
const nativeWalkerWallTurn=(kind:string)=>kind==='goomba'||kind==='koopa'||kind==='redKoopa';
const wallHeight=(e:{kind:string})=>e.kind==='paratroopa'||e.kind==='beetle'?GREEN_PARATROOPA_LANDING.sideProbe.heightAboveFeet:8;
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
const overlap=(ax:number,ay:number,aw:number,ah:number,bx:number,by:number,bw:number,bh:number)=>ax<bx+bw&&ax+aw>bx&&ay<by+bh&&ay+ah>by;
const isHitBlock=(id:number)=>(id>=81&&id<=96)||id===192||id===193||id===196;
// Native head probe (8-4 area-2 block, 16 branches): with the head inside the block a hidden block is not hit while the low nybble of Mario's y is below 4 (feet 160..162 pass, 158/159/165 hit).
const hiddenBlockBumps=(feet:number)=>(Math.floor(feet)&15)>=4;
export function solid(id:number):boolean {
 return (id>=16&&id<=21)||(id>=22&&id<=27)||id===34||(id>=81&&id<=94)||(id>=97&&id<=108)||id===136||id===137||id===192||id===193||id===196;
}
// Native lives-screen / death flow (PPU rows, remake step f = native row f-1); see evidence/lifeflow-findings-20261111.md.
const LIFE_FLOW={clockPeriod:21,clockTickPhase:7,screenTail:19,screenBlackTail:3,ticksScreen:7,ticksTimeUp:14,controlPhase:5,pitEndFeetY:1312,setTitle:8,setDeath:10,deathArcEndFeetY:802,pitStartFeetY:240,gameoverSet:9,gameoverTicks:20,gameoverTail:2};
interface LifeIntro{set:number;ticks:number;seen:number;end:number;fromDeath:boolean;timeUp:boolean}
const newLifeIntro=(timeUp:boolean,fromDeath:boolean):LifeIntro=>({set:fromDeath?LIFE_FLOW.setDeath:LIFE_FLOW.setTitle,ticks:timeUp?LIFE_FLOW.ticksTimeUp:LIFE_FLOW.ticksScreen,seen:0,end:0,fromDeath,timeUp});
interface Slot {level:number;lives:number;score:number;coins:number;size:0|1|2;checkpoint:boolean;checkpointArea?:string}
interface MazeState {spec:MazeSpec;sourceFrom:number;sourceTo:number;gate:number;completed:boolean}
// Native 4-2 area-3 (r6 mood2 rows 709-712): Down held while still falling (y 127, vy 4) one row above the bonus pipe top does not enter; Mario lands
// at x 1358 next row, outside the entry range. Down pipes are entered only from footing (grounded).
export function downPipeFooting(p:{grounded:boolean}):boolean{return p.grounded;}
// Native 7-1 (r4 mood5 rows 2394-2406, branching probe): Down+Right (or Down+Left) held on the LANDING frame onto the pipe top enters (x 1495, 1493),
// while Down+Right held after Mario already stood there never enters (x 1496..1503, and r1 6-2 mood6, r4 2-1 mood3). Left/Right only block from footing.
export function downPipeLateralBlocks(wasGrounded:boolean,b:{has(k:'left'|'right'):boolean}):boolean{return wasGrounded&&(b.has('right')||b.has('left'));}
export class Simulation {
 levels:Level[]; levelIndex=0; area!:Area; tiles=new Map<string,number>(); freeTiles:TilePiece[]=[]; frame=0; areaFrame=0; areaPlayFrame=0; camera=0;
 player!:Player; enemies:Enemy[]=[]; items:Item[]=[]; popups:ScorePopup[]=[]; phase:Phase='title'; phaseFrame=0; titleFrame=0;
 locomotionPose:{kind:'stand'|'walk'|'skid'|'jump';frame:number;facing:number}={kind:'stand',frame:0,facing:1};
 private walkPoseTimer=0;private jumpPose=false;
 wallDisplayPose?:{kind:'walk';frame:number;facing:number};private wallDisplayTimer=0;
 private offscreenLavaDeath=false;
 private offscreenPitDeath=false;
 private offscreenDeathRows=0;
 private timeUpDeath=false;
 private lastJumpFallForce=0.5625;
 private fallingThroughCastleLava=false;
 private cameraAfterContact=false;private cameraHold=0;private cameraContactAir=false;
 private stompChain=0;
 private stompedThisStep=false;
 private corpsePlatformSlotEnd=new Map<Enemy,number>();
 private activatedHidden1ups=new Set<string>();
 private multiCoinExpiries=new Map<string,number>();
 swimPoseFrame=0;private swimAnimationFrame=0;private swimPoseTimer=0;private swimPoseWindow=0;
 lives=3; score=0; coins=0; time=400; paused=false; muted=false; twoPlayer=false; currentPlayer=0;
 private gameoverClosingFrame=-1;private gameoverSkipDelay=0;introFromGameover=false;
 slots:Slot[]=[]; events:string[]=[]; checkpoint=false; previous=new Set<Button>(); timerFrames=0;
 private activatedCheckpointArea?:string;
 castleStage:'bridge'|'fall'|'walk'|'message'='bridge';castleArrivalFrame=0;
 private castleFallingBosses:Enemy[]=[];private castleBraking=false;private castleScroll=0;
 flagTop=49;flagInside=false;flagBonus=0;private flagWait=0;
 private flagFireworkCount=0;private flagFireworksAwarded=0;private flagCastleGeometry?:{x:number;roofY:number};
 powerChange?:{from:0|1|2;to:0|1|2;remaining:number;kind:'grow'|'fire'|'shrink'};
 private waterEntryFall=false;private waterSurface={active:false,contacted:false};
 private introLength=TRANSITIONS.introFrames;private lifeIntro?:LifeIntro;private deathFromBelow=false;private gameoverEnd=0;private lifeFrozen=0;private lifeRow=0;private pipeWalkSpeed=0;private pipeWalkRun=false;private entryLanding=false;
 private entryFalling=false;private entryFallAge=0;private entryInputDelay=-1;private entryTimerDelay=-1;
 private slotCamera=0;private slotScroll=false;private slotSub=[0,0,0,0,0]; // native sub-pixel byte left in each enemy slot (docs/NATIVE_ROLES.md, Object slots): a new walker starts with it; every area load (level, pipe, respawn) clears it
 private pipeRise=0;broClock=0;random=new NativeRandom();recordedRoute=false; /* set by the route comparison: its fish and cannons replay the recorded attempts, whose hidden slot state a re-seeded replay cannot reproduce */private fishTimer=0;private swimTimer=0;private swimBag=0;private marioMotion=1;private cannonTable:{cannon:CannonSpec;timer:number}[]=[];private cannonsLoaded=0;
 private platformMotion=new PlatformMotion({levelId:'',areaId:''});private platformFrame=0;
 private firebarMotors=new Map<FirebarSpec,{state:FirebarMotor;geometry:FirebarGeometry}>();private firebarDeathFrame=0;private firebarSlots?:FirebarSlots;
 private bridge:string[]=[];private springTimers=new Map<SpringSpec,number>();private mazeStates:MazeState[]=[];private mazeSource!:Area;
 vines:Vine[]=[];private climbingVine?:Vine;private vineProgress=new Map<string,number>();private vineDetached=false;private entryVineActive=false;private autoVineActive=false;private entryVineStage:'grow'|'climb'|'right'|'fall'='climb';
 warpZoneActive=false;
 private footPushed=false;private piranhaTouchFeetY?:number;private landingFraction=0;private fallGravity=FALL_GRAVITY_AFTER_LOAD;private walkingOff=false;
 private motor=new NativeMotor();private wallMediumJump=false;private wallSpeed?:number;private wallBackOut=false;
 /** Native-exact swimming (src/native-water.ts): active in water areas once the legacy entry fall is over. */
 private water=new NativeWater();private swimActive=false;private swimDy=0;private swimPull=0;private swimLock=0;private swimDirection:Direction=0;
 /** The first controlled swim frame of a room load or respawn counts a held A as a fresh press (native rows: the stroke lands on the first control row whatever was held before). */
 private swimFreshA=false;
 bump=new Map<string,number>(); readonly usedBlockRehits=new Set<string>(); private destination?:{area:string;level?:string;spawn:[number,number];camera?:number;direction:string;frames:number;smallPlayerRoomPreviewFrames?:number;smallPlayerRoomEntry?:{transitionFrames:number;spawnFeetY:number;initialVy:number;gravity:number};ordinaryEnemyFrontier?:number;returnCloudOffsetX?:number;riseFrames?:number}; private inputs:Set<Button>[]=[new Set(),new Set()]; private pauseCooldown=0;private airRunning=false;private mediumJump=false;private runJump=false;private headBumped=false;private brokenBrick?:{key:string;rows:number};private bouncing=false; private braking=PHYSICS.brake;private skidAccel=0; private jumpHeld=0;private jumpArc=false;private landJump:'inactive'|'held'|'released'='inactive'; private lastFire=-12;
 constructor(levels:Level[]){if(!levels.length)throw new Error('No observed level data');this.levels=levels;this.reset();}
 get level(){return this.levels[this.levelIndex];}
 get height(){return this.player.size>0&&!this.player.duck?28:12;}
 get fireballThrowAge(){return this.lastFire<0?-1:this.frame-this.lastFire;}
 castleBowserFalls(e:Enemy){return this.castleFallingBosses.includes(e);}
 get vineEntryStage(){return this.entryVineActive?this.entryVineStage:undefined;}
 get pipeRising(){return this.pipeRise>0;}
 /** True while the native entry is still engine 7 (no control): the underground fall's first 17 rows, the water room's 34-row fall to native y 49. */
 get entryControlLocked(){const native=this.entryFalling?this.area.entryFall?.native:undefined;return native?this.entryFallAge<native.timerAge:this.swimLock>0;}
 get pipeHidden(){return this.phase==='pipe'&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=(this.area.autoWalk?TRANSITIONS.autoWalkPipe.hiddenFrame:32));}
 /** Native time-out: a TIME UP screen for the first 7 clock ticks of the 14, then the ordinary lives screen. */
 get timeUpScreen(){return this.phase==='intro'&&Boolean(this.lifeIntro?.timeUp)&&this.lifeIntro!.seen<LIFE_FLOW.ticksScreen;}
 get introHiddenLate(){return this.lifeIntro?this.lifeIntro.end>0&&this.phaseFrame>=this.lifeIntro.end-LIFE_FLOW.screenBlackTail:this.phaseFrame>=TRANSITIONS.introHiddenFromFrame;}
 get gameoverClosing(){return this.phase==='gameover'&&this.gameoverClosingFrame>=0;}
 get pipePreviewArea(){const d=this.destination;if(this.phase!=='pipe'||this.player.size!==0||!d?.smallPlayerRoomPreviewFrames||d.frames-this.phaseFrame>d.smallPlayerRoomPreviewFrames)return undefined;return this.level.areas.find(a=>a.id===d.area);}
 get pipeLoading(){return this.phase==='pipe'&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=this.destination.frames-TRANSITIONS.pipeBlackoutFinalFrames); }
 get pipeClearing(){return this.phase==='pipe'&&!this.area.autoWalk&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=48&&this.phaseFrame<this.destination.frames-TRANSITIONS.pipeBlackoutFinalFrames);}
 get entryFallHidden(){return this.entryFalling&&this.entryFallAge<=(this.area.entryFall?.visibleDelay??0);}
 get waterEntryStanding(){return this.entryFalling&&this.area.theme==='water'&&this.entryFallAge<=(this.area.entryFall?.initialStandFrames??0);}
 get entryFallPose(){return this.entryFalling&&this.area.theme!=='water';}
 get entryTimerHidden(){return Boolean(this.area.entryFall&&this.entryTimerDelay!==0);}
 private walkGroundFrames=0;
 // Area jumpoff: a Mario who stood for 2+ frames and loses support without a jump (ledge or platform edge) at a run-class speed byte (>= 25) keeps the run air class: native walk-offs at
 // byte 40 go on accelerating to 40 even after a walk-class jump (3-3 rows 25516-25518; the stale class capped the remake at byte 24 in one frame). The stand count excludes one-frame
 // landing flickers. Walk-class walk-offs keep the existing behaviour (forcing the walk class changed 4-4 only through a missed re-seed).
 private classifyWalkOff(wasGrounded:boolean,jumped:boolean){
  const p=this.player,plain=this.area.theme!=='water'&&!this.entryFalling&&!p.climbing;
  if(p.grounded&&plain){this.walkGroundFrames=wasGrounded?this.walkGroundFrames+1:1;return;}
  if(plain&&wasGrounded&&!jumped&&this.walkGroundFrames>=2&&Math.abs(Math.floor(Math.round(p.vx*4096)/256))>=25)this.motor.airRun=true;
  this.walkGroundFrames=0;
 }
 reset(playing=false){
  this.frame=0;this.lifeRow=0;this.lifeFrozen=0;this.lifeIntro=undefined;this.levelIndex=0;this.lives=3;this.score=0;this.coins=0;this.currentPlayer=0;this.checkpoint=false;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.introFromGameover=false;
  this.activatedCheckpointArea=undefined;
  this.slots=[0,1].map(()=>({level:0,lives:3,score:0,coins:0,size:0,checkpoint:false}));this.previous.clear();this.inputs=[new Set(),new Set()];this.events=[];this.paused=false;this.pauseCooldown=0;
  this.destination=undefined;this.lastFire=-12;this.airRunning=false;this.runJump=false;this.mediumJump=false;this.bouncing=false;this.braking=PHYSICS.brake;this.skidAccel=0;this.motor.reset();this.jumpHeld=0;this.landJump='inactive';
  this.vineProgress.clear();this.climbingVine=undefined;this.activatedHidden1ups.clear();
  if(this.player)this.player.size=0;this.loadArea(this.level.main);this.timerFrames=this.level.id==='1-1'?TRANSITIONS.freshReferenceResetTimerFrames:0;if(this.level.id==='1-1'){this.areaFrame=FLAG_COMPLETION.freshAreaFrame;this.broClock=HAMMER_NATIVE.freshClock;}/* the recorded 1-1 route's area clock phase: its level end falls on native row 1975 */if(!playing)this.events=['command_silence'];this.phase=playing?'play':'title';this.phaseFrame=0;this.titleFrame=0;
 }
 loadArea(id:string,spawn?:[number,number],camera?:number,preserveTimer=false){
  this.piranhaTouchFeetY=undefined;this.fallGravity=FALL_GRAVITY_AFTER_LOAD;this.landingFraction=0;this.walkingOff=false;this.wallMediumJump=false;
  this.fallingThroughCastleLava=false;
  this.corpsePlatformSlotEnd.clear();
  this.motor.runGrace=0;
  const source=this.level.areas.find(a=>a.id===id);if(!source)throw new Error(`Unmapped area ${this.level.id}/${id}`);
  this.stompChain=0;
  this.multiCoinExpiries.clear();
  // Stream inserts belong to this visit. Reset/death must reload the explicit
  // observed map rather than retain a previous failed route's extra sections.
  const area=structuredClone(source);this.mazeSource=source;
  this.cameraAfterContact=false;
  this.platformMotion.reset({levelId:this.level.id,areaId:id});this.platformFrame=0;
  const size=this.player?.size??0;this.area=area;this.tiles=new Map(area.tiles.map(([x,y,id])=>[`${x},${y}`,id]));this.freeTiles=(area.freeTiles??[]).map(t=>({...t}));
  // 2-4: the first two slots retain Podoboo fall-speed byte3 as their angle.
  // 2-4 first five / 6-4 first four bars have measured allocation; later mixed
  // slots retain their existing motors. 3-4 bars2/3 use fresh slots; bar1 keeps its qualified motor.
  this.firebarSlots=this.level.id==='1-4'?new FirebarSlots(area.firebars??[]):this.level.id==='2-4'?new FirebarSlots((area.firebars??[]).slice(0,5),[864,864,768,768,768]):this.level.id==='6-4'?new FirebarSlots((area.firebars??[]).slice(0,4)):this.level.id==='3-4'?new FirebarSlots((area.firebars??[]).slice(1,3)):this.level.id==='5-4'?new FirebarSlots((area.firebars??[]).filter(b=>b.x===376&&b.length===12)):undefined;
  this.firebarMotors.clear();
  for(const bar of area.firebars??[])if(bar.motor&&bar.length===6)this.firebarMotors.set(bar,{state:createFirebarMotor(bar.motor),geometry:{x:bar.x,y:bar.y,length:6}});
  // Activation consumes a hidden1up across ordinary deaths; its used block reloads blank.
  for(const[key,id]of this.tiles)if(id===96&&this.activatedHidden1ups.has(`${this.currentPlayer}/${this.level.id}/${area.id}/${key}`))this.tiles.delete(key);
  this.warpZoneActive=false;
  this.vines=(area.vines??[]).map(v=>{const height=this.vineProgress.get(this.vineKey(v.id))??v.initialHeight??0;return {...v,height,growing:height>0&&height<v.baseY-v.topY};});this.climbingVine=undefined;this.vineDetached=false;
  for(const block of area.blockContents??[])if(block.kind==='vine'&&this.vineProgress.has(this.vineKey(block.vineId)))this.tiles.set(`${block.col},${block.row}`,196);
  const [x,y]=spawn??area.spawn;this.player={x,y,vx:area.spawnVelocity?.[0]??0,vy:area.spawnVelocity?.[1]??0,grounded:true,facing:1,size,invincible:0,star:0,duck:false,anim:0,dead:false,climbing:false};
  this.airRunning=false;this.mediumJump=false;this.runJump=false;this.bouncing=false;this.braking=PHYSICS.brake;this.skidAccel=0;this.motor.reset(0,1);this.jumpHeld=0;this.landJump='inactive';
  this.powerChange=undefined;
  const spawnAtEntry=!spawn||spawn[0]===area.spawn[0]&&spawn[1]===area.spawn[1];
  this.waterEntryFall=Boolean(area.waterEntryFall&&spawnAtEntry);this.waterSurface={active:false,contacted:false};
  this.startSwim(spawnAtEntry,preserveTimer);
  this.entryFalling=Boolean(area.entryFall&&spawnAtEntry);this.entryFallAge=0;this.entryInputDelay=this.entryFalling?-1:0;this.entryTimerDelay=this.entryFalling?-1:0;
  this.entryFallFacing(area);
  this.entryVineActive=Boolean(area.entryVine);this.autoVineActive=false;this.entryVineStage='climb';
  if(area.entryVine){
   this.climbingVine=this.vines.find(v=>v.id===area.entryVine!.vineId)!;
   if(area.entryVine.waitUntilGrowthComplete&&this.climbingVine.height<this.climbingVine.baseY-this.climbingVine.topY){this.climbingVine.growing=true;this.entryVineStage='grow';}
   this.player.climbing=this.entryVineStage==='climb';
  }
  this.player.grounded=this.isSolid(x+8,y);this.camera=camera??area.camera??Math.max(0,x-112);this.areaFrame=0;this.areaPlayFrame=0;this.slotSub=[0,0,0,0,0];this.fishTimer=0;this.fishCamera=undefined;this.swimTimer=0;this.swimBag=0;this.cannonTable=[];this.cannonsLoaded=0;this.enemies=area.enemies.map(e=>this.makeEnemy(e));for(const e of this.enemies)if(e.kind==='bowser')e.x=e.originX=nativeBowserSpawnX(this.level.id,e.x);
  this.piranhaColumns=this.level.id==='5-1'?new PiranhaColumns(this.camera):undefined;
  this.bindNativeHammerBros();
  this.locomotionPose={kind:'stand',frame:0,facing:1};this.walkPoseTimer=0;this.jumpPose=false;this.wallDisplayPose=undefined;this.wallDisplayTimer=0;
  this.swimPoseFrame=0;this.swimAnimationFrame=0;this.swimPoseTimer=0;this.swimPoseWindow=0;
  this.springTimers.clear();this.mazeStates=[...area.mazes??[],...area.maze?[area.maze]:[]].map(spec=>({spec,sourceFrom:spec.loopTo,sourceTo:spec.loopAt,gate:0,completed:false}));this.bridge=[];this.castleStage='bridge';this.castleArrivalFrame=0;this.castleFallingBosses=[];this.castleBraking=false;this.castleScroll=this.camera;
  this.flagTop=48;this.flagInside=false;this.flagBonus=0;this.flagWait=0;
  this.items=[];this.popups=[];this.bump.clear();this.usedBlockRehits.clear();if(!preserveTimer){this.time=this.level.time;this.timerFrames=0;}
  this.emit(this.areaMusic());
 }
 private emit(id:string){this.events.push(id);}
 private areaMusic(){const area=this.area;return `music_${area.entryVine?'cloud':area.theme==='underground'?'underground':area.theme==='water'?'water':area.theme==='castle'?'castle':'ground'}${this.time<=100?'_hurry':''}`;}
 private awardPopup(value:number|'1up',x:number,y:number,life:number,victim?:Enemy){
  this.popups.push({value,x:Math.floor(x-this.camera),y:Math.floor(y),age:0,life,victim});
 }
 private advancePopups(){
  for(const popup of this.popups){popup.age++;popup.y--;}
  this.popups=this.popups.filter(popup=>popup.age<popup.life&&(!popup.victim||popup.victim.dead<90));
 }
 /** Native walker groups are created from the screen, not the map (first rows over 25 runs: 704..708 at one group, x - Mario a constant 143), so a group whose trigger the camera passed by n px appears n px further right, followers included. Lone walkers keep a fixed x. */
 private spawnGroupShift(e:Enemy){
  if(!e.spawnCamera||!['goomba','koopa','redKoopa','beetle'].includes(e.kind))return 0;
  const shift=Math.floor(this.camera)-e.spawnCamera; // under 3 px is the camera phase of the recorded trigger; far past it is a load, not a scroll
  return shift>=3&&shift<=8&&this.enemies.some(o=>o!==e&&o.spawnCamera===e.spawnCamera&&o.kind===e.kind)?shift:0;
 }
 /** Native stomp chain (score digits, 25 chains): 100 200 400 500 800. A second enemy stomped on the same row skips a step and does not advance after it (100 + 400, then 400: 8-4 rows 75586/75606). */
 private stompAward(){const t=stompRules.scores,second=this.stompedThisStep;if(second)this.stompChain++;const award=t[Math.min(this.stompChain,t.length-1)];if(!second)this.stompChain++;return award;}
 /** A shell kick pays two steps above the chain and leaves it alone (400 at rest, 500 after one stomp, 800 after two: 3-2 row 26150, 6-2 row 49002, 1-2 in five model runs). */
 private shellKickAward(){const t=stompRules.scores;return t[Math.min(this.stompChain+2,t.length-1)];}
 /** Falling onto a resting shell kicks it without a bounce (he keeps falling at his speed), to the right unless Mario is 3+ px right of it (12 native kicks: +2 right, +3 left). */
 private kickRestingShellFromAbove(e:Enemy,oldBottom:number){
  const p=this.player;if(!e.shell||e.movingShell||p.vy<=0||oldBottom>e.y+1)return false;
  e.movingShell=true;e.shellAge=0;e.shellChain=0;e.kickOverlap=true;e.vx=(p.x-e.x<3?1:-1)*shellRules.speedPixelsPerNativeFrame;this.score+=this.shellKickAward();this.emit('sfx_kick');return true;
 }
 private makeEnemy(e:EnemySpec):Enemy{return {...e,autoPhase:e.kind==='piranha'&&e.phase===undefined?true:undefined,phase:e.phase??(e.kind==='piranha'?(Math.abs(this.player.x-e.x)<=PIRANHA.proximity.maximumInhibitedIntegerSeparation?PIRANHA.stages[1].fromPhaseInclusive:PIRANHA.initialPhase):undefined),vx:(e.direction??-1)*0.5,vy:greenSpawnVy(e),active:false,dead:0,shell:false,movingShell:false,age:0,y:e.y+(e.spawnYFraction??0),originX:e.x,originY:e.y,hp:5,unwingedAir:e.spawnUnwinged?-1:undefined};} // spawnUnwinged: a route Koopa that natively first appears as a just-stomped Paratroopa (state 1, untouchable until it lands)
 step(buttons:Button[],frames=1,buttons2:Button[]=[]){
  if(!Number.isInteger(frames)||frames<0||frames>18000)throw new Error('frames must be an integer in 0..18000');
  const held=[new Set(buttons),new Set(buttons2)];
  for(let i=0;i<frames;i++){
   const player=this.phase==='title'||!this.twoPlayer?0:this.currentPlayer;
   this.inputs.push(new Set(held[player]));const effective=this.inputs.shift()!;
   for(const key of ['start','select'] as Button[]){if(held[0].has(key)||(this.phase==='title'&&held[1].has(key)))effective.add(key);else effective.delete(key);}
   {const fresh=this.freshA,grace=this.phase==='play'&&this.controlGrace>0;if(grace){effective.delete('a');this.controlGrace--;}this.update(effective);if(fresh&&!grace)this.freshA=false;}this.previous=effective;
  }
 }
 private update(b:Set<Button>){
  this.lifeRow++;this.random.tick();
  const pressed=(key:Button)=>b.has(key)&&(!this.previous.has(key)||(key==='a'&&this.freshA));
  if(this.phase==='title'){
   this.titleFrame++;
   if(b.has('select')&&b.has('start'))return;
   if(pressed('select'))this.twoPlayer=!this.twoPlayer;
   if(pressed('start')){this.phase='intro';this.phaseFrame=0;this.introLength=TRANSITIONS.introFrames;this.lifeIntro=newLifeIntro(false,false);this.timerFrames=0;this.emit('silence');}
   return;
  }
  const canPause=this.phase==='play'||this.phase==='flag';
  if(canPause&&this.pauseCooldown>0)this.pauseCooldown--;
  if(pressed('start')&&canPause&&this.pauseCooldown===0){this.paused=!this.paused;this.pauseCooldown=45;this.emit(this.paused?'pause':'unpause');}
  if(this.paused){this.lifeFrozen++;return;}
  this.frame++;this.phaseFrame++;this.areaFrame++;this.advancePopups();
  this.lifeClockFreeze();
  if(this.phase==='intro'&&this.lifeIntro){if(this.lifeIntroDone())this.startPlayAfterIntro();return;}
  if(this.phase==='intro') {if(this.phaseFrame>=this.introLength){this.phase='play';this.freshA=true;this.controlGrace=CONTROL_GRACE_ROWS;this.phaseFrame=0;this.introFromGameover=false;this.lifeClockAtControl();this.emit(this.areaMusic());}return;}
  if(this.phase==='gameover'){
   if(this.gameoverClosingFrame>=0){if(++this.gameoverClosingFrame>=(this.twoPlayer&&this.slots[1-this.currentPlayer].lives>0?6:26))this.finishGameover();}
   else if(this.gameoverSkipDelay>0){if(--this.gameoverSkipDelay===0)this.gameoverClosingFrame=0;}
   else if(pressed('start'))this.gameoverSkipDelay=4;
   // Visible source durations vary; this timer is a provisional approximation.
   else if(this.gameoverEnd>0&&this.phaseFrame>=this.gameoverEnd-26)this.gameoverClosingFrame=0;
   return;
  }
  if(this.phase==='ending'){if(pressed('start'))this.restartToTitle();return;}
  if(this.phase==='dying'){
   this.updateWorldInPitFall();
   if(!this.offscreenLavaDeath&&!this.offscreenPitDeath&&this.phaseFrame>deathRules.freezeFrames){this.player.y+=this.player.vy;this.player.vy=Math.min(deathRules.maxFall,this.player.vy+deathRules.gravity);}
   if(this.offscreenLavaDeath||this.offscreenPitDeath?this.phaseFrame>=this.offscreenDeathRows:(this.deathFromBelow?this.phaseFrame>=deathRules.oldSceneFrames:this.player.y>=LIFE_FLOW.deathArcEndFeetY))this.respawn();return;
  }
  if(this.phase==='pipe'){
   const automatic=this.destination&&this.destination.frames>64;
   if(this.area.autoWalk&&this.destination?.direction==='right')this.autoWalkPipeStep();
   else if(automatic&&this.destination?.direction==='right'&&this.area.pipes?.some(q=>q.direction==='right'&&q.to===this.destination!.area&&q.entryTriggerX!==undefined))this.sidePipeWalkStep();
   else if(!automatic||this.phaseFrame<=TRANSITIONS.pipeMotionFrames){
    if(this.destination?.direction==='right')this.player.x+=automatic?TRANSITIONS.pipeMotionSpeed:0.5;else this.player.y+=this.destination?.direction==='up'?-0.5:(automatic&&this.player.size===0?1:0.5);
   }
   if(this.destination&&this.phaseFrame===this.destination.frames){
    const target=this.destination;this.destination=undefined;
    if(target.level){
     const index=this.levels.findIndex(level=>level.id===target.level);if(index<0)throw new Error(`Unmapped warp level ${target.level}`);
     this.levelIndex=index;this.checkpoint=false;this.activatedCheckpointArea=undefined;this.vineProgress.clear();this.loadArea(target.area,target.spawn,target.camera);this.phase='intro';this.introLength=TRANSITIONS.introFrames;this.emit('command_silence');
    }else{
     this.enterArea(target.area,target.spawn,target.camera,target.ordinaryEnemyFrontier);
     if(target.riseFrames)this.beginPipeRise(target.riseFrames);
     if(target.smallPlayerRoomEntry){this.player.y=target.smallPlayerRoomEntry.spawnFeetY;this.player.vy=target.smallPlayerRoomEntry.initialVy;this.area.entryFall!.gravity=target.smallPlayerRoomEntry.gravity;}
     if(target.returnCloudOffsetX){
      // Return images register these non-solid cloud pieces two pixels right;
      // the native rendering/camera mechanism remains unmeasured.
      const shift=target.returnCloudOffsetX,isCloud=(id:number)=>id>=128&&id<=133;
      if(this.area.decorations)this.area.decorations=this.area.decorations.map(d=>isCloud(d.id)?{...d,x:d.x+shift}:d);
      this.freeTiles=this.freeTiles.map(t=>isCloud(t.id)?{...t,x:t.x+shift}:t);
     }
     this.phase='play';
    }
    this.phaseFrame=0;
   }
   return;
  }
  if(this.phase==='castle'){this.updateCastle();return;}
  if(this.phase==='flag'){this.updateFlag();return;}
  if(this.powerChange){this.lifeFrozen++;if(--this.powerChange.remaining===0){this.player.size=this.powerChange.to;this.powerChange=undefined;}return;}
  this.platformFrame++;
  if(this.area.autoWalk&&this.phaseFrame<=TRANSITIONS.autoWalkDelayFrames)return;
  if(this.pipeRise>0){this.updatePipeRise();return;}
  const entry=this.area.entryFall;
  // Native underground entry (rows 2500..2551 of 1-2): fall physics and control timing count steps since the area load.
  const nativeEntry=this.entryFalling?entry?.native:undefined;
  // The fall is timeline-driven but input-driven speed lags it by one frame, so the row after the landing still takes the air step (native row 51: +152, then +228).
  const landingGrace=this.entryLanding;this.entryLanding=false;
  if(nativeEntry){this.entryFallAge++;if(this.entryFallAge<nativeEntry.inputAge)b=new Set<Button>();}
  else if(this.entryFalling){
   this.entryFallAge++;if(this.entryFallHidden&&!this.swimActive){if(this.entryFallAge>entry!.enemyDelay)this.updateEnemies(this.player.y);return;}
   if(this.waterEntryStanding&&!this.swimActive){this.updateEnemies(this.player.y);return;}
   if(this.player.y>=entry!.controlFeetY){
    this.entryInputDelay=this.entryInputDelay<0?entry!.inputDelay:Math.max(0,this.entryInputDelay-1);
    this.entryTimerDelay=this.entryTimerDelay<0?entry!.timerDelay:Math.max(0,this.entryTimerDelay-1);
   }
   if(this.level.id==='1-1'&&this.area.id==='bonus-coins'&&this.player.size===0&&this.entryFallAge===13){this.entryTimerDelay=0;this.timerFrames=23;}
   if(this.entryInputDelay!==0)b=new Set<Button>();
  }
  // Source TIME stays fixed during the automatic main climb and sky entry;
  // exact native-frame boundaries are inferred from decision-spaced images.
  if(!this.entryVineActive&&!this.autoVineActive&&!this.area.autoWalk&&!this.entryTimerHidden){this.timerFrames++;if(this.timerFrames>=24){this.timerFrames=0;/* native: Mario dies one full tick after the digits reach 000 (1-4 row 15044 -> death 15068) */if(this.time<=0){this.timeUpDeath=true;this.die();return;}this.time--;if(this.time===100)this.emit('event_hurry');}}
  if(nativeEntry&&this.entryFallAge>=nativeEntry.timerAge)this.entryTimerDelay=0;
  this.piranhaTouchFeetY=undefined;
  const p=this.player;const oldBottom=p.y;const oldX=p.x;const poseGrounded=p.grounded,poseVx=p.vx,poseEvents=this.events.length;
  let cameraAttemptX:number|undefined,cameraAttemptVx=0,cameraMotion:number|undefined;
  p.invincible=Math.max(0,p.invincible-1);if(p.star===1)this.emit(this.areaMusic());p.star=Math.max(0,p.star-1);p.duck=this.nextDuck(b);this.finishBrickBreak();
  if(this.area.autoWalk)b=new Set<Button>(['right']);
  this.growVines();const vineMovement=this.moveOnVine(b,pressed('a'));if(vineMovement==='transition')return;
  if(!vineMovement){
  const direction=Number(b.has('right'))-Number(b.has('left'));
  const water=this.area.theme==='water';
  const runPressed=b.has('b')&&!water&&!this.entryFalling;
  // B refreshes the run grace on ground frames only: an airborne B does not carry the run speed into the landing (native free play r3+r4: a run-speed
  // landing without B clamps to the walk cap on 203 of 203 rows whose previous, airborne row held B).
  const refreshRun=(p.grounded||this.springTimers.size>0)&&runPressed&&direction!==0&&p.vx*direction>=0&&!(b.has('down')&&p.grounded)&&!this.restTurnStart(direction);if(direction!==0&&p.vx*direction<0&&Math.abs(p.vx)>=11/16)this.motor.runGrace=0; // a grounded Down frame ignores the direction, so it does not refresh the run grace (native explore rows)
  if(refreshRun)this.motor.runGrace=9;
  const running=(runPressed||this.motor.runGrace>0)&&!water&&!this.entryFalling;
  if(!refreshRun&&this.motor.runGrace>0)this.motor.runGrace--;
  const max=water?(p.grounded?WATER_PHYSICS.groundMax:WATER_PHYSICS.swimMax):(p.grounded?(pressed('a')?Math.abs(p.vx)>PHYSICS.walkMax:running):this.airRunning)?PHYSICS.runMax:PHYSICS.walkMax;
  // Native horizontal motor (src/native-motor.ts): integer speed in 1/4096 px; down-on-ground, water, auto-walk and
  // entry falls keep the fitted float rules below. p.vx is always motor speed / 4096, so outside writes stay exact.
  const useMotor=!water&&(!this.entryFalling||Boolean(nativeEntry));
  const swim=water&&this.swimActive;
  // The automatic pipe walk is a held-right walk press whose speed byte stops at 12 (native auto-walk rows).
  this.motor.capByte=this.area.autoWalk?TRANSITIONS.autoWalkCapByte:undefined;
  this.wallSpeed=undefined;
  if(useMotor)this.motor.speed=Math.round(p.vx*4096);
  const wallMediumJump=this.wallMediumJump;this.wallMediumJump=false;
  const speedBeforeStep=Math.abs(Math.floor(Math.round(p.vx*4096)/256))/16; // the native jump class reads the speed this frame starts with (5 of 5 decelerating takeoffs across byte 25 are run jumps)
  if(swim){this.swimStep(b,pressed('a'),direction);}else if(useMotor&&direction&&!(b.has('down')&&p.grounded)&&!(p.duck&&p.grounded)){
   const opposite=p.vx*direction<0;
   const motorDirection=direction as 1|-1;p.vx=((p.grounded||this.springTimers.size>0)&&!landingGrace?this.motor.groundPress(motorDirection,running,pressed('a')):this.motor.air(motorDirection,b.has('b')))/4096;p.facing=direction;this.braking=water?WATER_PHYSICS.brake:(!p.grounded||this.skidAccel===0.072265625)?(running||(!p.grounded&&this.airRunning)?0.04931640625:PHYSICS.brake):!opposite?(running?(Math.abs(p.vx)>1.75?0.04931640625:0.0380859375):PHYSICS.brake):running&&Math.abs(p.vx)>1.75?0.04931640625:this.braking;
  }else if(useMotor){
   this.motor.tickFreeze();
   if(p.grounded&&!pressed('a'))p.vx=(b.has('down')?this.motor.groundDown(direction as Direction,true):this.motor.groundCoast(b.has('b')))/4096;
  }else if(direction&&!(p.duck&&p.grounded)&&(!b.has('down')||!p.grounded)){
   const opposite=p.vx*direction<0;if(opposite)this.skidAccel=water?WATER_PHYSICS.accel*2:p.grounded&&!running&&(this.skidAccel===0.0390625||(!this.skidAccel&&this.braking===PHYSICS.brake))?0.0390625:(!p.grounded||this.skidAccel===0.072265625)?0.072265625:p.grounded&&this.braking<=0.0380859375?0.0546875:0.0625;const accel=opposite?(water?WATER_PHYSICS.reverse:p.grounded?(this.skidAccel===0.0390625?(Math.abs(p.vx)>1?0.0625:0.15625):this.skidAccel===0.072265625?PHYSICS.reverse:this.braking<=0.0380859375?(Math.abs(p.vx)>0.75?0.0703125:Math.abs(p.vx)+0.0625):(Math.abs(p.vx)>0.75?0.0947265625:Math.abs(p.vx)+0.0625)):this.airRunning?0.052734375:PHYSICS.walkAccel):(this.skidAccel===0.0625&&Math.abs(p.vx)>0.5?0.0537109375:this.skidAccel)|| (water?WATER_PHYSICS.accel:(p.grounded?running:this.airRunning)?PHYSICS.runAccel:PHYSICS.walkAccel);
   p.vx=direction>0?Math.min(max,p.vx+accel):Math.max(-max,p.vx-accel);p.facing=direction;this.braking=water?WATER_PHYSICS.brake:(!p.grounded||this.skidAccel===0.072265625)?(running||(!p.grounded&&this.airRunning)?0.04931640625:PHYSICS.brake):!opposite?(running?(Math.abs(p.vx)>1.75?0.04931640625:0.0380859375):PHYSICS.brake):running&&Math.abs(p.vx)>1.75?0.04931640625:this.braking;
  }else if(p.grounded&&(water||(!pressed('a')&&this.hasSupportAt(p.x+Math.sign(p.vx)*Math.floor(Math.abs(p.vx)*32)/32,p.y)))){const downSpeedBeforeBrake=p.vx;const skidCoast=!water&&!b.has('down')&&this.skidAccel>0&&this.skidAccel!==0.072265625&&p.vx*p.facing<0;if(!skidCoast)this.skidAccel=0;if(!water&&b.has('down')&&Math.abs(p.vx)<=1.6875)this.braking=PHYSICS.brake;p.vx=Math.sign(p.vx)*Math.max(0,Math.abs(p.vx)-(skidCoast?0.07421875:water?WATER_PHYSICS.brake:b.has('down')?(Math.abs(p.vx)>1.6875?this.braking:PHYSICS.brake):this.braking));if(!water&&b.has('b')&&!b.has('down')&&Math.abs(p.vx)<0.625)p.vx=0;if(this.area.smallPlayerDownStop&&p.size===0&&b.has('down')&&direction*downSpeedBeforeBrake<=0&&Math.floor(downSpeedBeforeBrake*16)>=-10&&Math.floor(downSpeedBeforeBrake*16)<=10)p.vx=0;}
  if(!water&&p.grounded)this.airRunning=Math.abs(p.vx)>PHYSICS.walkMax;
  if(water){
   if(pressed('a')){this.waterEntryFall=false;p.grounded=false;this.emit('sfx_swim');}
   if(this.waterEntryFall)p.vy=Math.min(PHYSICS.maxFall,p.vy+WATER_PHYSICS.entryGravity);
   else if(!swim){const next=advanceWater(p.y,p.vy,b.has('a'),pressed('a'),this.waterSurface);p.y=next.y;p.vy=next.vy;}
  }else{
   if(pressed('a')&&p.grounded){const jumpSpeed=useMotor?Math.abs(Math.floor(Math.round(p.vx*4096)/256))/16:Math.abs(p.vx);this.runJump=useMotor?speedBeforeStep>1.5||this.motor.wallRunLatched:jumpSpeed>1.5;this.mediumJump=!this.runJump&&(useMotor?speedBeforeStep>=1||wallMediumJump:jumpSpeed>1&&jumpSpeed<=1.5);this.lastJumpFallForce=this.runJump?0.5625:this.mediumJump?0.375:PHYSICS.gravity;if(useMotor)this.motor.takeoff();this.fallGravity=this.runJump?0.5625:this.mediumJump?0.375:PHYSICS.gravity;p.vy=this.runJump?PHYSICS.runJump:PHYSICS.jump;p.grounded=false;this.jumpArc=true;this.jumpHeld=0;this.landJump='held';if(!b.has('b'))this.braking=PHYSICS.brake;this.emit(p.size?'sfx_jump_big':'sfx_jump_small');}
   // Fresh no-contact release/repress pairs: A cannot restore held gravity.
   if(this.landJump==='held'&&!b.has('a')&&p.vy<0)this.landJump='released';
   this.jumpHeld++;
  }
  const height=this.height;
  const motion=useMotor||swim?motionOf(Math.round(p.vx*4096)):Math.sign(p.vx)*Math.floor(Math.abs(p.vx)*32)/32;cameraAttemptX=p.x+motion;cameraAttemptVx=p.vx;cameraMotion=motion;p.x+=motion;p.grounded=false;this.headBumped=false;this.movePlayerY(swim?this.swimDy:nativeEntry&&this.entryFallAge===nativeEntry.skipAge?0:p.vy,swim?this.swimHeight(height):height,!water&&p.vy+this.airGravity(b)<0,this.airGravity(b));
  if(!water&&!p.climbing&&p.vy<0&&!this.headBumped)this.platformHeadBump(p.x-motion,oldBottom);
  // Native frames back out of a wall one pixel per frame (the contact frame included), not by snapping to the tile edge.
  this.wallBackOut=false;this.movePlayerX(motion,height,!useMotor&&!swim);this.footPushed=false;
  // Native air wall contacts resume after one backed-out row, independent of held A/B and of the level (1-1 f585..587; free play r3: 1,189 of
  // 1,203 air contacts below speed byte 9 hold exactly one row, A+B rising included; deep contacts re-arm the pause through wallBackOut below).
  // The frame immediately after a ground-wall contact retains the medium vertical jump class too (native 4-2 r8m0 row373, 5-2 r8m3 row1325, 7-1 r8m5 row1933).
  if(useMotor&&this.wallSpeed!==undefined&&poseGrounded&&p.grounded&&!pressed('a')){const byte=Math.abs(Math.floor(Math.round(this.wallSpeed*4096)/256));if(byte>=16&&byte<=24)this.wallMediumJump=true;}
  if(useMotor&&this.wallSpeed!==undefined)p.vx=this.motor.hitWall(Math.round(this.wallSpeed*4096),direction===0||direction*this.wallSpeed>0,0,(!poseGrounded&&!p.grounded)||pressed('a'))/4096; // a wall contact on the landing frame is a ground contact (native keeps the run class for the takeoff that follows)
  if(useMotor&&this.wallBackOut)this.motor.freeze=Math.max(1,this.motor.freeze);
  // Swimming uses its own motor: a zero-motion back-out row holds its wall pause too (native 7-2 rows832..835).
  if(swim&&this.wallBackOut)this.water.motor.freeze=Math.max(1,this.water.motor.freeze);
  if(swim){this.swimContact(this.swimDy,oldBottom,this.swimHeight(height));if(!this.wallBackOut)p.x+=this.swimPull;}else if(water&&p.grounded&&!this.entryFalling)this.swimActive=true;
  if(p.grounded){if(!poseGrounded){if(!b.has('b'))this.motor.runGrace=0;if(Math.abs(p.vx)<=PHYSICS.walkMax)this.braking=PHYSICS.brake;}this.fallingThroughCastleLava=false;this.jumpArc=false;this.bouncing=false;this.runJump=false;this.mediumJump=false;this.landJump='inactive';this.waterEntryFall=false;this.entryLanding=Boolean(nativeEntry);this.entryFalling=false;this.waterSurface={active:false,contacted:false};}
  if(this.entryFalling&&nativeEntry){if(this.entryFallAge>=nativeEntry.gravityStartAge&&this.entryFallAge!==nativeEntry.skipAge){p.vy+=entry!.gravity;if(p.vy>=nativeEntry.resetAt)p.vy=nativeEntry.resetTo;}}
  else if(this.entryFalling){if(entry!.gravityBeforeControl||p.y>=entry!.controlFeetY)p.vy=Math.min(entry!.maxFall,p.vy+entry!.gravity);}
  else if(this.walkOffFall()){}
  else if(this.area.theme!=='water'&&!p.grounded&&!this.headBumped)p.vy=this.jumpArc&&!this.runJump?this.nativeFallCap(p.vy+this.airGravity(b)):this.runJump?this.runJumpFallSpeed(p.vy+this.airGravity(b)):Math.min(PHYSICS.maxFall,p.vy+this.airGravity(b)); 
  if(p.x<this.camera){
   // Steering away from the left edge keeps braking momentum and the x fraction (native4-4 rows2597..2599).
   if(useMotor&&direction>0&&p.vx<0)p.x=this.camera+p.x-Math.floor(p.x);
   else{p.x=this.camera;p.vx=Math.max(0,p.vx);}
  }
  p.anim+=Math.abs(p.vx);
  if(p.size===2&&!p.duck&&pressed('b')&&this.items.filter(i=>i.kind==='fireball').length<POWERUPS.fireballMaxActive.value){
   this.lastFire=this.frame;this.items.push({kind:'fireball',x:p.x+4,y:p.y-32,vx:p.facing*4,vy:POWERUPS.fireballArc.launchSpeed,age:0,life:240});this.emit('sfx_fireball');
  }
  }
  const height=this.height;
  let springJumped=false;if(!p.climbing){this.updatePlatforms(oldBottom);springJumped=this.updateSprings(oldBottom,b.has('a'));if(!springJumped)this.walkOffStart(poseGrounded);}
  if(p.grounded)this.stompChain=0;
  this.updateGenerators();if(!(nativeEntry&&this.entryFallAge<=entry!.enemyDelay))this.updateEnemies(oldBottom);this.updateItems();
  let jumped=springJumped;for(let i=poseEvents;i<this.events.length;i++)if(this.events[i]==='sfx_jump_small'||this.events[i]==='sfx_jump_big')jumped=true;
  this.classifyWalkOff(poseGrounded,jumped);
  this.updateLocomotionPose(poseGrounded,poseVx,jumped,b);
  const wallDisplay=poseGrounded&&p.grounded&&p.size===0&&this.area.theme==='ground'&&this.camera===0&&p.x===this.camera&&b.has('left')&&!b.has('right')&&this.locomotionPose.kind!=='jump';
  if(wallDisplay){
   if(!this.wallDisplayPose){this.wallDisplayPose={kind:'walk',frame:this.locomotionPose.frame,facing:this.locomotionPose.facing};this.wallDisplayTimer=this.walkPoseTimer;}
   else{this.wallDisplayTimer=Math.max(0,this.wallDisplayTimer-1);if(this.wallDisplayTimer===0){this.wallDisplayPose.frame=(this.wallDisplayPose.frame+1)%3;this.wallDisplayTimer=7;}this.wallDisplayPose.facing=this.locomotionPose.facing;}
  }else this.wallDisplayPose=undefined;
  if(this.area.theme==='water')this.updateSwimPose(b.has('a'));
  for(const [key,age]of this.bump){if(age>=16){this.bump.delete(key);this.usedBlockRehits.delete(key);}else this.bump.set(key,age+1);}
  this.collectTiles();
  // Advance existing motors before collision. New viewport entries are handled
  // after the ordinary camera commits, so their first increment is not delayed.
  if(this.phase==='play')this.firebarSlots?.step(this.camera);
  const inactiveFirebars=[...this.firebarMotors].filter(([,motor])=>!motor.state.active);
  if(this.phase==='play')for(const [bar,motor]of this.firebarMotors)if(motor.state.active)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
  for(const bar of this.area.firebars??[])this.collideFirebar(bar,height);
  if(!p.dead&&this.area.fallExit&&p.vy>=0&&p.y>this.area.fallExit.belowY){const exit=this.area.fallExit;this.enterArea(exit.to,exit.spawn,exit.camera);return;}
  if(p.y>(this.swimActive?SWIM_DEATH_Y+31:272)){this.die(this.fallingThroughCastleLava,!this.fallingThroughCastleLava);return;}
  const lava=this.tileAt(p.x+8,p.y-1);if(this.area.theme==='castle'&&!p.grounded&&(lava===134||lava===135))this.fallingThroughCastleLava=true;else if(this.area.theme!=='water'&&this.area.theme!=='castle'&&(lava===134||lava===135))this.die();
  if(this.area.checkpoint&&p.x>=this.area.checkpoint.activationX){this.checkpoint=true;this.activatedCheckpointArea=this.area.id;}
  const previousCamera=this.camera,attemptX=cameraAttemptX??p.x;
  const cameraContact=(cameraMotion??p.x-oldX)>0&&(attemptX>p.x+1e-7||cameraAttemptVx>0&&p.vx===0||this.wallSpeed!==undefined&&this.wallSpeed>0);
  if(oldX-previousCamera<80)this.cameraAfterContact=false;
  // Native scrolling is gated by the side-collision timer (RAM 0x785, 0x10 at the contact frame, then counting down). After an
  // airborne wall contact the camera resumed AIR_CONTACT_CAMERA_HOLD frames after the contact in the retained 1-1 native probe
  // (evidence/entry-timeline-findings-20261109.md); ground contacts keep the fractional-lead proxy below. Scoped to 1-1, where it was
  // measured: applied to every level it moved enemy activation away from native (2-1 Paratroopa 100% to 5%, 4-2 Koopa 80% to 42%).
  if(cameraContact){this.cameraAfterContact=true;this.cameraContactAir=!poseGrounded&&this.level.id==='1-1';this.cameraHold=AIR_CONTACT_CAMERA_HOLD;}else if(this.cameraHold>0)this.cameraHold--;
  // Contact-frame scrolling reads attempted movement. Subsequent scrolling
  // waits for the previous fractional X to cross112; see camera-lag-diagnosis.md.
  if(this.cameraAfterContact&&!cameraContact){
   if(oldX-previousCamera>=80&&p.x>oldX&&(this.cameraContactAir?this.cameraHold===0:oldX-previousCamera>112))this.camera+=Math.max(0,Math.floor(p.x)-Math.floor(oldX));
  }else if(cameraContact&&oldX-previousCamera>112&&p.x>oldX){
   // Contact frame with Mario already ahead of screen x 112: native scrolls by the attempted movement, no catch-up to 112.
   this.camera+=Math.max(0,Math.floor(attemptX)-Math.floor(oldX));
  }else if(oldX-previousCamera>=80&&p.x>oldX){
   this.camera+=Math.ceil(Math.max(0,Math.floor(p.x)-Math.floor(oldX))/2);
   if(attemptX-this.camera>112)this.camera=Math.floor(attemptX)-112;
  }
  this.camera=Math.max(previousCamera,Math.min(this.camera,this.area.cameraEnd??this.area.warpZone?.cameraEnd??Math.max(0,this.area.width-256)));
  this.platformMotion.advance(this.platformFrame,this.camera);
  this.gateNativePlatforms(previousCamera);
  for(const popup of this.popups)if(popup.age===0)popup.x+=previousCamera-this.camera;
  // The observed sky rider stops at screen240 as the cloud continues beyond
  // the viewport. The ordinary camera boundary also applies off platforms.
  if(p.x>this.camera+240){p.x=this.camera+240;p.vx=Math.min(0,p.vx);}
  if(this.phase==='play'){
   if(this.piranhaColumns){this.piranhaColumns.step(this.camera);for(const e of this.enemies)if(e.kind==='piranha'&&!e.active)this.nativeSlotDenied(e);}
   this.firebarSlots?.cameraEntry(previousCamera,this.camera);
   for(const [bar,motor]of inactiveFirebars)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
   for(const [bar,motor]of inactiveFirebars)if(motor.state.active)this.collideFirebar(bar,height);
  }
  if(this.player.dead)return;
  const warp=this.area.warpZone;
  if(warp&&!this.warpZoneActive&&this.camera>=warp.activateAtCamera){
   this.warpZoneActive=true;
   this.enemies=this.enemies.filter(e=>e.kind!=='piranha'||!warp.removePiranhasAtX.includes(e.originX));
  }
  for(const pipe of this.area.pipes??[]){
   if(pipe.requiresWarpActivation&&!this.warpZoneActive)continue;
   // Native 8-4 area-3 pipe: Mario slid along the pipe top with Down+Right held for 14 rows (x 3645..3654) and went in only the row after Right was released.
   const down=pipe.direction==='down'&&b.has('down')&&downPipeFooting(p)&&!downPipeLateralBlocks(poseGrounded,b)&&Math.abs(p.x+8-pipe.x)<(pipe.entryHorizontalTolerance??(pipe.requiresWarpActivation?9:5))&&Math.abs(p.y-pipe.y)<3;
   // Native side pipes start when a grounded Mario moving right reaches entryTriggerX; the 8-4 water pipe starts with only Down held (momentum).
   // The automatic pipe walk at the start of 1-2/2-2/4-2/7-2 starts it at floor(x)+13>=pipe.x (native rows).
   const side=pipe.direction==='right'&&(this.area.autoWalk?b.has('right')&&Math.floor(p.x)+TRANSITIONS.autoWalkPipe.triggerOffset>=pipe.x:pipe.entryTriggerX!==undefined?(b.has('right')||p.vx>0||(this.wallSpeed??0)>0)&&p.grounded&&(Math.floor(p.x)>=pipe.entryTriggerX||(this.wallSpeed??0)>0&&Math.floor(p.x)+1>=pipe.entryTriggerX)&&Math.floor(p.x)<pipe.entryTriggerX+32:b.has('right')&&Math.abs(p.x+14-pipe.x)<3)&&Math.abs(p.y-pipe.y)<12;
   const up=pipe.direction==='up'&&b.has('up')&&Math.abs(p.x+8-pipe.x)<9&&Math.abs(p.y-this.height-pipe.y)<3;
   if(down||side||up){this.phase='pipe';this.phaseFrame=0;this.destination={area:pipe.to,level:pipe.targetLevel,spawn:pipe.spawn,camera:pipe.camera,direction:pipe.direction,frames:(p.size===0?pipe.smallPlayerRoomEntry?.transitionFrames:undefined)??pipe.transitionFrames??64,smallPlayerRoomPreviewFrames:pipe.smallPlayerRoomPreviewFrames,smallPlayerRoomEntry:p.size===0?pipe.smallPlayerRoomEntry:undefined,ordinaryEnemyFrontier:pipe.ordinaryEnemyFrontier,returnCloudOffsetX:pipe.returnCloudOffsetX,riseFrames:pipe.riseFrames};this.pipeWalkRun=b.has('b')&&Math.max(Math.abs(p.vx),this.wallSpeed??0)*16>=TRANSITIONS.sidePipeWalk.runByte;p.vx=0;p.vy=0;this.emit('sfx_pipe');return;}
  }
  this.updateMaze(oldX);
  const exit=this.area.exit;
  // Native axe contact (tests/native-axe-contact.test.ts): a foot inside the cell while not rising; x+13 stands for the right foot, the left side is kept loose so a remake 1-3 px ahead still reaches it.
  const touchingExit=exit&&(exit.kind==='axe'?exit.y!==undefined&&p.vy>=0&&overlap(Math.floor(p.x),Math.floor(p.y)-1,13,2,exit.x-8,exit.y,16,16):exit.kind==='flag'&&p.x+15>=exit.x-2&&p.y<193);
  if(exit&&touchingExit){
   this.phase=exit.kind==='axe'?'castle':'flag';this.phaseFrame=0;p.vx=0;p.vy=0;
   this.flagBonus=exit.kind==='flag'?(FLAG_COMPLETION.scoreThresholds.find(t=>p.y<t.feetBelow)?.score??FLAG_COMPLETION.lowestScore):0;
   if(exit.kind==='axe'){
    this.bridge=[...this.tiles].filter(([,id])=>id===137).sort((a,b)=>Number(b[0].split(',')[0])-Number(a[0].split(',')[0])).map(([key])=>key);
    this.castleStage='bridge';this.castleFallingBosses=[];this.castleBraking=false;this.castleScroll=this.camera;this.emit('command_silence');
    for(const[key,id]of this.tiles)if(id===197)this.tiles.delete(key);
    {const chain=`${Math.floor(exit.x/16)-1},9`;if(this.level.id==='6-4'&&this.area.id==='main'&&this.tiles.get(chain)===12)this.tiles.delete(chain);} // the 6-4 chain hangs in the column before the axe tile
   }else {p.x=exit.x-15;this.beginFlag();this.emit('command_silence');this.emit('sfx_flagpole');}
  }
 }
 tileAt(x:number,y:number){return this.tiles.get(`${Math.floor(x/16)},${Math.floor(y/16)}`)??this.freeTiles.find(t=>x>=t.x&&x<t.x+16&&y>=t.y&&y<t.y+16)?.id??0;}
 private collisionAt(x:number,y:number,hidden=false){
  const col=Math.floor(x/16),row=Math.floor(y/16),id=this.tiles.get(`${col},${row}`)??0;
  if(solid(id)||(hidden&&(id===95||id===96)))return {x:col*16,y:row*16,width:16,height:16,id,col,row};
  const fragment=this.area.solidRects?.find(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);
  if(fragment)return fragment;
  const piece=this.freeTiles.find(t=>solid(t.id)&&x>=t.x&&x<t.x+16&&y>=t.y&&y<t.y+16);
  return piece?{x:piece.x,y:piece.y,width:16,height:16,id:piece.id,piece}:undefined;
 }
 private isSolid(x:number,y:number){return this.collisionAt(x,y)!==undefined;}
 private pipeTopAt(x:number,oldY:number,newY:number){
  const row=Math.floor(newY/16),top=row*16,id=this.tiles.get(`${Math.floor(x/16)},${row}`);
  return id!==undefined&&id>=28&&id<=30&&oldY<=top&&newY>=top?top:undefined;
 }
 private hasSupportAt(x:number,y:number){
  if([x+3,x+12].some(foot=>this.isSolid(foot,y)||this.pipeTopAt(foot,y,y)!==undefined))return true;
  return (this.area.platforms??[]).some(platform=>{
   const position=this.platformMotion.collisionPosition(platform,this.platformFrame-1);
   return Math.abs(y-position.y)<0.01&&platformSupportsX(x,position.x,platform.width);
  });
 }
 // Native foot probes (x+3, x+12) land only when the feet are under 5 px into the cell; deeper, a non-rising Mario is pushed 1 px back along his motion and that row runs no side probe.
 private footPush(){const p=this.player,dir=Math.sign(p.vx)||this.motor.moving;p.x-=dir;this.wallSpeed=p.vx;p.vx=0;this.footPushed=true;}
 // Native springboard cells (16x32 from 24 px above the spring base) are a wall to the side probes: free-play rows of 3-1, 5-2, 8-2, 2-1, 6-3 stop a right-moving
 // Mario at x = spring x - 13 (22 of 22 contacts, walking at feet 208 and rising in the air; speed cut to its fraction), the remake passed into the spring.
 // While Mario rides a spring (compression rows up to the launch row) a held direction steps the speed like the ground (5-2 r4 mood0 rows 224-237: +228 per row
 // with B, the air step is 152; 2-1 r1 mood1 rows 1556-1560 the same); the x stays pinned (springPinX).
 private springSideAt(x:number,y:number){
  for(const s of this.area.springs??[])if(!this.springTimers.get(s)&&x>=s.x&&x<s.x+16&&y>=s.y-24&&y<s.y+8)return {x:s.x,y:s.y-24,width:16,height:32};
  return undefined;
 }
 private movePlayerX(dx:number,h:number,snap=true){
  const p=this.player;
  if(this.footPushed)return;
  if(dx===0){
   for(const y of[p.y-h+4,p.y-8]){
    if(this.collisionAt(p.x+13,y)){p.x--;this.wallBackOut=true;return;}
    if(this.collisionAt(p.x+2,y)){p.x++;this.wallBackOut=true;return;}
   }
   return;
  }
  const edge=p.x+(dx>0?13:2);
  for(const y of[p.y-h+4,p.y-8]){const tile=this.collisionAt(edge,y)??this.springSideAt(edge,y);if(tile){
   const fraction=p.x-Math.floor(p.x);if(snap)p.x=(dx>0?tile.x-13:tile.x+tile.width-2)+fraction;else p.x-=Math.sign(dx);this.wallSpeed=p.vx;p.vx=0;return;
  }
  }
  if(this.swimActive)this.swimFootWall(dx);
 }
 /** A swimmer that is not rising is also stopped by its feet, at the landing probes, once they are SWIM_WALL_DEPTH or more inside a tile (shallower it lands on top; rising it passes: 2-2 pillar branch probe, the block falls on the first row with speed >= 0). */
 private swimFootWall(dx:number){
  const p=this.player;if(this.water.speed<0||!this.collisionAt(p.x+(dx>0?12:2),p.y-SWIM_WALL_DEPTH))return;
  p.x-=Math.sign(dx);this.wallSpeed=p.vx;p.vx=0;
 }
 // Native head bump of a small Mario in the air (rows in tests/native-head-bump.test.ts): the head probe sits 14 px above the feet (the legacy snap bump probes 12) and only acts while the
 // speed after this frame's gravity is still upward (a jump that merely touches a ceiling at its apex is no bump); the position is NOT snapped, the speed becomes 1 (0 for a hit block: brick,
 // question, used) plus the fraction of the speed after this row's gravity (see bumpHead), the jump class (gravity 0.5625/0.375/0.4375, cap) is kept and that frame takes no gravity step.
 // Native run-jump fall cap: after the gravity step a speed of 4 or more whose fraction is 0.5 or more is set to exactly 4 (3.96875 -> 4.53125 moves 4: 17 of 17 route rows);
 // a step landing on 5.0-5.4375 (4.4375 + 0.5625) keeps it one row, so the fall bytes run 3 3 4 5 4 (free-play one-step score: 181 'vy4>5' spells on explore-r1/r2/w0, all fixed).
 private runJumpFallSpeed(next:number){return next>=4&&next%1>=0.5?4:next;}
 // Native fall cap of a jump arc (model-play one-step audit, 3238 jumps / 80,091 rows: 149 misses): a speed that reaches 4.5 px/frame is set to exactly 4.0 (a 4.125 cap made 4 -> 5 px steps appear every 8 rows).
 // Scoped to jump arcs: the same rule on walk-off falls broke the human-route campaign (their start state differs: first rows vy 0,1,1,2 dy 1,1,1,2 in model traces, not modelled).
 private nativeFallCap(v:number){return v>=4.5?4:v;}
 // Native underground entry fall (1-2 area-2, 4-2 area-3): Mario keeps facing right through the load and cannot turn in the air, so a Left press during the fall steps the doubled
 // 304 per row once the speed has crossed zero (explore-r4 1-1/mood1 rows 2753-2766: 760 ... 0, -152, -456, ... -3800) instead of the plain 152 the motor's unknown-after-load facing gave.
 private entryFallFacing(area:Area){if(this.entryFalling&&area.entryFall?.native)this.motor.facing=this.player.facing<0?-1:1;}
 // Native walk-off (118 model falls, exact): the first air row keeps speed 0 and restores the y sub-pixel of the last landing (ground rows never clear it); then speed grows by the class of the last takeoff, capped like a jump arc.
 private walkOffFall(){
  const p=this.player;
  if(p.grounded||!this.walkingOff||this.jumpArc||this.bouncing){this.walkingOff=false;return false;}
  p.vy=this.nativeFallCap(p.vy+this.fallGravity);return true;
 }
 // Runs after the platform update: a rider is only grounded once that has run.
 private walkOffStart(wasGrounded:boolean){
  const p=this.player;
  if(!wasGrounded||p.grounded||p.climbing||this.jumpArc||this.bouncing||this.area.theme==='water')return;
  this.walkingOff=true;p.y+=this.landingFraction;p.vy=0;
 }
 // Native stomp bounce (r5 model rows, 468 bounces): the gravity after the bounce is the fall gravity of the last takeoff's class, A held or not
 // (run 0.5625 x313, walk 0.4375 x166, medium 0.375 x18; walk/medium never fit 0.5625 except 2). Springs, and a bounce before any takeoff of the visit (unmeasured), keep 0.5625.
 private bounceGravity=0.5625;
 // Native stomp sets only the speed's whole part to -4 and keeps the falling speed's sub-pixel part (8-2 r6 row 106, all 8 moods:
 // y 128,125,122,120,119,118,117 = rise 11, not the flat -4's 16); at the fall cap (vy >= 4) the part is 0 (1-2 mood0 row 3740: -4,-4,-4).
 private stompBounceVy(vy:number){return vy>=4?-4:-4+(vy-Math.floor(vy));}
 private stompBounce(){this.bounceGravity=this.fallGravity===FALL_GRAVITY_AFTER_LOAD?0.5625:this.fallGravity;}
 private airGravity(b:Set<Button>){const p=this.player;return this.bouncing?this.bounceGravity:b.has('a')&&this.landJump!=='released'&&p.vy<0?(this.runJump?0.15625:this.mediumJump?0.1171875:PHYSICS.heldGravity):(this.runJump?0.5625:this.mediumJump?0.375:PHYSICS.gravity);}
 // Native big Mario (evidence/power-findings-20261111.md, 1-1 probes): the head probe is 28 px above the feet standing and 14 crouched (bump at feet - ceiling 24..26 / 13, none at 28 / 16). A used block gives speed 1 plus the fraction, a question block 0 plus the fraction;
 // a brick that breaks gives -2 plus the fraction (the fraction of the speed after this row's gravity, 0x9f/0x433 rows) and its cell stays solid for the next row: Mario bumps it again with speed 1 plus the fraction and can hit its side (speed cleared, rL35 row 42).
 private finishBrickBreak(){const b=this.brokenBrick;if(!b)return;if(b.rows++>=1){this.tiles.delete(b.key);this.brokenBrick=undefined;}}
 private nativeHeadProbe(h:number){return h>=28?h:h+2;}
 // Every bump keeps the fraction of the speed after this row's gravity, small Mario too: hidden blocks (8-4 area-2, 16 branches), hit blocks and ceilings
 // (free play 1-2 area-2 x189 used-block bump: rows 98-105 need 0.4375 = frac(-2.125 + 0.5625), the speed that hit gives 0.875; route 1-1 rows 128-148 exact for 18 rows).
 private bumpHead(dy:number,speed:number,gravity:number){const v=dy+gravity;this.player.vy=v-Math.floor(v)+speed;this.headBumped=true;}
 // Native crouch: read on the ground only and kept through the air (crouched jumps bump at the crouched head even after Down is released); never while swimming.
 private nextDuck(b:Set<Button>){const p=this.player;return p.size>0&&(p.grounded||this.area.theme==='water'?b.has('down')&&p.grounded:p.duck);}
 // Native apex landing (free-play rows, 35 of 35 in 256 model runs, remake one row late on all): on the row where the speed after gravity is no longer upward, a Mario still moving
 // up 1 px runs the foot probes, not the head probe, and lands on a floor top his feet are under 5 px into (feet 83 -> 80, 1-3 row 992).
 private apexFootProbe(dy:number,nativeHead:boolean,gravity:number){return dy<0&&gravity>0&&!nativeHead&&this.area.theme!=='water';}
 private movePlayerY(dy:number,h:number,nativeHead=false,gravity=0){
  const p=this.player,oldY=p.y;p.y+=dy;this.piranhaTouchFeetY=p.y;
  const down=dy>=0||this.apexFootProbe(dy,nativeHead,gravity);
  const edge=down?p.y:p.y-(nativeHead?this.nativeHeadProbe(h):h);
  for(const x of (down?[p.x+3,p.x+12]:[p.x+8])){
   const tile=this.collisionAt(x,edge,!down&&(this.area.theme==='water'||hiddenBlockBumps(p.y)));
   const pipeTop=down?this.pipeTopAt(x,oldY,edge):undefined;
   if(!tile&&pipeTop===undefined)continue;
   if(tile&&this.area.theme==='water'&&dy>=0&&oldY>tile.y&&(p.y-tile.y>=SWIM_WALL_DEPTH||this.water.speed<0))continue;
   if(down&&tile&&this.area.theme!=='water'&&Math.floor(p.y)-tile.y>=FOOT_LAND_DEPTH){this.footPush();break;}
   if(down){if(dy!==0)this.landingFraction=p.y-Math.floor(p.y);p.y=tile?.y??pipeTop!;p.vy=0;p.grounded=true;}
   else{if(!tile)continue;
    if(nativeHead)this.bumpHead(dy,isHitBlock(tile.id)&&(p.size===0||tile.id!==196&&!(tile.id>=81&&tile.id<=83))?0:1,gravity);else{p.y=tile.y+tile.height+h;p.vy=0.5;this.runJump=false;this.mediumJump=false;}
    if('col' in tile){const wasBroken=this.brokenBrick;this.hitBlock(tile.col!,tile.row!,tile.id);if(nativeHead&&this.brokenBrick&&this.brokenBrick!==wasBroken)this.bumpHead(dy,-2,gravity);}else if('piece' in tile&&tile.piece.interactive&&(tile.id===192||tile.id===196))this.hitBlock(tile.piece.x/16,tile.piece.y/16,tile.id,tile.piece);else this.emit('sfx_bump');
   }break;
  }
 }
 private hitBlock(x:number,y:number,id:number,piece?:TilePiece){
  const key=`${x},${y}`;if(this.bump.has(key))return;this.bump.set(key,0);if(id===196&&!piece)this.usedBlockRehits.add(key);
  if(id===96)this.activatedHidden1ups.add(`${this.currentPlayer}/${this.level.id}/${this.area.id}/${key}`);
  const p=this.player;
  const content=this.area.blockContents?.find(block=>block.col===x&&block.row===y);
  const powerupContent=content&&content.kind!=='vine'&&content.kind!=='multiCoin'&&id!==196?content.kind:undefined;
  if(content?.kind==='vine'&&id!==196){
   const vine=this.vines.find(v=>v.id===content.vineId)!;this.tiles.set(key,196);vine.growing=true;
   this.vineProgress.set(this.vineKey(vine.id),vine.height);this.emit('sfx_vine_grows');
  }else if(content?.kind==='multiCoin'&&id!==196){
   const expiry=this.multiCoinExpiries.get(key)??multiCoinExpiry(this.frame);
   this.multiCoinExpiries.set(key,expiry);
   if(this.frame>=expiry)this.tiles.set(key,196);
   this.coin();this.items.push({kind:'coin',x:x*16+5,y:y*16-16,vx:0,vy:-5.3125,age:0,life:36});
  }else if(powerupContent||id===192||id===193||id===95||id===96||id>=85&&id<=94){
   let item:Item['kind']='coin';
   if(id===193||id===85||id===90)item=p.size?'flower':'mushroom';
   if(id===96||id===89||id===94)item='1up';
   if(id===87||id===92)item='star';
   if(powerupContent)item=powerupContent==='powerup'?(p.size?'flower':'mushroom'):powerupContent;
   if(piece)piece.id=196;else this.tiles.set(key,196);
   if(item==='coin'){this.coin();this.items.push({kind:'coin',x:x*16+5,y:y*16-16,vx:0,vy:-5.3125,age:0,life:36});}
   else {this.items.push({kind:item,x:x*16,y:y*16,vx:item==='flower'?0:1,vy:0,age:0,life:2000,emerging:POWERUPS.powerupEmergenceNativeFrames.value});this.emit('sfx_powerup_appears');}
  }else if((id===81||id===82||id===83)&&p.size){
   this.brokenBrick={key,rows:0};this.score+=50;this.emit('sfx_brick_shatter');
   for(let i=0;i<4;i++)this.items.push({kind:'debris',x:x*16+(i%2)*8,y:y*16+Math.floor(i/2)*8,vx:(i%2?1:-1)*1.5,vy:i<2?-4:-2,age:0,life:60});
  }else this.emit('sfx_bump');
  for(const e of this.enemies)if(e.active&&!e.dead&&Math.abs(e.y-y*16)<3&&Math.abs(e.x-x*16)<18){e.dead=1;e.vy=-3;this.score+=100;}
 }
 private updateLocomotionPose(wasGrounded:boolean,previousVx:number,jumped:boolean,buttons:Set<Button>){
  const p=this.player,pose=this.locomotionPose;this.walkPoseTimer=Math.max(0,this.walkPoseTimer-1);
  if(jumped){this.jumpPose=true;pose.kind='jump';pose.frame=0;}
  if(p.climbing)return;
  if(!jumped&&(wasGrounded||p.grounded)){
   this.jumpPose=false;const speed=Math.abs(previousVx);
   // Screenshot-fitted native-frame countdown; threshold crossings and the
   // deceleration phase remain approximate (evidence/player-pose-animation-fit.json).
   if(wasGrounded&&speed>0&&this.walkPoseTimer===0){pose.frame=(pose.frame+1)%3;this.walkPoseTimer=speed<0.875?7:speed<1.75?4:2;}
   pose.kind=Math.abs(p.vx)<0.1&&!(p.size===0&&p.vx!==0&&!buttons.has('down')&&(buttons.has('right')!==buttons.has('left')))?'stand':p.vx*p.facing<0?'skid':'walk';pose.facing=p.facing;
  }else if(this.jumpPose){pose.kind='jump';}
  // A walk-off fall, including a subsequent enemy bounce, retains its last
  // walking frame and facing until landing or a newly initiated jump.
 }
 /** Native-exact swimming (src/native-water.ts) starts with the room unless the legacy entry fall still plays (5-2, 6-2). */
 private startSwim(spawnAtEntry:boolean,arrival=false){
  const area=this.area,p=this.player,w=this.water;w.reset();this.swimActive=false;this.swimLock=0;this.swimDy=0;
  if(area.theme!=='water'||area.entryFall&&!(area.waterEntryFall&&spawnAtEntry))return;
  this.swimActive=true;this.waterEntryFall=false;this.swimFreshA=true;
  // The pipe rooms of 5-2/6-2 fall exactly like the 2-2 entry (measured with small and big Mario, 34 rows): from the room load the state is
  // zero for two rows (one idle step), then surface gravity 24 passes from native y 0; the legacy standing frames only gate pose and timer.
  if(area.entryFall){this.swimLock=3;p.y=32;p.vy=0;w.rise=24;w.fall=40;return;}
  // Measured entry: the uncontrolled fall starts at native y 0 (surface gravity 24 has run three passes by the first
  // registered screenshot frame, which is native row 12399 of the winning route: force 48, fraction 24).
  // Arriving through the level-start pipe the room load is native row 0 (engine 7, y 0 for 7 rows): the swim state starts from zero like the 5-2/6-2 rooms; a direct start keeps the screenshot-registered row-3 state.
  if(area.waterEntryFall&&spawnAtEntry&&p.y<80&&arrival){this.swimLock=3;p.y=32;p.vy=0;w.rise=24;w.fall=40;}
  else if(area.waterEntryFall&&spawnAtEntry&&p.y<80){this.swimLock=2;p.y=32;p.vy=0;w.force=48;w.frac=24;w.rise=24;w.fall=40;}
 }
 private get whirlpools(){return (whirlpoolData.zones as Record<string,WhirlpoolZone[]>)[`${this.level.id}/${this.area.id}`];}
 /** A Down+A stroke from the water floor keeps the horizontal speed from speed byte 11 up, whatever direction is held (2-2/7-2 r5 floor strokes:
  * 11 of 11, e.g. 7-2 mood0 row 797 4168 -> 4168; the remake braked 152 on 9). Below byte 11 the floor Down stop still applies; pillar tops (y < 176) keep braking (tests/water-pillar-top). */
 private floorDownStrokeKeeps(held:boolean,heldBefore:boolean,noInput:boolean,b:Set<Button>):boolean{
  const p=this.player,w=this.water;
  return p.grounded&&p.y-32>=176&&!noInput&&b.has("down")&&w.canStroke(held,heldBefore,p.grounded)&&Math.abs(w.motor.speed)>=11*256;
 }
 /** One swimming frame: vertical pass, horizontal speed and whirlpool pull (the movement itself is applied by update()). */
 private swimStep(b:Set<Button>,pressedA:boolean,direction:number){
  const p=this.player,w=this.water;
  this.swimPull=0;
  if(this.swimLock===1){this.swimLock=0;this.swimDy=0;return;}
  if(this.swimLock===3){this.swimLock=2;this.swimDy=0;return;}
  // The entry fall is uncontrolled until the player reaches native y 49; one more frame passes before the first input counts.
  // Below the map the controller no longer acts: the speed is kept and the fall goes on.
  const locked=this.swimLock===2,noInput=locked||p.y-32>=NO_INPUT_Y,held=!noInput&&b.has('a'),dir=(noInput?0:direction) as Direction;this.swimDirection=dir;
  const heldBefore=held&&!pressedA&&!this.swimFreshA;if(held&&!pressedA&&this.swimFreshA)this.emit('sfx_swim');if(!locked)this.swimFreshA=false;
  w.motor.speed=Math.round(p.vx*4096);
  if(!this.floorDownStrokeKeeps(held,heldBefore,noInput,b))p.vx=w.horizontal(dir,p.grounded&&(!w.canStroke(held,heldBefore,p.grounded)||(!noInput&&b.has("down"))),!noInput&&b.has("down"),!noInput&&b.has('b'))/4096;
  if(dir)p.facing=dir;
  // Whirlpool membership is tested where this frame's move lands (the other capture phase tests where it starts).
  const probe=Math.floor(w.whirlFirst?p.x:p.x+motionOf(Math.round(p.vx*4096)));
  const zone=whirlpoolAt(this.whirlpools,probe);
  const step=w.vertical(held,heldBefore,p.y-32,p.grounded,!!zone);
  // The pull direction follows the same landing x (model rows crossing the zone centre).
  const pull=whirlpoolPull(zone,w.whirlFirst||w.pullFromStart?Math.floor(p.x):probe,this.frame+(w.whirlFirst?1:0),w.whirlFirst||w.pullFromStart);
  // PPU rows show a trailing pull after tile contact; a zero-motion back-out skips it (native7-2 rows1429..1434).
  if(w.whirlFirst||w.pullFromStart)p.x+=pull;else this.swimPull=pull;
  this.swimDy=step.dy;
  if(locked&&p.y-32+step.dy>=49)this.swimLock=1;
 }
 /** Contact results of the swimming move: a landing clears the vertical speed, a head bump turns it around, a wall keeps the fraction. */
 private swimContact(dy:number,oldY:number,head:number){
  const p=this.player,w=this.water;
  if(dy<0&&p.vy===0.5&&this.whirlpoolLiftedHead(oldY+dy,head)){p.y=oldY+dy;p.vy=w.speed;} // the bump came only from the trailing whirlpool pass: none in native
  // A rising frame that happens not to move (dy 0) is not a landing even with a tile top at the feet.
  if(dy===0&&w.speed<0)p.grounded=false;
  // A head bump keeps the position the move reached (no clamp to the tile) and only turns the speed around. Inside a whirlpool zone the bump
  // falls between the ordinary pass and the trailing whirlpool pass, which is redone at speed 1 (2-2/7-2 free-play strokes under a ceiling
  // in a zone: the swimmer does not move on the bump row, 172 of 177; outside a zone it moves, 338 of 338).
  if(p.grounded)w.land();else if(dy<0&&p.vy===0.5){p.y=oldY+dy;p.y+=w.bump();}else if(w.speed<0&&this.swimUnderLift()){p.y+=w.bump();}
  if(this.wallSpeed!==undefined)p.vx=w.wall(Math.round(this.wallSpeed*4096),this.swimDirection===0||this.swimDirection*this.wallSpeed>0)/4096;
  p.vy=p.grounded?0:w.speed+w.force/256;
 }
 /** Native tests the ceiling between the ordinary pass and a trailing whirlpool pass (2-2/7-2 free-play rows in a zone: a swimmer arriving at
  * feet - ceiling 13 through the whirlpool pixel goes on rising, the next frame bumps without moving; r4-2-2 mood0 rows 2596-2602). True when the
  * head reached the tile only through that pass. */
 private whirlpoolLiftedHead(y:number,head:number){
  const moved=this.water.whirlMoved;
  return moved<0&&!this.collisionAt(this.player.x+8,y-moved-head,true);
 }
 /** Rising into the underside of a lift is a head bump (5-2 room, id 39 lifts): native y before the whirlpool pass minus lift y within 2..4 for big Mario, -10..-8 for small, over the lift's support window. Every sample is inside a whirlpool zone. */
 private swimUnderLift(){
  const p=this.player,top=p.size?2:-10;
  return (this.area.platforms??[]).some(platform=>{const lift=this.platformMotion.collisionPosition(platform,this.platformFrame),d=p.y-32-this.water.whirlMoved-lift.y;return d>=top&&d<=top+2&&platformSupportsX(p.x,lift.x,platform.width);});
 }
 /** A swimmer's head probe sits two pixels higher than the fitted ground one: native bumps at feet-ceiling 13 or less for small Mario and 29 or
  * less for big Mario (5-2 water room, same ceiling: bump at native y 93 / 109 under a ceiling bottom of 112). */
 private swimHeight(height:number){return height+2;}
 /** Re-seed the swimming state (measurement tooling): the native speed byte, plus the force, fraction, gravities and timer when
  * known. Without them the force and fraction restart at 0 and the gravities and timer keep their running values. */
 seedSwim(s:{speed:number;force?:number;frac?:number;rise?:number;fall?:number;timer?:number;hold?:boolean}){
  const w=this.water;this.swimLock=s.hold?1:0;w.speed=s.speed;w.force=s.force??0;w.frac=s.frac??0;w.timer=s.timer??(s.speed<0?STROKE_TIMER:0);
  if(s.rise!==undefined)w.rise=s.rise;if(s.fall!==undefined)w.fall=s.fall;w.motor.speed=Math.round(this.player.vx*4096);
 }
 private updateSwimPose(heldA:boolean){
  this.swimPoseFrame=this.swimAnimationFrame;
  this.swimPoseTimer=Math.max(0,this.swimPoseTimer-1);this.swimPoseWindow=Math.max(0,this.swimPoseWindow-1);
  // The observed rest window is28..34 native frames;32 is the fitted candidate.
  // Repeated strokes refresh it while preserving the ongoing seven-frame cycle.
  if(heldA)this.swimPoseWindow=32;
  if(this.player.grounded||this.swimPoseWindow===0){this.swimAnimationFrame=0;this.swimPoseTimer=0;}
  else if(this.swimPoseTimer===0){this.swimAnimationFrame=(this.swimAnimationFrame+1)%3;this.swimPoseTimer=7;}
 }
 /** Rendering and collision read the same motor state without advancing it. */
 firebarCenters(bar:FirebarSpec):{x:number;y:number}[]{
  if(this.firebarSlots?.tracks(bar))return this.firebarSlots.centers(bar);
  const motor=this.firebarMotors.get(bar);
  if(motor)return motor.state.active?firebarFlameCenters(motor.state,motor.geometry):[];
  const angle=(this.phase==='dying'?this.firebarDeathFrame:this.areaFrame)*bar.speed;
  return Array.from({length:bar.length},(_,n)=>({x:bar.x+Math.cos(angle)*n*8,y:bar.y+Math.sin(angle)*n*8}));
 }
 private collideFirebar(bar:FirebarSpec,height:number){
  const p=this.player;
  for(const {x,y}of this.firebarCenters(bar))if(overlap(p.x+3,p.y-height+3,10,height-6,x-3,y-3,6,6))this.hurt();
 }
 /** Native coin pickup points (accept/reject grid of Mario against coin tiles, small Mario, model runs + route): feet x+3/x+12 at the feet row (dy >= 0), body x+13 at feet-8 (dx -13 accepted, -14 not; dy <= 23), head x+8 at feet-14 (dy <= 29). The left body point and big Mario's extra row are unmeasured. */
 private collectTiles(){const p=this.player,points=[[p.x+3,p.y],[p.x+12,p.y],[p.x+3,p.y-8],[p.x+13,p.y-8],[p.x+8,p.y-this.height-2]];if(this.height>16)points.push([p.x+3,p.y-24],[p.x+13,p.y-24]);for(const [x,y] of points){
  const col=Math.floor(x/16),row=Math.floor(y/16),key=`${col},${row}`,id=this.tiles.get(key);
  if(id===194||id===195){this.tiles.delete(key);this.coin();}
 }}
 private coin(){this.coins++;this.score+=200;this.emit('sfx_coin');if(this.coins>=100){this.coins-=100;this.lives++;this.emit('sfx_1up');}}
 private vineKey(id:string){return `${this.currentPlayer}/${this.level.id}/${this.area.id}/${id}`;}
 private growVines(){
  for(const vine of this.vines)if(vine.growing){vine.height=Math.min(vine.baseY-vine.topY,vine.height+VINE_PHYSICS.growth);vine.growing=vine.height<vine.baseY-vine.topY;this.vineProgress.set(this.vineKey(vine.id),vine.height);}
 }
 private moveOnVine(b:Set<Button>,jump:boolean):'climbing'|'transition'|undefined{
  const p=this.player;
  if(this.entryVineActive)return this.moveThroughVineEntry();
  if(this.autoVineActive){b=new Set<Button>(['up']);jump=false;}
  if(!b.has('up')&&!b.has('down'))this.vineDetached=false;
  if(!this.climbingVine&&!this.vineDetached&&(b.has('up')||b.has('down'))){
   this.climbingVine=this.vines.find(v=>v.height>0&&overlap(p.x+3,p.y-this.height,10,this.height,v.x,v.baseY-v.height,14,v.height));
   if(this.climbingVine)p.facing=p.x+8<=this.climbingVine.x+7?1:-1;
  }
  const vine=this.climbingVine;if(!vine){p.climbing=false;return;}
  if(jump||b.has('left')||b.has('right')){
   this.climbingVine=undefined;this.vineDetached=true;p.climbing=false;p.grounded=false;
   if(jump){p.vy=PHYSICS.jump;this.runJump=false;this.mediumJump=false;this.bouncing=false;this.landJump='inactive';this.emit(p.size?'sfx_jump_big':'sfx_jump_small');}
   return;
  }
  p.climbing=true;p.duck=false;p.grounded=false;p.vx=0;p.vy=0;p.x=vine.x+(p.facing>0?-7:7);
  const dy=b.has('up')?-VINE_PHYSICS.climbUp:b.has('down')?VINE_PHYSICS.climbDown:0;
  if(dy<0)p.y=Math.max(vine.baseY-vine.height,p.y+dy);
  else if(dy>0){
   const floor=this.collisionAt(p.x+8,p.y+dy);
   if(floor&&p.y<=floor.y){p.y=floor.y;p.grounded=true;p.climbing=false;this.climbingVine=undefined;return 'climbing';}
   p.y+=dy;if(p.y-this.height>=vine.baseY){this.climbingVine=undefined;p.climbing=false;return;}
  }
  p.anim+=Math.abs(dy);
  if(vine.autoClimbFeetY!==undefined&&p.y<=vine.autoClimbFeetY)this.autoVineActive=true;
  if(vine.to&&vine.spawn&&vine.transitionFeetY!==undefined&&b.has('up')&&p.y<=vine.transitionFeetY){this.enterArea(vine.to,vine.spawn,vine.camera);return 'transition';}
  return 'climbing';
 }
 private moveThroughVineEntry():'climbing'{
  const p=this.player,vine=this.climbingVine!,entry=this.area.entryVine!;
  p.vx=0;p.duck=false;p.grounded=false;
  if(this.entryVineStage==='grow'){
   p.vy=0;p.climbing=false;
   if(vine.growing)return 'climbing';
   this.entryVineStage='climb';
  }
  if(this.entryVineStage==='climb'){
   p.climbing=true;p.facing=1;p.x=vine.x-8;p.vy=0;p.y=Math.max(entry.untilFeetY,p.y-VINE_PHYSICS.climbUp);p.anim+=VINE_PHYSICS.climbUp;
   if(p.y<=entry.untilFeetY){
    if(entry.exitRightX!==undefined)this.entryVineStage='right';else this.finishVineEntry();
   }
  }else if(this.entryVineStage==='right'){
   // The side passage is observed; its horizontal speed is not measured.
   p.x=Math.min(entry.exitRightX!,p.x+1);p.y=entry.untilFeetY;p.vy=0;p.climbing=true;p.facing=p.x>=vine.x+7?-1:1;p.anim++;
   if(p.x>=entry.exitRightX!){p.climbing=false;p.facing=1;if(entry.exitGroundFeetY!==undefined)this.entryVineStage='fall';else this.finishVineEntry();}
  }else if(this.entryVineStage==='fall'){
   p.climbing=false;p.facing=1;this.movePlayerY(p.vy,this.height);
   if(p.grounded&&p.y>=entry.exitGroundFeetY!)this.finishVineEntry();else p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity);
  }
  return 'climbing';
 }
 /** Native pipe-entry walk (rows 2294..2316 of 1-2): speed 2312 first, then -104 at speed byte >= 9 and +152 below it, until
  * floor(x) reaches the pipe mouth; x then holds. */
 private autoWalkPipeStep(){
  const walk=TRANSITIONS.autoWalkPipe,pipe=this.area.pipes?.find(q=>q.direction==='right'&&q.to===this.destination!.area),p=this.player;
  if(this.phaseFrame===1)this.pipeWalkSpeed=walk.firstSpeed;else this.pipeWalkSpeed+=Math.floor(this.pipeWalkSpeed/256)>=walk.pullByte?-walk.pullDown:walk.pullUp;
  if(pipe&&Math.floor(p.x)<pipe.x){p.x+=motionOf(this.pipeWalkSpeed);p.vx=this.pipeWalkSpeed/4096;}else p.vx=0;
 }
 /** Native entry walk of the ordinary side pipes (1-2, 2-2, 4-2, 7-2, 8-4: 12-13 px from the trigger column to the stop column trigger+13, then Mario stands for the
  * rest of the 52 rows): a per-pipe first speed, then the walk rule of the level-start pipe walk; a running trigger spends steps 2..9 on the run rule. */
 private sidePipeWalkStep(){
  const w=TRANSITIONS.sidePipeWalk,walk=TRANSITIONS.autoWalkPipe,pipe=this.area.pipes?.find(q=>q.direction==='right'&&q.to===this.destination!.area),p=this.player,step=this.phaseFrame;
  if(step===1)this.pipeWalkSpeed=(w.firstSpeed as Record<string,number>)[`${this.level.id}/${this.area.id}`]??w.defaultFirstSpeed;
  else{const fast=Math.floor(this.pipeWalkSpeed/256)>=walk.pullByte,run=this.pipeWalkRun&&step<=w.runUntilStep;this.pipeWalkSpeed+=run?(fast?-w.runDown:w.runUp):(fast?-walk.pullDown:walk.pullUp);}
  if(pipe&&Math.floor(p.x)<pipe.entryTriggerX!+walk.triggerOffset){p.x+=motionOf(this.pipeWalkSpeed);p.vx=this.pipeWalkSpeed/4096;}else p.vx=0;
 }
 private finishVineEntry(){this.entryVineActive=false;this.climbingVine=undefined;this.player.climbing=false;}
 // Native pipe exits (measured in the recorded route trace): Mario starts `frames` pixels below the spawn feet and rises one pixel per frame
 // without control (engine 7), then control returns at the spawn position.
 private beginPipeRise(frames:number){this.pipeRise=frames;this.player.y+=frames;this.player.grounded=false;this.player.vx=0;this.player.vy=0;}
 private updatePipeRise(){
  this.pipeRise--;this.player.y--;this.updateEnemies(this.player.y);
  if(this.pipeRise===0)this.player.grounded=this.isSolid(this.player.x+8,this.player.y);
 }
 private enterArea(id:string,spawn:[number,number],camera?:number,ordinaryEnemyFrontier?:number){
  this.loadArea(id,spawn,camera,true);this.broClock=HAMMER_NATIVE.pipeClock;this.lifeFrozen++;
  // A measured return may resume the ordinary NPC stream beyond its viewport.
  // Pipe plants are terrain actors; generators retain their normal lifecycle.
  if(ordinaryEnemyFrontier!==undefined)this.enemies=this.enemies.filter(e=>e.kind==='piranha'||e.originX>=ordinaryEnemyFrontier);
 }
 private restartToTitle(){const frame=this.frame,row=this.lifeRow,frozen=this.lifeFrozen;this.reset();this.frame=frame;this.lifeRow=row;this.lifeFrozen=frozen;}
 // Native 2-1 spring rows 10254-10267: Mario sinks 2 px per row for 8 rows, rises 2 px per row for 5 more, launches on the 14th; x stays pinned.
 private springDrop(age:number){return age<=9?2*(age-1):16-2*(age-9);}
 /** A ground start from rest that is not along the last motion (the doubled 304 step after a load, or the 152 turn from rest) does not refresh the run latch:
  * native model rows, B on the start row and not on the next: 304 start -> next step 152 in 124 of 134, 152 turn start -> 152 in 34 of 36; a 228 start (along the last motion) -> 228 in 119 of 119. */
 private restTurnStart(direction:number){return this.player.grounded&&this.player.vx===0&&this.motor.moving!==direction;}
 /* native: an A held through the load starts the first control row's jump (no release edge needed) */ private freshA=false;private controlGrace=0;private springPinX=0;private springPrevA=false;private springAEdge=0;
 springCompression(spring:SpringSpec){const age=this.springTimers.get(spring)??0;return age?Math.round(this.springDrop(age)/8):0;}
 private updateSprings(oldBottom:number,heldJump:boolean){
  // Compression and launch values are inferred; the observed spring.y is its base.
  const p=this.player;let launched=false;
  const edgeA=heldJump&&!this.springPrevA;this.springPrevA=heldJump;
  for(const spring of this.area.springs??[]){
   let age=this.springTimers.get(spring)??0;
   const aligned=p.x+14>spring.x&&p.x+2<spring.x+16,top=spring.y-24;
   if(!age&&aligned&&p.vy>=0&&oldBottom<=top+3&&p.y>=top)age=1;
   if(!age)continue;
   {
    if(age===1){this.springPinX=p.x;this.springAEdge=0;}p.x=this.springPinX;
    p.y=top+this.springDrop(age);p.vy=0;p.grounded=false;
    if(age>=14){
     // Native probe (2-1 spring, 23 branches): vy -12 when A was pressed (an edge, not a held button) on compression rows 5..13, else -7; gravity is the stomp-bounce 0.5625 whatever A does;
     // an A press on the launch row itself is an ordinary jump instead (vy -5, held-A gravity).
     if(edgeA){p.vy=PHYSICS.runJump;p.y+=PHYSICS.runJump;this.runJump=true;this.bouncing=false;this.landJump='held';this.jumpHeld=0;}
     else{p.vy=this.springAEdge===1?-12:-7;this.runJump=true;this.bouncing=true;this.bounceGravity=0.5625;this.landJump='inactive';}
     this.springAEdge=0;launched=true;if(p.size)this.emit('sfx_jump_big');
    }
    else if(edgeA&&age>=5)this.springAEdge=1;
   }
   if(age>=14)this.springTimers.delete(spring);else this.springTimers.set(spring,age+1);
  }
  return launched;
 }
 private updateGenerators(){
  // The shot's 1.5px/frame travel is measured. Cannon cooldown and close-range
  // inhibition are inferred rules; phases are deterministic across resets.
  this.areaPlayFrame++;
  this.updateNativeCannons();
  this.updateSwimGenerator();
  for(const [index,cannon]of(this.area.cannons??[]).entries()){
   if(cannon.native){if(this.recordedRoute&&cannon.fire)this.updateNativeCannon(cannon);continue;}
   const interval=cannon.interval??160,phase=cannon.phase??index*37%interval;
   if(this.areaFrame<phase||(this.areaFrame-phase)%interval!==0||cannon.x<this.camera||cannon.x>this.camera+240||Math.abs(this.player.x-cannon.x)<24)continue;
   const direction=this.player.x<cannon.x?-1:1;
   const bullet=this.makeEnemy({kind:'bullet',x:cannon.x+direction*8,y:cannon.y+16,direction,evidence:cannon.evidence??'Observed cannon; firing cooldown and inhibition distance inferred.'});
   bullet.active=true;this.enemies.push(bullet);
  }
  for(const generator of this.area.generators??[]){
   if(this.recordedRoute&&generator.schedule){this.launchScheduledFish(generator);continue;}
   if(generator.maxFish){this.updateFishFrenzy(generator);continue;}
   if(generator.heights){this.updateNativeBulletGenerator(generator);continue;}
   if(this.player.x<generator.from||this.player.x>generator.to||this.areaFrame%generator.interval!==0)continue;
   const sequence=Math.floor(this.areaFrame/generator.interval);
   if(generator.kind==='bullet'){
    const enemy=this.makeEnemy({kind:'bullet',x:this.camera+264,y:104+sequence%3*32,direction:-1,evidence:'Inferred deterministic generator; interval and height sequence unmeasured.'});
    enemy.active=true;this.enemies.push(enemy);
   }else{
    const enemy=this.makeEnemy({kind:'cheep',motion:'flying',x:this.camera+32+sequence*73%224,y:264,direction:sequence%2?1:-1,evidence:'Inferred flying-fish launch; exact phase and trajectory unmeasured.'});
    enemy.vx=(sequence%2?1:-1)*1.25;enemy.vy=-5.5;enemy.active=true;this.enemies.push(enemy);
   }
  }
 }
 // Native Bullet Bill (docs/NATIVE_ROLES.md): a shot's first row is the spawn position, then 1.5 px/frame toward Mario (cannon) or left (generator).
 private spawnNativeBullet(x:number,feetY:number,direction:number){
  const bullet=this.makeEnemy({kind:'bullet',x,y:feetY,direction,evidence:'Native Bullet Bill: spawn row at the cannon/generator position, 1.5 px/frame.'});
  bullet.nativeShot=true;bullet.active=true;this.enemies.push(bullet);
 }
 // Native cannons (docs/NATIVE_ROLES.md): a cannon takes the next of six table entries when its column loads. Each frame every free enemy slot s of 0..2 reads random byte s+1: a value below 6 picks an
 // entry, whose timer counts down; at 0 it restarts and the cannon shoots if it is on screen (0 <= x - camera <= 255) and Mario is at least 48 px away (any other attempt is the one-frame object).
 // Native RAM of free play (evidence/hazards2-findings-20261111.md, 7 runs): (1) a cannon loads on the row its column comes in, x - camera <= 352 for x on a 32-px boundary, <= 358 between
 // (camera of the row before, as the remake reads it here), and is first picked on the next row; (2) a failed attempt's one-row object holds slot s on the next row, so s does not pick then;
 // (3) the level's first native row (engine 7, before the remake's first frame) already runs a pass on the register one frame back.
 private cannonFlash=new Set<number>();private cannonStartTable?:object;
 private updateNativeCannons(){
  const cannons=(this.area.cannons??[]).filter(c=>c.native);if(!cannons.length||this.recordedRoute)return;
  while(this.cannonsLoaded<cannons.length&&cannons[this.cannonsLoaded].x-this.camera<=(cannons[this.cannonsLoaded].x%32?BULLETS.cannonLoadAheadOdd:BULLETS.cannonLoadAhead)){this.cannonTable[this.cannonsLoaded%6]={cannon:cannons[this.cannonsLoaded],timer:0};this.cannonsLoaded++;}
  this.freeNativeSlot();
  const used=new Set(this.enemies.filter(e=>e.active&&!e.dead).map(e=>e.enemySlot)),mask=Number(this.level.id[0])>=BULLETS.cannonHardWorld?7:15,b=this.random.bytes;
  if(this.cannonStartTable!==this.cannonTable){this.cannonStartTable=this.cannonTable;this.nativeCannonPass(used,mask,[0,1,2,3].map(k=>(b[k]<<1|b[k+1]>>7)&255));}
  for(const slot of this.cannonFlash)used.add(slot);this.cannonFlash=new Set();
  this.nativeCannonPass(used,mask,b);
 }
 private nativeCannonPass(used:Set<number|undefined>,mask:number,bytes:number[]){
  for(let slot=2;slot>=0;slot--){ // slots 2, 1, 0: when two slots pick one entry, the lower one makes the attempt (8 of 8 native double picks)
   const entry=used.has(slot)?undefined:this.cannonTable[bytes[slot+1]&mask];
   if(!entry)continue;
   if(entry.timer>0){entry.timer--;continue;}
   entry.timer=BULLETS.cannonRestart;
   const {x,y}=entry.cannon;
   if(x<this.camera||x-this.camera>BULLETS.cannonScreenRight||Math.abs(this.player.x-x)<BULLETS.cannonMinDistance){this.cannonFlash.add(slot);continue;}
   this.spawnNativeBullet(x,y+16,this.player.x<x?-1:1);this.enemies[this.enemies.length-1].enemySlot=slot;used.add(slot);
  }
 }
 // Route comparison only: the attempt times of the recorded route (frames since the visit start, then the last gaps repeat).
 private updateNativeCannon(cannon:CannonSpec){
  const fire=cannon.fire!,frame=this.areaPlayFrame,last=fire[fire.length-1];
  let due=fire.includes(frame);
  if(!due&&frame>last){const loop=cannon.loop!,cycle=loop.reduce((a,b)=>a+b,0),r=(frame-last)%cycle;let at=0;due=loop.some(gap=>(at+=gap)%cycle===r);}
  const onScreen=cannon.x>=this.camera&&cannon.x-this.camera<=BULLETS.cannonScreenRight;
  if(!due||!onScreen||Math.abs(this.player.x-cannon.x)<BULLETS.cannonMinDistance)return;
  this.spawnNativeBullet(cannon.x,cannon.y+16,this.player.x<cannon.x?-1:1);
 }
 // 5-3 / 6-3: one Bullet Bill at a time, spawned at camera + 287 at a recorded (pseudo-random) height as soon as the previous one is gone.
 private updateNativeBulletGenerator(generator:GeneratorSpec){
  if(this.camera<generator.fromCamera!||this.camera>generator.toCamera!)return;
  const shots=this.enemies.filter(e=>e.nativeShot&&e.kind==='bullet');
  if(shots.some(e=>e.dead===0||e.dead<100&&e.y<=280))return;
  this.spawnNativeBullet(this.camera+BULLETS.generatorSpawnAhead,generator.heights![shots.length%generator.heights!.length]+BULLETS.generatorFeetOffset,-1);
 }
 // A native shot is removed when its next position is left of the screen (native: x - camera < about -73 on the current camera; the enemy step sees the previous camera, so 70 here) or right of camera + 329.
 private nativeBulletGone(e:Enemy){
  const next=e.x+(!e.nativeShot||e.age>1?Math.sign(e.vx)*BULLETS.speed:0);
  return next<this.camera-BULLETS.removeLeft||next>this.camera+BULLETS.removeRight||e.y>280;
 }
 // Route comparison only: the launches of the recorded route (the list repeats every `period` frames for a slower run), at Mario's x plus the class offset.
 private launchScheduledFish(generator:GeneratorSpec){
  if(this.player.x<generator.from||this.player.x>generator.to)return;
  const period=generator.period??Infinity;
  for(const [frame,index] of generator.schedule!){
   if(this.areaFrame<frame||(this.areaFrame-frame)%period!==0)continue;
   const kind=FLYING_FISH.classes[index];
   const enemy=this.makeEnemy({kind:'cheep',motion:'flying',x:this.player.x+kind.offsetX,y:FLYING_FISH.launch.feetY,direction:1,evidence:'Native leaping Cheep Cheep: recorded launch schedule, constant-speed class and 187-frame arc.'});
   enemy.nativeFlight=true;enemy.vx=kind.speed;enemy.vy=FLYING_FISH.launch.vy;enemy.active=true;this.enemies.push(enemy);
  }
 }
 // Lowest native enemy slot not in use. Slots are not modelled elsewhere, so live enemies take theirs here, in the order they were activated.
 private freeNativeSlot(){
  const live=this.enemies.filter(e=>e.active&&!e.dead),used=new Set(live.flatMap(e=>e.enemySlot===undefined?[]:[e.enemySlot]));
  const lowest=()=>{let slot=0;while(used.has(slot))slot++;return slot;};
  for(const e of live)if(e.enemySlot===undefined){e.enemySlot=lowest();used.add(e.enemySlot);}
  return lowest();
 }
 // Native flying fish (docs/NATIVE_ROLES.md): when the timer runs out the lowest free slot s picks the next wait from random byte s+1, and a fish is launched if s is below the area's limit.
 // Random byte s and Mario's speed byte pick its speed and start offset; a standing Mario gets a random offset (byte s+2) unless byte s+1 is 0 in its low bits, and the fish then flies toward him.
 /** Native (RAM 0x71F/0x78F, evidence/leaper3-findings-20261111.md): the fish timer is not read on the row after the camera crosses a multiple of 32 px moving right
  * (15 of 15 expiries on that row launch one row late; rule replay on native RAM 510 of 556 launches vs 432 without it). Returns whether this row is that row. */
 private fishCameraCrossed(){const before=this.fishCamera;this.fishCamera=this.camera;return before!==undefined&&Math.floor(this.camera/32)>Math.floor(before/32);}
 private fishCamera?:number;
 private updateFishFrenzy(generator:GeneratorSpec){
  this.freeNativeSlot(); // an enemy takes its native slot on the frame it activates (not when the timer next reads the slots): a later fish then sees the real free slot
  const crossed=this.fishCameraCrossed();
  if(this.camera<generator.fromCamera!||this.player.x>generator.to||(this.fishTimer>0&&--this.fishTimer>0))return;
  if(crossed)return; // the timer stays at 0 and is read on the next row
  const F=FLYING_FISH.frenzy,bytes=this.random.bytes,slot=this.freeNativeSlot(),wait=bytes[slot+1]&3;
  if(slot>=5)return; // all five native slots busy: the timer stays at 0 until one is free (7-3 rows 451, 244)
  this.fishTimer=F.waits[wait];
  if(slot>=generator.maxFish!)return;
  const speedByte=Math.floor(this.player.vx*16)&255,table=speedByte===0?0:speedByte<F.walkSpeedLimit?1:2,entry=table*4+(bytes[slot]&3),place=table===0&&wait?bytes[slot+2]&15:entry;
  const offset=F.offsets[place],speed=F.speeds[entry]*(table===0&&offset>0?-1:1);
  const enemy=this.makeEnemy({kind:'cheep',motion:'flying',x:this.player.x+offset,y:FLYING_FISH.launch.feetY,direction:Math.sign(speed),evidence:'Native leaping Cheep Cheep: random-register launch, 187-frame arc.'});
  enemy.nativeFlight=true;enemy.enemySlot=slot;enemy.vx=speed;enemy.vy=FLYING_FISH.launch.vy;enemy.active=true;this.enemies.push(enemy);
 }
 // Native swimming Cheep generator (2-2/7-2 water, free play; the recorded route replays its list): once the 32-frame timer is 0 the lowest free slot, if below 3, gets a fish at camera + 287.
 private updateSwimGenerator(){
  const rule=SWIM_GEN_LEVELS[this.level.id];
  if(!rule||this.recordedRoute||!this.area.enemies.some(e=>e.kind==='cheep'&&e.swim))return;
  this.enemies=this.enemies.filter(e=>e.active||!(e.kind==='cheep'&&e.swim)); // the route's list is replaced
  if(this.swimTimer>0&&--this.swimTimer>0||this.camera<rule.fromCamera||this.camera>rule.toCamera)return;
  const slot=this.freeNativeSlot();if(slot>=SWIM_GEN.slots)return;
  const pick=nativeSwimCheepPick(this.random.bytes[slot],this.swimBag,this.level.id);this.swimBag=pick.bag;this.swimTimer=SWIM_GEN.timer;
  const fish=this.makeEnemy({kind:'cheep',x:this.camera+SWIM_GEN.spawnAhead,y:pick.y+SWIM_GEN.feetOffset,direction:-1,palette:(SWIM_GEN.palettes as Record<string,string>)[pick.id],swim:{},evidence:'Native swimming Cheep generator: random byte of its slot, eight-height bag, 32-frame timer.'});
  fish.enemySlot=slot;fish.active=true;this.enemies.push(fish);
 }
 // Native Podoboo: appears below the screen (feet y 282), falls under gravity until its launch frame, jumps with the measured speed, falls with a cap and is
 // launched again with the mean speed as soon as it is back at the bottom.
 private updateNativePodoboo(e:Enemy){
  const k=e.age-1,launch=e.launch!;
  if(k===launch.delay)e.vy=-launch.v0;
  else if(k>launch.delay&&e.vy>0&&e.y>=PODOBOO.relaunchFeetY)e.vy=-PODOBOO.v0;
  e.y+=e.vy;e.vy=Math.min(PODOBOO.maxFall,e.vy+PODOBOO.gravity);e.podobooFalling=e.vy>0;
 }
 // Native Blooper (docs/NATIVE_ROLES.md): a 24-frame stroke moves it 32 px up and 32 px sideways (1,2,1 px/frame in 8-frame thirds), between strokes it sinks 1 px every 2 frames.
 // Strokes start on the frame counter's 8-frame tick: the first one at the first tick after it appears, the next 32 frames (second) or 40 frames (later) after the last ended, once it is no more
 // than 16 px above Mario (native tops: Blooper y - player y + 8). The sideways direction can change on any frame, also mid-stroke.
 private updateNativeBlooper(e:Enemy){
  const p=this.player,k=e.age-1;let b=e.bloop;
  this.nativeBlooperTurn(e);
  if(!b){if(k<1||this.random.frame&7)return;b=e.bloop={start:k,count:0};}
  else if(k-b.start>=24){
   const idle=k-b.start-24,gap=b.count===0?32:40;
   if(idle>=gap&&(idle-gap)%8===0&&e.y-p.y+8>=-16)b=e.bloop={start:k,count:b.count+1};
   else{if(idle>=2&&idle%2===0&&(idle<=gap-4||idle>=gap))e.y+=1;return;} // +1 px every 2 frames, the last 3 frames before a minimum-gap stroke stand still
  }
  const step=k-b.start<8||k-b.start>=16?1:2;e.x+=e.nativeDir!*step;e.y-=step;
 }
 // It starts going left. When the low bits of random byte slot+1 are all 0 it turns: an even slot toward Mario, an odd slot the way Mario last moved. Not while it rests on the bottom.
 private nativeBlooperTurn(e:Enemy){
  e.nativeDir??=-1;if(e.enemySlot===undefined)this.freeNativeSlot();
  const mask=(WATER_RULES.blooperTurnMask as Record<string,number>)[this.level.id]??WATER_RULES.blooperTurnMask['2-2'];
  if(this.random.bytes[e.enemySlot!+1]&mask||e.y-24>=WATER_RULES.blooperRestY)return;
  e.nativeDir=e.enemySlot!&1?this.marioMotion:this.player.x>=e.x?1:-1;
 }
 // Native Hammer Bros (docs/NATIVE_ROLES.md, Hammer Bro section; data/native-hammer-bros.json). Bros of a level that has a roster take the recorded spawn x / feet of the nearest
 // roster entry. Once active, the patrol is the area clock (0.25 px/frame, right while the frames since the area load mod 128 < 64, no walls), jumps are the recorded strong/weak
 // times (hidden random state) continued by the old local timer, and throw cycles run from the moment the Bro is on screen: recorded cycles, then the native period.
 private bindNativeHammerBros(){
  this.broClock=HAMMER_NATIVE.levelClock;
  const roster=(hammerBroData.bros as unknown as NativeHammerBro[]).filter(b=>b.level===this.level.id&&b.area===this.area.id),taken=new Set<NativeHammerBro>();
  for(const e of this.enemies){
   if(e.kind!=='hammerBro')continue;
   let best:NativeHammerBro|undefined;
   for(const b of roster)if(!taken.has(b)&&Math.abs(b.x-e.x)<=32&&(!best||Math.abs(b.x-e.x)<Math.abs(best.x-e.x)))best=b;
   if(!best)continue;
   taken.add(best);e.nativeBro=best;e.x=best.x;e.y=best.y;if(best.appear!==undefined)e.spawnFrame=best.appear-HAMMER_NATIVE.pipeClock;
  }
 }
 private updateNativeHammerBro(e:Enemy){
  const N=HAMMER_NATIVE,t=e.age-1,clock=(((this.broClock+N.clockShift)%(2*N.patrolHalf))+2*N.patrolHalf)%(2*N.patrolHalf); // t: native row index since the Bro appeared
  if(t>0)e.x+=clock<N.patrolHalf?N.patrolSpeed:-N.patrolSpeed;
  this.nativeHammerBroJump(e,t);
  this.nativeHammerBroThrow(e,t);
 }
 // Vertical motion in native order (position, then speed): strong -6 / weak -3 px/frame, gravity 61/256, fall cap 3.234375. A weak jump passes down through the row it left.
 private nativeHammerBroJump(e:Enemy,t:number){
  const J=HAMMER_NATIVE.jump,jumps=e.nativeBro!.jumps,recorded=jumps.find(j=>j[0]===t)?.[1],lastRecorded=jumps.length?jumps[jumps.length-1][0]:0;
  let launch=recorded; // 1 = weak, 0 = strong
  if(t>lastRecorded){ // after the recorded jumps: the local timer of the old model (192..255 frames), weak only above a lower floor
   if(e.hammerRandom===undefined){e.hammerRandom=hammerRandom((Math.trunc(e.originX)*17^Math.trunc(e.originY)*31)>>>0);e.hammerJumpWait=hammerBroRules.choice.timerMinimum+e.hammerRandom%hammerBroRules.choice.timerVariants;}
   if(e.hammerJumpWait!>0)e.hammerJumpWait!--;
   const support=this.collisionAt(e.x+8,e.y+1);
   if(e.hammerJumpWait===0&&!e.hammerAir&&support){
    let lowerFloor=false;
    if(!this.collisionAt(e.x+8,support.y+support.height))for(let y=support.y+support.height+1;y<240;y++)if(this.collisionAt(e.x+8,y)){lowerFloor=true;break;}
    e.hammerRandom=hammerRandom(e.hammerRandom);launch=lowerFloor&&(e.hammerRandom>>>8)%hammerBroRules.choice.weakChanceDivisor===0?1:0;
    e.hammerRandom=hammerRandom(e.hammerRandom);e.hammerJumpWait=hammerBroRules.choice.timerMinimum+e.hammerRandom%hammerBroRules.choice.timerVariants;
   }
  }
  const support=this.collisionAt(e.x+8,e.y+1);
  if(launch!==undefined&&!e.hammerAir){e.hammerDropRow=launch===1&&support?support.y:undefined;e.vy=-(launch===1?J.weak:J.strong);e.hammerAir=true;}
  else if(!e.hammerAir&&!support)e.hammerAir=true; // spawned or walked off its floor
  if(!e.hammerAir)return;
  const before=e.vy;e.y+=e.vy;e.vy=Math.min(e.vy+J.gravity,J.maxFall);
  if(before>=0){const floor=this.collisionAt(e.x+8,e.y);if(floor&&floor.y!==e.hammerDropRow){e.y=floor.y;e.vy=0;e.hammerAir=false;}}
  if(e.hammerDropRow!==undefined&&e.y>e.hammerDropRow+16)e.hammerDropRow=undefined;
 }
 // Throw cycles: the first starts when the Bro is on screen (x - camera <= 245), then every 29 (worlds 6-8) / 49 (worlds 1-5) frames; the recorded cycles (some are skipped
 // by hidden state) come first. The hammer is held 14 frames at (+2, -10) of the Bro's native top-left, then released toward Mario.
 private nativeHammerBroThrow(e:Enemy,t:number){
  const N=HAMMER_NATIVE,b=e.nativeBro!;
  if(e.nativeTrigger===undefined){if(e.x-this.camera<=N.triggerScreenX)e.nativeTrigger=t;else return;}
  const k=t-e.nativeTrigger,list=b.throws??[],last=list.length?list[list.length-1]:0,period=parseInt(this.level.id)<=5?N.period.early:N.period.late;
  if(!(list.includes(k)||(k>last&&(k-last)%period===0)))return;
  this.items.push({kind:'hammer',x:e.x+N.handDx,y:e.y-24+N.handDy,vx:0,vy:0,age:0,life:900,hold:N.handFrames+1,owner:e,gravity:N.throwGravity});
 }
 private holdNativeHammer(i:Item){
  const N=HAMMER_NATIVE,e=i.owner!;
  if(e.dead){i.life=0;return;}
  i.x=e.x+N.handDx;i.y=e.y-24+N.handDy;
  if(--i.hold!<=0){i.hold=undefined;i.vx=(this.player.x<e.x?-1:1)*N.throwSpeed;i.vy=-N.throwImpulse;}
 }
 // Native Lakitu (docs/NATIVE_ROLES.md, Lakitu section). Speed s in 1/16 px per frame from d = integer Lakitu x - Mario x of the previous frame, three modes:
 // 'left' (appears 190 px ahead, s = -(5 + (60-|d|)/4)), 'chase' once Lakitu is 57 px behind Mario (s = base + a tent of d; base 48 for a running Mario,
 // 32 walking, 5 stopped; past 61 px ahead s drops 1 per frame and restarts at base+1), 'flee' (-1 px/frame, no more eggs) when Mario passes fleeX.
 private updateNativeLakitu(e:Enemy){
  const p=this.player,C=LAKITU.chase,lak=e.lak??(e.lak={mode:'left',s:-LAKITU.leftSpeed.base});
  if(e.age===1)e.x+=LAKITU.spawnFraction;
  const d=Math.floor(e.x)-Math.floor(p.x),v=Math.max(0,p.vx*16);
  if(lak.mode!=='flee'&&e.fleeX!==undefined&&p.x>=e.fleeX)lak.mode='flee';
  if(lak.mode==='left'&&d<=C.switchDistance)lak.mode='chase';
  if(lak.mode==='flee')lak.s=LAKITU.flee.speed;
  else if(lak.mode==='left'){const L=LAKITU.leftSpeed;lak.s=-Math.round(L.base+(L.spread-Math.min(Math.abs(d),L.spread))/L.divisor);}
  else{
   const base=v>=C.fastClass?C.fastBase:v>=10?C.slowBase:C.stoppedBase;
   if(d>=(base===C.fastBase?C.farFast:base===C.slowBase?C.farSlow:C.farStopped)){
    if(lak.s-1<=0){lak.mode='left';lak.s=-LAKITU.leftSpeed.base;}
    else lak.s--;
   }else if(lak.s<base)lak.s=base+1;
   else lak.s=base+Math.max(0,Math.min(C.plateau,Math.floor(d<0?(C.leftOffset+d)/4:(C.rightOffset-d)/4)));
  }
  if(e.age>1)e.x+=lak.s/16;
  e.y=64;
  if(lak.mode!=='flee'&&e.age>=LAKITU.firstThrowAge&&(e.age-LAKITU.firstThrowAge)%LAKITU.throwInterval===0){
   const egg=this.makeEnemy({kind:'spiny',motion:'falling',x:e.x,y:e.y-LAKITU.egg.aboveLakitu,direction:p.x<e.x?-1:1,palette:'0f-16-30-27',evidence:'Native Lakitu egg: thrown every 128 frames at the Lakitu x.'});
   egg.active=true;egg.egg=true;egg.vx=0;egg.vy=LAKITU.egg.vy0;this.enemies.push(egg);
  }
 }
 private updateMaze(oldX:number){
  for(const state of this.mazeStates){
   if(state.completed)continue;
   const gates=state.spec.gates??[];
   // The measured wrong-route cases establish a repeat. Sampling at the end
   // of each editable corridor band is an inference, with no recovery after
   // a missed sample. Each 7-4 section keeps an independent sequence.
   let failed=false;
   while(state.gate<gates.length){
    const gate=gates[state.gate];if(oldX>=gate.to||this.player.x<gate.to)break;
    state.gate++;
    if(this.player.y<gate.minFeetY||this.player.y>gate.maxFeetY){failed=true;break;}
   }
   if(gates.length&&state.gate===gates.length&&!failed){state.completed=true;continue;}
   // Unconditional 8-4 repeats are prepared before their first pixel enters
   // the viewport. Failed gated routes are known even earlier. Coordinates
   // and dynamic actors already on screen remain continuous in both cases.
   if(failed||!gates.length&&this.camera+272>=state.spec.loopAt)this.insertMazeSection(state);
  }
 }
 private insertMazeSection(state:MazeState){
  const seam=state.spec.loopAt,from=state.sourceFrom,to=state.sourceTo,delta=to-from,offset=seam-from,source=this.mazeSource;
  const shift=(x:number)=>x>=seam?x+delta:x;
  const inSource=(x:number)=>x>=from&&x<to;
  const points=<T extends {x:number}>(current:T[]|undefined,original:T[]|undefined):T[]|undefined=>current?.map(p=>p.x>=seam?{...p,x:p.x+delta}:p).concat((original??[]).filter(p=>inSource(p.x)).map(p=>({...structuredClone(p),x:p.x+offset})));
  const tiles=(current:Area['tiles'])=>current.map(([x,y,id])=>[shift(x*16)/16,y,id] as Area['tiles'][number]).concat(source.tiles.filter(([x])=>inSource(x*16)).map(([x,y,id])=>[x+offset/16,y,id]));
  this.area.tiles=tiles(this.area.tiles);
  const currentTiles:Area['tiles']=[...this.tiles].map(([key,id])=>[...key.split(',').map(Number),id] as Area['tiles'][number]);
  this.tiles=new Map(tiles(currentTiles).map(([x,y,id])=>[`${x},${y}`,id]));
  this.freeTiles=points(this.freeTiles,source.freeTiles)!;this.area.freeTiles=this.freeTiles;
  this.area.decorations=points(this.area.decorations,source.decorations);
  this.area.firebars=points(this.area.firebars,source.firebars);
  this.area.platforms=points(this.area.platforms,source.platforms);
  this.area.springs=points(this.area.springs,source.springs);
  this.area.cannons=points(this.area.cannons,source.cannons);
  this.area.patternOverrides=this.area.patternOverrides?.map(([x,y,id,file])=>[shift(x*8)/8,y,id,file] as [number,number,number,string]).concat((source.patternOverrides??[]).filter(([x])=>inSource(x*8)).map(([x,y,id,file])=>[x+offset/8,y,id,file]));
  // Rectangles/ranges may straddle a seam, unlike grid tile origins. Split
  // those unions so their original suffix moves beyond the inserted section.
  this.area.solidRects=this.area.solidRects?.flatMap(rect=>{
   const end=rect.x+rect.width;if(rect.x>=seam)return [{...rect,x:rect.x+delta}];
   if(end<=seam)return [rect];
   return [{...rect,width:seam-rect.x},{...rect,x:seam+delta,width:end-seam}];
  }).concat((source.solidRects??[]).filter(r=>r.x<to&&r.x+r.width>from).map(r=>({...r,x:Math.max(from,r.x)+offset,width:Math.min(to,r.x+r.width)-Math.max(from,r.x)})));
  this.area.generators=this.area.generators?.flatMap(g=>{
   if(g.from>=seam)return [{...g,from:g.from+delta,to:g.to+delta}];
   if(g.to<=seam)return [g];
   return [{...g,to:seam},{...g,from:seam+delta,to:g.to+delta}];
  }).concat((source.generators??[]).filter(g=>g.from<to&&g.to>from).map(g=>({...g,from:Math.max(from,g.from)+offset,to:Math.min(to,g.to)+offset})));
  const target=<T extends {to?:string;spawn?:[number,number];camera?:number}>(p:T):T=>p.to===this.area.id?{...p,spawn:p.spawn?[shift(p.spawn[0]),p.spawn[1]]:undefined,camera:p.camera===undefined?undefined:shift(p.camera)}:p;
  this.area.pipes=points(this.area.pipes,source.pipes)?.map(target);
  this.area.vines=points(this.area.vines,source.vines)?.map(target);
  for(const vine of this.vines)vine.x=shift(vine.x);
  this.vines.push(...(source.vines??[]).filter(v=>inSource(v.x)).map(v=>({...structuredClone(v),x:v.x+offset,height:v.initialHeight??0,growing:false})));
  this.area.blockContents=this.area.blockContents?.map(b=>({...b,col:shift(b.col*16)/16})).concat((source.blockContents??[]).filter(b=>inSource(b.col*16)).map(b=>({...b,col:b.col+offset/16})));
  this.area.enemies=this.area.enemies.map(e=>({...e,x:shift(e.x),spawnCamera:e.spawnCamera===undefined?undefined:e.x>=seam?e.spawnCamera+delta:e.spawnCamera}));
  const repeatedEnemies=source.enemies.filter(e=>inSource(e.x)).map(e=>({...structuredClone(e),x:e.x+offset,spawnCamera:e.spawnCamera===undefined?undefined:e.spawnCamera+offset}));
  this.area.enemies.push(...repeatedEnemies);
  for(const enemy of this.enemies)if(enemy.originX>=seam){enemy.x+=delta;enemy.originX+=delta;if(enemy.spawnCamera!==undefined)enemy.spawnCamera+=delta;}
  this.enemies.push(...repeatedEnemies.map(e=>this.makeEnemy(e)));
  if(this.area.exit){const exit=this.area.exit;for(const field of ['x','retainerX','stopX','doorX'] as const)if(exit[field]!==undefined)exit[field]=shift(exit[field]!);}
  if(this.area.checkpoint){const checkpoint=this.area.checkpoint;checkpoint.activationX=shift(checkpoint.activationX);checkpoint.spawn=[shift(checkpoint.spawn[0]),checkpoint.spawn[1]];checkpoint.camera=shift(checkpoint.camera);checkpoint.activationBracket=[shift(checkpoint.activationBracket[0]),shift(checkpoint.activationBracket[1])];}
  if(this.area.fallExit)this.area.fallExit=target(this.area.fallExit);
  const tileKey=(key:string)=>{const [x,y]=key.split(',').map(Number);return `${shift(x*16)/16},${y}`;};
  this.bump=new Map([...this.bump].map(([key,age])=>[tileKey(key),age]));const shiftedRehits=[...this.usedBlockRehits].map(tileKey);this.usedBlockRehits.clear();for(const key of shiftedRehits)this.usedBlockRehits.add(key);this.bridge=this.bridge.map(tileKey);
  this.area.width+=delta;
  for(const other of this.mazeStates){
   if(other===state){other.spec.loopTo+=delta;other.spec.loopAt+=delta;other.gate=0;}
   else{other.spec.loopTo=shift(other.spec.loopTo);other.spec.loopAt=shift(other.spec.loopAt);}
   for(const gate of other.spec.gates??[]){gate.from=other===state?gate.from+delta:shift(gate.from);gate.to=other===state?gate.to+delta:shift(gate.to);}
  }
  // Renderer caches baseline tiles by area identity for partial pattern edits.
  this.area={...this.area};
 }
 private flagCameraScreenX=141;
 private beginFlag(){
  this.flagCameraScreenX=this.player.x-this.camera+24;
  this.flagTop=FLAG_COMPLETION.flagTopY;this.flagInside=false;this.flagWait=0;this.flagFireworksAwarded=0;
  const digit=this.time%10;this.flagFireworkCount=[1,3,6].includes(digit)?digit:0;
  const pole=this.area.exit!;
  const tops=[...this.tiles].filter(([key,id])=>id===69&&Number(key.split(',')[0])*16>pole.x&&Number(key.split(',')[0])*16<pole.x+256).map(([key])=>key.split(',').map(Number));
  const row=Math.min(...tops.map(t=>t[1]));const roof=tops.filter(t=>t[1]===row).map(t=>t[0]);
  this.flagCastleGeometry=roof.length?{x:(Math.min(...roof)+Math.max(...roof))*8,roofY:row*16}:undefined;
  this.player.climbing=true;this.player.facing=1;
 }
 get castleFlag(){
  if(this.phase!=='flag'||!this.flagInside||this.time!==0||!this.flagCastleGeometry)return undefined;
  const castle=this.flagCastleGeometry;
  return {x:castle.x,y:castle.roofY+FLAG_COMPLETION.castleFlagInitialOffsetY-Math.min(FLAG_COMPLETION.castleRaiseFrames,this.flagWait)};
 }
 get flagFireworks(){
  if(this.phase!=='flag'||!this.flagInside||this.time!==0||!this.flagCastleGeometry)return [];
  const elapsed=this.flagWait-FLAG_COMPLETION.fireworkFirstFrame;if(elapsed<0)return [];
  const index=Math.floor(elapsed/FLAG_COMPLETION.fireworkPeriod),age=elapsed%FLAG_COMPLETION.fireworkPeriod;
  if(index>=this.flagFireworkCount||age===0||age>=FLAG_COMPLETION.fireworkLifeFrames)return [];
  const [x,y]=FLAG_COMPLETION.fireworkOffsetsFromCastleFlag[index];
  return [{index,x:this.flagCastleGeometry.x+x,y,phase:Math.floor(age/FLAG_COMPLETION.fireworkPhaseFrames)}];
 }
 private updateFlag(){
  const p=this.player,exit=this.area.exit!,rules=FLAG_COMPLETION;
  this.flagTop=Math.min(rules.flagBottomY,rules.flagTopY+this.phaseFrame*rules.slideSpeed);
  if(this.phaseFrame<=rules.slideFrames){p.climbing=true;p.y=Math.min(191,p.y+rules.slideSpeed);return;}
  if(this.phaseFrame===rules.slideFrames+1){this.score+=this.flagBonus;this.emit('event_level_clear');}
  const walkFrom=rules.slideFrames+rules.flipFrames+1;
  if(this.phaseFrame<walkFrom){p.x=exit.x-1;p.y=191;p.climbing=true;p.facing=-1;return;}
  p.climbing=false;p.facing=1;
  if(!this.flagInside){
   if(this.phaseFrame===walkFrom){p.vx=rules.walkInitialSpeed;p.vy=0;}
   if(p.y>=208)p.vx=Math.min(rules.walkMaxSpeed,p.vx+rules.walkAcceleration);
   p.x+=Math.floor(p.vx*32)/32;p.anim+=p.vx;
   // Image-fitted cutscene support/acceleration, separate from manual jump rules.
   p.grounded=p.y>=208;
   if(p.y>191&&p.y<208&&this.isSolid(p.x+rules.walkSupportProbeX,p.y+1)){p.y=Math.ceil(p.y);p.vy=0;p.grounded=true;}
   if(p.y<208&&!this.isSolid(p.x+rules.walkSupportProbeX,p.y+1)){
    p.vy=Math.min(PHYSICS.maxFall,p.vy+rules.walkGravity);const next=p.y+p.vy;
    let landed=false;
    for(let y=Math.ceil(p.y);y<=next;y++)if(this.isSolid(p.x+rules.walkSupportProbeX,y)){p.y=y;p.vy=0;p.grounded=true;landed=true;break;}
    if(!landed)p.y=next;
   }
   this.camera=Math.max(this.camera,Math.min(Math.floor(p.x)-this.flagCameraScreenX,this.area.width-256));
   if(exit.doorX!==undefined&&p.x>=exit.doorX){this.flagInside=true;p.vx=0;}
  }else if(this.time>0){
   this.time--;this.score+=rules.timerPoints;if(this.time%4===0)this.emit('sfx_timer_tick');
  }else{
   this.flagWait++;
   if(this.flagFireworkCount){
    const elapsed=this.flagWait-rules.fireworkFirstFrame;
    if(elapsed>=0&&elapsed%rules.fireworkPeriod===1&&Math.floor(elapsed/rules.fireworkPeriod)<this.flagFireworkCount)this.emit('sfx_blast_fireworks');
    const completed=Math.min(this.flagFireworkCount,Math.max(0,Math.floor((elapsed-rules.fireworkLifeFrames)/rules.fireworkPeriod)+1));
    if(completed>this.flagFireworksAwarded){this.score+=(completed-this.flagFireworksAwarded)*rules.fireworkPoints;this.flagFireworksAwarded=completed;}
    const lastCompleted=rules.fireworkFirstFrame+(this.flagFireworkCount-1)*rules.fireworkPeriod+rules.fireworkLifeFrames;
    // The21-frame phase is inferred. Observed post-burst boundaries span80..108
    // frames; this84..104 candidate is not a verified2-frame transition match.
    if(this.flagWait>=lastCompleted+rules.fireworksEndMinimumWait&&this.areaFrame%rules.fireworksEndInterval===rules.fireworksEndPhase)this.nextLevel();
   }else if(this.flagWait>=rules.noFireworksEndWait&&this.areaFrame%rules.fireworksEndInterval===rules.fireworksEndPhase)this.nextLevel(); // native no-firework levels end on the same 21-row area-clock phase, 140-160 rows after the timer reaches 0
  }
 }
 /** Native castle end (7 route castles): the level load comes on the same free-running 21-row area clock as the flag levels (6 of 7 loads at (load row - first play row) = 4 mod 21),
  * at the first such row once the message has run `hold` - 15 rows (hold 368 was the mean; 5..15 early all fit). */
 private castleEndDue(hold:number){if(this.level.id==='6-4')hold+=CASTLE_END_64_EXTRA;return this.phaseFrame-this.castleArrivalFrame>=hold-CASTLE_END_EARLY&&this.areaFrame%FLAG_COMPLETION.fireworksEndInterval===CASTLE_END_PHASE;}
 private updateCastle(){
  const p=this.player,exit=this.area.exit,rules=CASTLE_COMPLETION;
  if(this.castleStage==='bridge'){
   // The initial inherited phase is unmeasured; the four-frame removal cadence
   // and direction are visible in all eight native castle traces.
   if(this.phaseFrame>=rules.collapseInitialWaitFrames&&(this.phaseFrame-rules.collapseInitialWaitFrames)%rules.bridgeTileFrames===0){
    const key=this.bridge.shift();if(key){this.tiles.delete(key);const x=Number(key.split(',')[0])*16;this.freeTiles=this.freeTiles.filter(t=>t.id!==137||t.x<x||t.x>=x+16);}
   }
   if(!this.bridge.length){
    this.freeTiles=this.freeTiles.filter(t=>t.id!==137);this.castleFallingBosses=this.enemies.filter(e=>e.kind==='bowser'&&!e.dead);
    for(const e of this.castleFallingBosses){e.dead=1;e.vy=0;}
    this.castleStage='fall';if(this.castleFallingBosses.length)this.emit('sfx_bowser_falls');
   }
  }else if(this.castleStage==='fall'){
   if(this.castleFallingBosses.every(e=>e.y>=rules.bowserReleaseFeetY)){
    this.castleStage='walk';p.vx=rules.walkSpeed;p.vy=rules.releaseFallSpeed;p.grounded=false;p.facing=1; // native: the rescue walk runs at the full 1.5 px/frame from its first row, also while still falling
   }
  }else if(this.castleStage==='walk'){
   if(exit?.retainerX!==undefined&&p.x>=exit.retainerX-rules.brakeAtActorSeparation)this.castleBraking=true;
   if(this.castleBraking)p.vx=Math.max(0,p.vx-rules.walkDeceleration);
   else p.vx=p.grounded?rules.walkSpeed:Math.min(rules.walkSpeed,p.vx+PHYSICS.walkAccel);
   p.x+=p.vx;p.anim+=p.vx;p.grounded=false;this.movePlayerY(p.vy,this.height);
   if(!p.grounded)p.vy=Math.min(PHYSICS.maxFall,p.vy+PHYSICS.gravity);
   const observed=castleRules.geometry.find(g=>g.id===this.level.id&&g.actorX===exit?.retainerX),cameraEnd=observed?.cameraEnd??Math.max(this.camera,(exit?.retainerX??this.area.width)-rules.fallbackActorScreenX);
   this.castleScroll=Math.min(cameraEnd,this.castleScroll+rules.cameraSpeed);this.camera=Math.floor(this.castleScroll);
   if(this.castleScroll>=cameraEnd&&p.vx===0&&p.grounded){
    if(this.level.id==='8-4'){this.nextLevel();return;}
    // native: Mario stands 53-61 rows (mean 56) in front of the retainer before the message text (task 3) starts
    if(!this.castleArrivalFrame)this.castleArrivalFrame=this.phaseFrame;
    if(this.phaseFrame-this.castleArrivalFrame>=rules.arrivalHoldFrames){this.castleStage='message';this.castleArrivalFrame=this.phaseFrame;this.emit('event_castle_clear');}
   }
  }else if(this.castleEndDue(rules.messageHoldFrames)){
   this.nextLevel();return;
  }
  for(const e of this.castleFallingBosses){e.dead++;e.y+=e.vy;e.vy=Math.min(rules.bowserMaxFall,e.vy+rules.bowserGravity);}
  // A boss defeated before the axe retains its ordinary death trajectory.
  for(const e of this.enemies)if(e.kind==='bowser'&&e.dead&&!this.castleFallingBosses.includes(e)){
   e.dead++;e.y+=e.vy;e.vy+=0.25;
  }
 }
 private updatePlatforms(oldBottom:number){
  for(const platform of this.area.platforms??[]){
   const prior=this.platformMotion.collisionPosition(platform,this.platformFrame-1),now=this.platformMotion.collisionPosition(platform,this.platformFrame);
   const p=this.player;
   const riding=Math.abs(oldBottom-prior.y)<0.01&&p.y>=oldBottom;
   if(Math.abs(now.y-prior.y)<128&&p.vy>=0&&oldBottom<=prior.y+3&&(riding||p.y>=now.y)&&platformSupportsX(p.x,now.x,platform.width)){
    p.y=now.y;p.vy=0;p.grounded=true;this.bouncing=false;p.x+=now.x-prior.x;this.platformMotion.contact(platform,this.platformFrame);
   }
  }
 }
 // Native platforms have a solid underside: a rising Mario whose feet were 25..28 px below the platform top on the previous row stops as under a ceiling (next vy 1 plus the old fraction; 8 of 8 hits in
 // the route and model runs, 3-3 and 6-3, ids 36 and 40; 29 px never hits, 24 is unobserved inside the x window; only small Mario observed, big assumed 16 px taller). x window from the same rows: x-px in -13..width-7 (native hits reach width-5, no hit at width-4; the last 2 px are left out because the remake position can be 2 px off there and made false hits).
 private platformHeadBump(oldX:number,oldBottom:number){
  const p=this.player,reach=p.size?41:25;
  for(const platform of this.area.platforms??[]){
   const prior=this.platformMotion.collisionPosition(platform,this.platformFrame-1),below=oldBottom-prior.y-reach;
   if(below>=0&&below<4&&Math.floor(oldX)+14>Math.floor(prior.x)&&Math.floor(oldX)+6<Math.floor(prior.x)+platform.width){p.vy=p.vy-Math.floor(p.vy)+1;this.headBumped=true;if(oldX<prior.x&&p.vx>0){this.wallSpeed=p.vx;p.vx=0;}return;} // from under the left corner the speed byte is lost as at a wall (6-3 f51775, one sample)
  }
 }
 platformPosition(platform:NonNullable<Area['platforms']>[number],frame=this.platformFrame){
  return this.platformMotion.artworkPosition(platform,frame);
 }
 // Area D: a native walker reverses when a squashed Goomba corpse is 10 px ahead (11 px reach with the half-pixel step) and when a stationary shell is 12 px ahead (reach 13).
 private turnWalkersAtCorpses(){
  for(const corpse of this.enemies){
   if(!corpse.squashed||corpse.dead>=90)continue;
   for(const walker of this.enemies){
    if(!walker.active||walker.dead||walker.shell||walker.vy!==0||!['goomba','koopa','redKoopa'].includes(walker.kind))continue;
    const gap=walker.x-corpse.x;
    if(Math.abs(gap)<CORPSE_TURN_REACH&&Math.abs(walker.y-corpse.y)<8&&gap*walker.vx<0)walker.vx=-walker.vx;
   }
  }
 }
 // Area D: native Red Koopas (1-3, 4-3, 5-3, 7-3, both directions) turn when the point under the sprite centre (x+8) is no longer supported.
 private redKoopaLedgeAhead(e:Enemy){return !this.isSolid(e.x+8,e.y+3);}
 private bumpOnOverlap(first:Enemy,second:Enemy){
  const states=first.bumpTouch??(first.bumpTouch={}),key=`${second.originX}:${second.originY}`;
  const touching=Math.abs(first.x-second.x)<12&&Math.abs(first.y-second.y)<8,was=states[key];
  states[key]=touching;
  if(!touching||was!==false)return; // a pair first seen already overlapping (one of them just appeared) is not turned
  if(!first.shell)first.vx=-first.vx;if(!second.shell)second.vx=-second.vx;
 }
 // Green Paratroopa floor contact (GREEN_PARATROOPA_LANDING): too slow a fall does not register yet; a registered sink of 5 px or more
 // that has a solid floor beside it turns the Paratroopa around before it bounces.
 private greenParatroopaLands(e:Enemy,floorTop:number){
  const rule=GREEN_PARATROOPA_LANDING;
  if(e.vy+GREEN_PARATROOPA_PHYSICS.gravity<rule.landingSpeed)return false;
  if(e.y-floorTop>=rule.sinkTurnDepth&&this.isSolid(e.x+(e.vx>0?rule.sideProbe.right:rule.sideProbe.left),e.y-rule.sideProbe.heightAboveFeet))e.vx=-e.vx;
  return true;
 }
 // Native Bowser (src/bowser-motion.ts): the anchor steps every 4th frame, hops start on a timer, fire only while he faces left; he faces Mario on landing.
 private advanceBowser(e:Enemy){
  const m=e.bowser??=createBowserMotor(e.originX,this.level.id);
  advanceBowserX(m);e.x=bowserBodyX(m);e.vx=0;
  if(m.side>0&&!m.airborne)bowserFaceMario(m,this.player.x,this.level.id);
  if(m.side<0&&!m.airborne&&m.frames>=m.nextHop){e.vy=BOWSER_HOP.vy;m.airborne=true;}
  if(bowserFlameDue(m)){this.items.push({kind:'flame',x:e.x+BOWSER_FLAME_OFFSET_X,y:e.y-20,vx:-bowserFlameSpeed(this.level.id),vy:0,age:0,life:300});this.emit('sfx_bowser_flame');}
 }
 private bowserLanded(e:Enemy,p:Player){
  const m=e.bowser;if(!m?.airborne||e.vy!==0)return;
  m.airborne=false;bowserFaceMario(m,p.x,this.level.id);if(m.side<0)m.nextHop=m.frames+bowserHopPause(m,this.level.id);e.x=bowserBodyX(m);
 }
 // Native objects live in five slots (docs/NATIVE_ROLES.md, Object slots). A walker stays in its slot until x < camera - 73, a Piranha or Bro until x < camera - 17; the remake drops walkers at camera - 48.
 // A native platform is an object in a slot: one whose spawn camera is crossed while all five slots are busy is never made (5-3 r5 mood1: the id 40 at x 1504 never appears; native-platform-slot test). Off screen it waits for a free slot (route row 43276: made at x 1504 once the Paratroopa's slot frees); the remake keeps the old creation there. Only id 40 is gated: gating the 4-3 balance pair lost one the route keeps (balance/lift slot use unmeasured).
 private gateNativePlatforms(previousCamera:number){
  const context=this.platformMotion.context;
  for(const platform of this.area.platforms??[]){
   const o=nativePlatformObject(platform,context);
   if(o?.kind!=='horizontal')continue;
   const motion=this.platformMotion,crossed=previousCamera<o.spawnCamera&&this.camera>=o.spawnCamera;
   if(!crossed&&!motion.waiting.has(platform))continue;
   if(!this.nativeSlotsFull(platform)){if(motion.waiting.has(platform))motion.create(platform,this.platformFrame);continue;}
   if(o.x>=this.camera+256)motion.waiting.add(platform);else{motion.waiting.delete(platform);motion.lost.add(platform);} // like a lone list object: waits while off screen, else is never made
  }
 }
 private nativePlatformSlots(except?:object){
  const context=this.platformMotion.context;
  const generators=(this.area.generators??[]).filter(g=>g.heights&&this.camera>=g.fromCamera!&&this.camera<=g.toCamera!).length; // the Bullet Bill generator object keeps its own slot (native id 23 at 5-3 x 1312 through rows 560-760)
  return generators+(this.area.platforms??[]).filter(platform=>platform!==except&&nativePlatformHoldsSlot(this.platformMotion,platform,context,this.camera,this.platformFrame)).length;
 }
 private nativeSlotsFull(exceptPlatform?:object){
  let used=exceptPlatform?this.nativePlatformSlots(exceptPlatform):0; // enemy gating does not count platforms yet: counting them lost a 4-2 Piranha the route keeps (wrap-lift slot release unmeasured)
  for(const e of this.enemies)if((e.slotHeld&&!e.active||this.holdsNativeSlot(e)||exceptPlatform&&this.holdsPlatformCorpseSlot(e))&&!(exceptPlatform&&e.y>=256))used++; // for platforms: an object that fell below the screen has freed its slot (route row 43244: the falling id 1 at y 252 is gone)
  return used>=5;
 }
 // 5-3 native Goombas release their slot on the second 21-frame tick after a stomp; allocation sees the freed slot on the next row.
 // Native m7 stomps284/298 expire325; m4/m7 stomps548/536 expire577. Keep the existing visual lifetime and other enemy allocation unchanged.
 private rememberPlatformCorpseSlot(e:Enemy){
  if(this.level.id!=='5-3'||this.area.id!=='main')return;
  const period=LIFE_FLOW.clockPeriod,firstTick=1+LIFE_FLOW.clockTickPhase-LIFE_FLOW.controlPhase;
  const next=(firstTick-this.areaPlayFrame%period+period)%period||period;
  this.corpsePlatformSlotEnd.set(e,this.areaPlayFrame+next+period);
 }
 private holdsPlatformCorpseSlot(e:Enemy){const end=this.corpsePlatformSlotEnd.get(e);return end!==undefined&&this.areaPlayFrame<=end&&e.active&&e.x>=this.camera-73;}
 private holdsNativeSlot(e:Enemy){
  const reach=e.kind==='piranha'||e.kind==='hammerBro'?17:73;
  return e.active&&e.x>=this.camera-reach&&(e.squashed?e.dead<22:e.dead<100||e.x<this.camera-48&&e.x-(e.dead-100)/2>=this.camera-73); // a squashed Goomba frees its slot after 22-42 rows: the minimum, so a doubtful object still spawns; one the remake already dropped keeps walking left natively
 }
 private piranhaColumns?:PiranhaColumns;
 /** Native walker sub-pixel (evidence/slots-findings-20261111.md; 61 route spawns): a slot keeps the sub-pixel byte of its last occupant, which is that
  * occupant's byte after its last step (a walker steps on the row it is removed; a stomped or resting one does not move). A new walker starts with it:
  * a lone walker or group leader at spec x + byte/256, a group follower one 0.5 px step further (byte xor 128) when the camera scrolled that row (50 of 50; both groups made on a still camera keep the byte; 3-2's 18 followers keep it too, unexplained). Every area load (level, pipe, respawn) clears the bytes (route trace: all five zeroed on the load row of every level and pipe load). */
 private static readonly SUBPIXEL_WALKERS=['goomba','koopa','redKoopa','beetle','paratroopa'];
 private releaseNativeSlots(){
  this.slotScroll=this.camera!==this.slotCamera;this.slotCamera=this.camera;
  for(const e of this.enemies){
   if(e.enemySlot===undefined||e.slotFreed)continue;
   const walker=Simulation.SUBPIXEL_WALKERS.includes(e.kind),walking=walker&&!e.squashed&&!(e.dead&&e.dead<100)&&e.dead>=100;
   const x=walking?e.x+(e.dead-99)*(e.shell&&!e.movingShell?0:e.vx):e.x; // the remake drops a walker at camera - 48; natively it keeps walking until removed
   if(walking?Math.floor(x)-this.camera>=-74:this.holdsNativeSlot(e))continue; // native: removed on the row its stepped x - camera < -74 (40 of 50 route removals; the rest one row either way)
   e.slotFreed=true;
   if(!walker)continue; // a Piranha or other stationary object leaves the byte it inherited; a stomped walker leaves its own
   this.slotSub[e.enemySlot]=Math.round((x-Math.floor(x))*256)&255;
  }
 }
 private takeNativeSlot(e:Enemy){
  const used=new Set(this.enemies.flatMap(o=>o!==e&&o.enemySlot!==undefined&&!o.slotFreed&&o.active?[o.enemySlot]:[]));
  let slot=0;while(used.has(slot))slot++;
  if(slot>=5)return;
  e.enemySlot=slot;
  if(!Simulation.SUBPIXEL_WALKERS.includes(e.kind)||e.motion==='flying')return;
  const follower=this.slotScroll&&this.enemies.some(o=>o!==e&&o.kind===e.kind&&o.spawnCamera!==undefined&&o.spawnCamera===e.spawnCamera&&o.originX<e.originX);
  e.x+=((this.slotSub[slot]^(follower?128:0))&255)/256;
 }
 // A Piranha takes a slot when its pipe column is built (5-1 uses the measured task clock; other levels retain their qualified358px lead); a slot-gated list object when it triggers. Without a free slot a Piranha or group member is lost; a lone list object waits while still off screen.
 private nativeSlotDenied(e:Enemy){
  if(e.slotLost)return true;
  if(e.slotHeld||e.kind!=='piranha'&&!e.nativeSlot)return false;
  const due=e.kind==='piranha'?(this.piranhaColumns?e.x<=this.piranhaColumns.through:e.x<this.camera+358)&&e.x>=this.camera:(e.spawnCamera!==undefined?this.camera>=e.spawnCamera:e.x<this.camera+304)&&e.x>this.camera-32; // behind the activation edge (a checkpoint respawn starts past it) the object is never made: it must not hold a slot
  if(!due)return false;
  if(!this.nativeSlotsFull()){e.slotHeld=true;if(e.autoPhase)e.slotBorn=this.broClock;return false;}
  if(e.nativeSlot==='wait'&&e.x>=this.camera+256)return true;
  e.slotLost=true;return true;
 }
 // A Piranha is made at the rise start (phase 111, hidden) when its pipe column is built, 358 px ahead of the camera, and runs from then on; the remake activates it at 304, so the frames in between (they depend on how fast Mario scrolls) are added to its age. Native births: y rises within 1-2 rows (evidence/piranha-findings-20261111.md).
 private startBornPiranha(e:Enemy){if(Math.abs(this.player.x-e.x)>PIRANHA.proximity.maximumInhibitedIntegerSeparation){e.phase=PIRANHA.stages[2].fromPhaseInclusive;e.age=this.broClock-e.slotBorn!;}}
 private updateEnemies(oldBottom:number){
  this.broClock++;
  this.releaseNativeSlots();
  const p=this.player;
  if(p.vx)this.marioMotion=Math.sign(p.vx);
  this.stompedThisStep=false;
  for(const e of this.enemies){
   const priorY=e.y,priorX=e.x; // the native touch test reads the enemy before its own move
   if(!e.active&&this.nativeSlotDenied(e))continue;
   if(!e.active){if((e.spawnCamera!==undefined?this.camera>=e.spawnCamera:e.x<this.camera+304)&&e.x>this.camera-32&&(e.spawnFrame===undefined||this.areaFrame>=e.spawnFrame)){e.active=true;e.x+=this.spawnGroupShift(e);this.takeNativeSlot(e);}else continue;if(e.nativeBro)e.nativeLive=true;if((e.kind==='paratroopa'||e.kind==='beetle')&&!e.shell)e.vx=(p.x<e.x?-1:1)*Math.abs(e.vx||0.5);} // measured: native Paratroopas and Beetles (44/44 and 21/21) start walking toward Mario
   if(e.slotBorn!==undefined&&e.age===0)this.startBornPiranha(e);
   e.age++;
   if(e.dead){
    if(e.squashed){if(e.dead<90&&++e.dead>goombaSquashRules.durationActiveNativeFrames)e.dead=100;continue;}
    e.dead++;
    if(e.greenShellLaunchFrame!==undefined){
     if(this.frame>e.greenShellLaunchFrame){e.x+=shellLaunchRules.velocityX;e.y+=e.vy;e.vy=Math.min(shellLaunchRules.maxFall,e.vy+shellLaunchRules.gravity);}
     continue;
    }
    if(e.dead>20||e.vy!==0){e.y+=e.vy;e.vy+=0.25;}continue;
   }
   if(e.kind==='bullet'?this.nativeBulletGone(e):e.x<this.camera-(e.kind==='lakitu'||e.kind==='spiny'||e.kind==='blooper'||e.kind==='cheep'?73:48)||e.y>280&&e.kind!=='podoboo'){e.dead=100;continue;}
   const isWater=e.kind==='blooper'||e.kind==='cheep';
   if(e.motion==='flying'){
    if(e.nativeFlight){if(e.age>1){e.x+=e.vx;e.y+=e.vy;e.vy+=FLYING_FISH.launch.gravity;}} // the spawn step holds the launch position
    else{e.x+=e.vx;e.y+=e.vy;e.vy=Math.min(4,e.vy+0.125);}
   }else if(e.kind==='piranha'){
    const phase=(e.age+e.phase!)%PIRANHA.periodNativeFrames;
    if(phase===PIRANHA.stages[2].fromPhaseInclusive&&Math.abs(p.x-e.x)<=PIRANHA.proximity.maximumInhibitedIntegerSeparation){e.age--;e.y=e.originY;continue;}
    const stage=PIRANHA.stages.find(s=>phase>=s.fromPhaseInclusive&&phase<s.toPhaseExclusive)!;
    e.y=e.originY-PIRANHA.hiddenFootOffsetFromPipeTop+stage.footOffsetAtStart+(phase-stage.fromPhaseInclusive)*stage.velocity;
   }else if(e.kind==='podoboo'){
    if(e.launch)this.updateNativePodoboo(e);
    else{const next=e.originY-Math.max(0,Math.sin(e.age/50))*100;
    e.podobooFalling=next>e.y;e.y=next;}
   }
   else if(isWater){
    if(e.kind==='blooper'&&e.stroke){this.updateNativeBlooper(e);continue;}
    const speed=e.kind==='cheep'?SWIMMING_CHEEP_SPEEDS[e.palette??'']:undefined;
    e.x+=speed===undefined?e.vx*(e.kind==='blooper'?0.8:1.5):Math.sign(e.vx)*speed;e.y=e.swim?e.originY+swimBobOffset(e.swim.bob,e.age-1):e.originY+Math.sin(e.age/40)*24;
    if(e.kind==='blooper'&&e.age%120<40){e.x+=Math.sign(p.x-e.x)*0.5;e.y-=0.4;}
   }else if(e.kind==='bullet'){if(!e.nativeShot||e.age>1)e.x+=Math.sign(e.vx)*BULLETS.speed;} // a native shot holds its spawn row
   else if(e.kind==='lakitu'){
    this.updateNativeLakitu(e);
   }
   else if(e.nativeLive){
    this.updateNativeHammerBro(e);
   }
   else if(e.kind==='paratroopa'&&(e.paratroopaMotion??(e.palette==='0f-16-30-27'?'vertical':'bounce'))!=='bounce'){
    // Red flight is observed at a fixed world X. Bounds and phase are inferred
    // from partial trajectories rather than copied screenshot coordinates.
    const vertical=(e.paratroopaMotion??'vertical')==='vertical',offset=(1-Math.cos(e.age/(vertical?56:48)))*(e.range??48); // native id 15 (route 3-3 x 1824 rows 25995-26170): 98 px down in ~175 rows
    if(vertical){e.x=e.originX;e.y=e.originY+offset;}else{e.x=e.originX+offset*(e.direction??-1);e.y=e.originY;}
    e.vy=0;
   }
   else{
    if(e.kind==='hammerBro'){
     // Motors are fitted; local choice/timer and other-actor bounds are inferred.
     if(e.hammerRandom===undefined){
      e.vx=Math.sign(e.vx)*hammerBroRules.patrol.speed;
      e.hammerRandom=hammerRandom((Math.trunc(e.originX)*17^Math.trunc(e.originY)*31)>>>0);
      e.hammerJumpWait=hammerBroRules.choice.timerMinimum+e.hammerRandom%hammerBroRules.choice.timerVariants;
     }
     const wait=e.hammerJumpWait!;if(wait>0)e.hammerJumpWait=wait-1;
     const support=this.collisionAt(e.x+8,e.y+1);
     if(e.hammerJumpWait===0&&e.vy===0&&support){
      let lowerFloor=false;
      if(!this.collisionAt(e.x+8,support.y+support.height))for(let y=support.y+support.height+1;y<240;y++)if(this.collisionAt(e.x+8,y)){lowerFloor=true;break;}
      e.hammerRandom=hammerRandom(e.hammerRandom);
      const weak=lowerFloor&&(e.hammerRandom>>>8)%hammerBroRules.choice.weakChanceDivisor===0;
      e.hammerDropRow=weak?support.y:undefined;e.vy=-(weak?HAMMER_BRO.weakImpulse:HAMMER_BRO.strongImpulse);
      e.hammerRandom=hammerRandom(e.hammerRandom);
      e.hammerJumpWait=hammerBroRules.choice.timerMinimum+e.hammerRandom%hammerBroRules.choice.timerVariants;
     }
    }
    if(e.kind==='bowser'){
     this.advanceBowser(e);
     const facing=p.x<e.x?-1:1;
     const throwsHammers=e.bowserHammers??['6-4','7-4','8-4'].includes(this.level.id),burst=e.age%180;
     if(throwsHammers&&burst>=48&&burst<=108&&burst%12===0)this.items.push({kind:'hammer',x:e.x+8,y:e.y-32,vx:facing*1.5,vy:-4.5,age:0,life:150});
    }
    // Two tracked 8-3 hammers move one pixel per native frame; transfer to
    // other levels, launch timing and the vertical arc remain unqualified.
    if(e.kind==='hammerBro'&&e.age%35===0)this.items.push({kind:'hammer',x:e.x,y:e.y-24,vx:(p.x<e.x?-1:1)*(this.level.id==='8-3'?1:1.5),vy:-3.5,age:0,life:150});
    if(e.shell){
     e.shellAge=e.movingShell?0:(e.shellAge??0)+1;
     if(e.shellAge>=shellRules.wakeNativeFrames){e.shell=false;e.shellAge=0;e.shellChain=0;e.vx=(e.direction??-1)*0.5;}
    }
    if(e.kind==='redKoopa'&&!e.shell&&this.redKoopaLedgeAhead(e))e.vx=-e.vx;
    const dx=e.shell?(e.movingShell?Math.sign(e.vx)*shellRules.speedPixelsPerNativeFrame:0):e.vx;
    if(e.kind==='hammerBro'){
     const observed=hammerBroRules.patrol.observed.find(a=>a.level===this.level.id&&a.area===this.area.id&&a.originX===e.originX&&a.originY===e.originY);
     const minX=observed?.minX??e.originX-hammerBroRules.patrol.span/2,maxX=observed?.maxX??e.originX+hammerBroRules.patrol.span/2;
     e.x+=dx;if(e.x<minX){e.x=minX+(minX-e.x);e.vx=Math.abs(e.vx);}if(e.x>maxX){e.x=maxX-(e.x-maxX);e.vx=-Math.abs(e.vx);}
    }else{
     e.x+=dx;
     if(nativeWalkerWallTurn(e.kind)){if(this.isSolid(Math.floor(e.x)+(dx>0?16:0),e.y-wallHeight(e)))e.vx=-e.vx;} // lifecycle: native pen goomba (1-2 x 447..480): probe after the step at x / x+16, flip without undoing the step (65-frame legs)
     else if(this.isSolid(e.x+(dx>0?15:1)+wallReach(e,dx),e.y-wallHeight(e))){e.x-=dx;e.vx=-e.vx;}
    }
    const greenBounce=e.kind==='paratroopa'&&e.palette!=='0f-16-30-27';
    if(e.egg&&e.motion==='falling'){e.y+=e.vy;e.vy=Math.min(LAKITU.egg.maxFall,e.vy+LAKITU.egg.gravity);} // native egg arc: position first, then gravity
    else{e.vy=Math.min(greenBounce?GREEN_PARATROOPA_PHYSICS.maxFall:e.kind==='hammerBro'?HAMMER_BRO.maxFall:4,e.vy+(greenBounce?GREEN_PARATROOPA_PHYSICS.gravity:e.kind==='bowser'?BOWSER_HOP.gravity:e.kind==='hammerBro'?HAMMER_BRO.gravity:0.25));e.y+=e.vy;}
    const floor=this.collisionAt(e.x+8,e.y);
    if(e.vy>=0&&floor&&!(e.kind==='hammerBro'&&floor.y===e.hammerDropRow)&&(!greenBounce||this.greenParatroopaLands(e,floor.y))){e.y=floor.y;e.vy=greenBounce?GREEN_PARATROOPA_PHYSICS.bounce:e.kind==='paratroopa'?-3:0;if(e.motion==='falling'){e.motion=undefined;if(e.kind==='spiny')e.vx=p.x<e.x?-0.5:0.5;}}
    if(e.kind==='hammerBro'&&e.hammerDropRow!==undefined&&e.y>e.hammerDropRow+16)e.hammerDropRow=undefined;
    if(e.kind==='bowser')this.bowserLanded(e,p);
   }
   if(e.shell&&e.movingShell)for(const other of this.enemies)if(other!==e&&other.active&&!other.dead&&Math.abs(e.x-other.x)<14&&Math.abs(e.y-other.y)<20){
    const groundedGreenLaunch=e.kind==='koopa'&&e.vx>0&&(e.palette===undefined||e.palette==='0f-1a-30-27')&&other.kind==='goomba'&&(other.palette===undefined||other.palette==='0f-0f-36-17')&&other.vy===0&&this.isSolid(other.x+8,other.y+1);
    other.dead=1;other.vy=groundedGreenLaunch?shellLaunchRules.initialVelocityY:-3;
    if(groundedGreenLaunch)other.greenShellLaunchFrame=this.frame;
    // Six consecutive victims are observed. Later awards provisionally retain
    // the final measured value; an extra life has not been established.
    this.score+=shellRules.victimScores[Math.min(e.shellChain??0,shellRules.victimScores.length-1)];e.shellChain=(e.shellChain??0)+1;this.emit('sfx_kick');
   }
   if(p.dead)continue; // a pit fall keeps enemies moving, but a dead Mario touches nothing
   const eh=e.kind==='bowser'?32:e.kind==='hammerBro'||e.kind==='piranha'?24:e.kind==='goomba'?10:e.kind==='bullet'?BULLETS.hitHeight:['koopa','redKoopa','paratroopa','beetle','spiny'].includes(e.kind)?8:16;
   const ew=e.kind==='bowser'?32:16;
   if(e.unwingedAir){if(e.vy===0&&e.unwingedAir!==this.frame)delete e.unwingedAir;else continue;} // just unwinged: native state byte 1 until it lands (3-1 21012-21029, 8-2 70096-70104); Mario falls past it
   const stompWindow=this.nativeStompWindow(e,p,priorX,priorY);
   if(stompWindow===false||stompWindow===undefined&&!overlap(p.x+3,p.y-this.height+2,10,this.height-3,e.x+2,e.y-eh,ew-4,eh)){if(e.unwingedBounce)delete e.unwingedBounce;delete e.kickOverlap;if((p.vy<=0||e.kind==='spiny')&&!this.bouncing&&!e.shell&&(Math.abs(e.x-p.x)<11||this.koopaSideReach(e.kind,priorX))&&this.nativeTouch(e,priorY,false))this.hurt();continue;} // above the stomp box a rising or standing Mario is still hurt
   if(e.kickOverlap)continue;
   // The newly unwinged Koopa and Mario can still overlap while the stomp
   // bounce separates them. Keep other enemies and later contacts dangerous.
   if(e.unwingedBounce){if(p.vy<0&&oldBottom<=e.y+1)continue;delete e.unwingedBounce;}
   if(p.star){e.dead=1;e.vy=-4;this.score+=100;if(e.kind==='goomba')this.awardPopup(100,e.x,e.y-popupRules.enemyFeetYOffset,popupRules.koopaDurationActiveNativeFrames);this.emit('sfx_kick');continue;}
   const stompable=!['piranha','spiny','podoboo','bowser','blooper'].includes(e.kind);
   if(this.kickRestingShellFromAbove(e,oldBottom))continue;
   if(stompable&&(p.vy>0||this.stompedThisStep)&&(oldBottom<=e.y+1||stompWindow===true||this.risingParatroopaStomp(e,p))){
    p.vy=this.stompBounceVy(p.vy);this.bouncing=true;this.stompBounce();this.landJump='inactive';p.grounded=false;
    // First Paratroopa contacts award 400; subsequent ordinary +100 is observed.
    // Nonzero-chain Paratroopa scoring remains an unmeasured fallback.
    const award=e.kind==='hammerBro'?HAMMER_NATIVE.stompScore:e.kind==='paratroopa'&&this.stompChain===0?stompRules.firstParatroopa:this.stompAward();this.stompedThisStep=true;this.score+=award; // a stomped Hammer Bro: +1000 in all 3 native stomps (3-1, 5-2, 7-1), not a chain step (chain behaviour unmeasured)
    // A Paratroopa stomp shows a popup in the reference; its Koopa offset and lifetime are inferred.
    if(e.kind==='goomba'||e.kind==='koopa'||e.kind==='redKoopa'||e.kind==='paratroopa'||e.kind==='hammerBro')this.awardPopup(award,e.x,e.y-popupRules.enemyFeetYOffset,e.kind==='goomba'?goombaSquashRules.durationActiveNativeFrames:popupRules.koopaDurationActiveNativeFrames,e.kind==='goomba'?e:undefined);
    this.emit('sfx_stomp');
    if(['koopa','redKoopa','paratroopa','beetle'].includes(e.kind)){
     if(e.kind==='paratroopa'){e.kind=e.palette==='0f-16-30-27'?'redKoopa':'koopa';e.vx=(p.x<e.x?1:-1)*0.5;e.unwingedBounce=true;e.unwingedAir=this.frame;}
     else if(!e.shell){e.shell=true;e.movingShell=false;e.shellAge=0;e.shellChain=0;}
     else{e.movingShell=!e.movingShell;e.shellAge=0;e.shellChain=0;}
    }else{e.dead=1;e.vy=0;if(e.kind==='goomba'){e.squashed=true;this.rememberPlatformCorpseSlot(e);}}
   }else if(e.shell&&p.vy<0&&oldBottom<=e.y+1){continue;}else if(e.shell&&!e.movingShell){e.movingShell=true;e.shellAge=0;e.shellChain=0;e.vx=(p.x<e.x?1:-1)*shellRules.speedPixelsPerNativeFrame;const kick=this.shellKickAward();if(e.kind==='koopa')this.awardPopup(kick,e.x,e.y-popupRules.enemyFeetYOffset,popupRules.greenShellSideKickDurationActiveNativeFrames);e.x+=Math.sign(e.vx)*4;this.score+=kick;this.emit('sfx_kick');}
   else if(this.nativeTouch(e,priorY,true))this.hurt();
  }
  const walkers=this.enemies.filter(e=>e.active&&!e.dead&&(isGreenParatroopa(e)||['goomba','koopa','redKoopa','beetle','spiny'].includes(e.kind)&&e.vy===0)&&!e.movingShell);
  for(let a=0;a<walkers.length;a++)for(let b=a+1;b<walkers.length;b++){
   const first=walkers[a],second=walkers[b];
   if(bumpsOnOverlap(first,second)){this.bumpOnOverlap(first,second);continue;}
   if(Math.abs(first.x-second.x)>=(first.shell||second.shell?SHELL_TURN_REACH:16)||Math.abs(first.y-second.y)>=8||(first.x-second.x)*((first.shell?0:first.vx)-(second.shell?0:second.vx))>=0)continue;
   if(!first.shell)first.vx=-first.vx;if(!second.shell)second.vx=-second.vx;
  }
  this.turnWalkersAtCorpses();
 }
 // Koopa-shaped enemies touch 1 px wider than the overlap box: native integer |enemy x before its move - Mario x| <= 11 (evidence/contact3-findings-20261111.md)
 private koopaSideReach(kind:string,x:number){return nativeHurtReachX(kind)>10&&Math.abs(Math.floor(x)-Math.floor(this.player.x))<=nativeHurtReachX(kind);}
 // Piranha rectangles read Mario before a floor snap (controlled 5-1 landing: native y129 box bottom161, final y128). Other enemies retain their measured contact pose.
 private nativeTouch(e:{kind:string},y:number,unmeasured:boolean){const p=this.player,feet=e.kind==='piranha'&&p.size===0?this.piranhaTouchFeetY??p.y:p.y;return nativeHurtHeight(e.kind,Math.floor(y)-24-(Math.floor(feet)-32),p.size>0,unmeasured);}
 // Native stomp reaches down to 8 px below the feet of a (rising) Paratroopa for a falling Mario with speed byte >= 1 (3-1 row 21010: Mario feet 183, Paratroopa feet 175).
 private risingParatroopaStomp(e:any,p:any){return e.kind==='paratroopa'&&!e.shell&&p.vy>=1&&p.y-e.y<=8;}
 // Native stomp window for Goombas (areas `stomp`, `stomp2`, `stomp4`, `stompedge`; docs/NATIVE_ROLES.md): a falling Mario (speed byte >= 1) touches a Goomba only when the native frame counter
 // (broClock) is even (51 of 51 route stomps, 167 of 167 model stomps), and stomps it when his feet are at most 10 px above its feet (down to 8 px below them) with |dx| <= 10: Mario's integer x after
 // his own move against the Goomba's before its step (stompedge probe, ~4,200 branches on the 1-1 first Goomba; dx >= 11 never registers). Koopa/red Koopa: |dx| <= 11 (dx 12 never).
 // Deeper contact stays the ordinary box test (side hit, hurt). undefined: the rule does not apply.
 // Beetle takes the Koopa rule (stomp7: 19 native Beetle bounces, |dx| <= 11, feet 4..15 px above). Paratroopa stays on the box: its 144 native bounces fit the Koopa rule too, but the remake's hop height/phase is off (8-2 row 70276: 7 px high) and the rule costs 8-2 in the gate and free play.
 // Paratroopa (stomp8): Koopa rule on its pre-step y (it moves 2-3 px per row), once the 8-2 x1520 spawn camera fixed the hop phase.
 private nativeStompWindow(e:any,p:any,priorX:number,priorY:number):boolean|undefined{
  const koopaKind=['koopa','redKoopa','beetle','paratroopa'].includes(e.kind);
  if(!koopaKind&&e.kind!=='goomba'||e.shell||p.vy<1)return undefined;
  if(this.broClock%2!==0)return false;
  const gap=(e.kind==='paratroopa'?priorY:e.y)-p.y;if(gap<-8)return undefined;
  if(Math.abs(Math.floor(priorX)-Math.floor(p.x))>(koopaKind?11:10))return false;
  return gap<=(koopaKind?15:10);
 }
 private updateItems(){
  const p=this.player;
  for(const i of this.items){
   i.age++;i.life--;if(i.emerging&&i.emerging>0){i.y-=POWERUPS.powerupEmergenceNativeFrames.pixelsPerNativeFrame;i.emerging--;continue;}
   if(i.hold!==undefined){this.holdNativeHammer(i);continue;}
   i.x+=i.vx;
   if(i.kind==='coin'||i.kind==='debris'||i.kind==='hammer'){i.vy+=i.kind==='coin'?0.3125:i.gravity??0.2;i.y+=i.vy;}
   else if(i.kind==='flame'){}
   else{
    const size=i.kind==='fireball'?8:16;
    if(i.kind==='fireball'){this.moveFireball(i);continue;}
    if(i.kind==='star'){i.y+=i.vy;i.vy=Math.min(POWERUPS.starArc.cap,i.vy+POWERUPS.starArc.gravity);}else{i.vy=i.kind==='mushroom'||i.kind==='1up'?Math.min(POWERUPS.itemFall.cap,i.vy+POWERUPS.itemFall.gravity):Math.min(4,i.vy+0.25);i.y+=i.vy;}
    const floor=this.collisionAt(i.x+size/2,i.y+size);
    if(i.vy>=0&&floor){i.y=floor.y-size;i.vy=i.kind==='star'?-3:0;}
    if(this.isSolid(i.x+(i.vx>0?size-1:0),i.y+size/2))i.vx=-i.vx;
   }
   if(i.kind==='hammer'||i.kind==='flame'){
    // Supplied descriptors give a 24x8 flame and alternating 8x16/16x8
    // hammer assemblies inside the rotating 16px cell.
    const horizontal=i.kind==='hammer'&&Math.floor(i.age/4)%2===1;
    const x=i.x+(i.kind==='hammer'&&!horizontal?4:0),y=i.y+(horizontal?4:0);
    if(overlap(p.x+3,p.y-this.height+2,10,this.height-4,x,y,i.kind==='flame'?24:horizontal?16:8,i.kind==='flame'||horizontal?8:16))this.hurt();
   }else if(!p.dead&&['mushroom','flower','star','1up'].includes(i.kind)&&overlap(p.x+2,p.y-this.height,12-6,this.height,i.x,i.y,16,16)){
    this.collectItem(i);
   }
  }
  this.items=this.items.filter(i=>i.life>0&&i.y<288&&i.x>=this.camera-32);
 }
 // Native fireball (rows evidence/local/power/f1.jsonl; RAM 0x24+s state, 0x8d+s x, 0xd5+s y, 0xa6+s speed): position then speed, 4 px/row at launch, gravity 80/256, cap 812/256, bounce at speed -3 with the ball on the floor; gone past the screen edges.
 private moveFireball(i:Item){
  const arc=POWERUPS.fireballArc;i.y+=i.vy;
  const floor=i.vy>0?this.collisionAt(i.x+4,i.y+8):undefined;
  if(floor){i.y=floor.y-8;i.vy=arc.bounceSpeed;}else i.vy=Math.min(POWERUPS.fireballTerminalFallPixelsPerNativeFrame.value,i.vy+arc.gravity);
  if(this.isSolid(i.x+(i.vx>0?7:0),i.y+4)||i.x<this.camera||i.x-this.camera>=arc.rightEdge)i.life=0;
  this.fireballHits(i);
 }
 private fireballHits(i:Item){
    for(const e of this.enemies)if(e.active&&!e.dead&&e.kind!=='beetle'&&overlap(i.x,i.y,8,8,e.x,e.y-24,e.kind==='bowser'?32:16,24)){
     i.life=0;if(e.kind==='bowser'&&--e.hp>0)break;e.dead=1;e.vy=-3;const award=e.kind==='bowser'?5000:e.kind==='koopa'?200:100;this.score+=award;if(e.kind==='goomba'||e.kind==='koopa')this.awardPopup(award,e.x,e.y-popupRules.enemyFeetYOffset,popupRules.koopaDurationActiveNativeFrames);this.emit('sfx_kick');break;
    }
 }
 private collectItem(i:Item){
  const p=this.player;
    i.life=0;
    if(i.kind==='1up'){this.lives++;this.awardPopup('1up',i.x,i.y-popupRules.itemTopYOffset,popupRules.itemDurationActiveNativeFrames);this.emit('sfx_1up');}
    else if(i.kind==='star'){p.star=POWERUPS.starNativeFrames.value;this.score+=POWERUPS.starCollectionScore.value;this.awardPopup(POWERUPS.starCollectionScore.value,i.x,i.y-popupRules.itemTopYOffset,popupRules.itemDurationActiveNativeFrames);this.emit(this.time<=100?'music_star_hurry':'music_star');}
    else{const size=i.kind==='flower'?2:Math.max(1,p.size) as 1|2;if(size!==p.size)this.powerChange={from:p.size,to:size,remaining:i.kind==='flower'?POWERUPS.transformFreezeNativeFrames.fireValue:POWERUPS.transformFreezeNativeFrames.mushroomGrowthValue,kind:i.kind==='flower'?'fire':'grow'};this.score+=1000;this.awardPopup(1000,i.x,i.y-popupRules.itemTopYOffset,popupRules.itemDurationActiveNativeFrames);this.emit('sfx_powerup');}
 }
 hurt(){const p=this.player;if(p.invincible||p.star||this.powerChange||this.phase!=='play')return;this.stompChain=0;if(p.size){this.powerChange={from:p.size,to:0,remaining:POWERUPS.transformFreezeNativeFrames.shrinkValue,kind:'shrink'};p.invincible=POWERUPS.postShrinkInvulnerabilityNativeFrames.value;this.emit('sfx_pipe');}else this.die();}
 die(offscreenLava=false,offscreenPit=false){if(this.phase!=='play')return;this.offscreenLavaDeath=offscreenLava;this.offscreenPitDeath=offscreenPit;this.offscreenDeathRows=this.offscreenFallRows();this.stompChain=0;this.deathFromBelow=this.player.y>LIFE_FLOW.pitStartFeetY;this.firebarDeathFrame=this.areaFrame;this.phase='dying';this.phaseFrame=0;this.player.dead=true;this.player.vx=0;/* the launch replaces the speed byte only: a mid-air fraction stays (native rows reach -3 up to 6 rows sooner) */this.player.vy=deathRules.launchVelocity+(this.player.grounded?0:this.player.vy-Math.floor(this.player.vy));this.emit('event_death');}
 // Native death/lives-screen flow (evidence/lifeflow-findings-20261111.md): the 21-row interval clock is frozen on n+2 rows per death (the second death row to the row after the engine change, and the first lives-screen row); the screen timer is set 6 rows into the screen, counts clock ticks and ends 19 rows after its last tick.
 /* Native pit/lava falls keep the whole level running (engine stays 8 until the fall ends): 118 of 119 non-inert slots moved during 260-row falls; arc deaths freeze them after the first row. */
 private updateWorldInPitFall(){if(!this.offscreenPitDeath&&!this.offscreenLavaDeath)return;this.platformFrame++;this.updateGenerators();this.updateEnemies(this.player.y);this.updateItems();}
 private lifeClockFreeze(){const pit=this.offscreenLavaDeath||this.offscreenPitDeath;if(this.phase==='dying'&&!pit&&this.phaseFrame>=2||this.phase==='intro'&&this.lifeIntro?.fromDeath&&(this.phaseFrame===4||!pit&&this.phaseFrame<=2))this.lifeFrozen++;}
 // Native row after any full screen: the clock is 19 rows past its last tick, whatever the previous level did (reg 0x77f == 1 on 8 of 8 control rows read).
 private lifeClockAtControl(){this.lifeFrozen=this.lifeRow-1-LIFE_FLOW.controlPhase;}
 // Native pit deaths keep falling, unseen and with no launch, down to page 6: 245-249 / 259-260 rows after passing native y 240, set by the last jump's fall force (run .5625 -> 4.0 px/row, walk .4375 -> 4.22, medium .375 -> 4.19; 94 samples). Water sinks at its own speed.
 private offscreenFallRows(){let y=this.player.y,v=this.player.vy,n=0;if(this.area.theme==='water')return Math.ceil((LIFE_FLOW.pitEndFeetY-y)/Math.max(1,v))-1;for(;y<LIFE_FLOW.pitEndFeetY;n++){y+=v;v+=this.lastJumpFallForce;if(v>=4.5)v=4;}return n-1;}
 private lifeIntroDone(){
  const li=this.lifeIntro!,p=this.phaseFrame;
  if(!li.end&&p>li.set&&((this.lifeRow-1-this.lifeFrozen)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod===LIFE_FLOW.clockTickPhase&&++li.seen>=li.ticks)li.end=p+LIFE_FLOW.screenTail;
  return li.end>0&&p>=li.end;
 }
 // Game over: 20 clock ticks after row 9 of the screen, title 2 rows after the last (7 of 7 native game overs; the game-over death's own freeze is not counted).
 private gameoverEndFrame(){
  let ticks=0;
  for(let p=LIFE_FLOW.gameoverSet+1;;p++)if(((this.lifeRow+p-1-this.lifeFrozen)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod===LIFE_FLOW.clockTickPhase&&++ticks>=LIFE_FLOW.gameoverTicks)return p+LIFE_FLOW.gameoverTail;
 }
 private startPlayAfterIntro(){this.broClock=this.phaseFrame-(this.lifeIntro!.fromDeath?3:2)-2;/* native load row: 2 rows into a title intro, 3 into a death's; its frame counter runs through the lives screen, so the screen length decides the parity. A remake step shows the native row two earlier (input queue) */this.lifeIntro=undefined;this.phase='play';this.freshA=true;this.controlGrace=CONTROL_GRACE_ROWS;this.phaseFrame=0;this.introFromGameover=false;this.emit(this.areaMusic());}
 private respawn(){
  this.vineProgress.clear();this.climbingVine=undefined;
  this.lives--;this.slots[this.currentPlayer]={level:this.levelIndex,lives:this.lives,score:this.score,coins:this.coins,size:0,checkpoint:this.checkpoint,checkpointArea:this.activatedCheckpointArea};
  if(this.lives<=0){this.lifeFrozen-=Math.max(0,this.phaseFrame-1);this.gameoverEnd=this.gameoverEndFrame();this.phase='gameover';this.phaseFrame=0;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.emit('event_game_over');return;}
  if(this.twoPlayer&&this.slots[1-this.currentPlayer].lives>0){
   this.currentPlayer=1-this.currentPlayer;const s=this.slots[this.currentPlayer];this.levelIndex=s.level;this.lives=s.lives;this.score=s.score;this.coins=s.coins;this.checkpoint=s.checkpoint;this.activatedCheckpointArea=s.checkpointArea;
  }
  const target=this.level.areas.find(a=>a.id===(this.checkpoint?(this.activatedCheckpointArea??this.level.main):(this.level.respawnArea??this.level.main)))!,checkpoint=this.checkpoint?target.checkpoint:undefined;
  this.player.size=0;this.loadArea(target.id,checkpoint?.spawn,checkpoint?.camera);this.phase='intro';this.phaseFrame=0;this.introLength=TRANSITIONS.introFrames;this.lifeIntro=newLifeIntro(this.timeUpDeath,true);this.timeUpDeath=false;
 }
 private finishGameover(){
  if(!this.twoPlayer||this.slots[1-this.currentPlayer].lives<=0){this.restartToTitle();return;}
  this.currentPlayer=1-this.currentPlayer;const s=this.slots[this.currentPlayer];this.levelIndex=s.level;this.lives=s.lives;this.score=s.score;this.coins=s.coins;this.checkpoint=s.checkpoint;this.activatedCheckpointArea=s.checkpointArea;
  const target=this.level.areas.find(a=>a.id===(this.checkpoint?(this.activatedCheckpointArea??this.level.main):(this.level.respawnArea??this.level.main)))!,checkpoint=this.checkpoint?target.checkpoint:undefined;
  this.player.size=0;this.loadArea(target.id,checkpoint?.spawn,checkpoint?.camera);this.phase='intro';this.phaseFrame=0;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.introFromGameover=true;this.introLength=TRANSITIONS.introFrames;
 }
 private nextLevel(){
  if(this.levelIndex+1>=this.levels.length){
   if(this.level.id==='8-4'){this.phase='ending';this.phaseFrame=0;this.emit('event_victory');}
   else {this.phase='castle';this.phaseFrame=180;}
   return;
  }
  this.levelIndex++;this.checkpoint=false;this.activatedCheckpointArea=undefined;this.loadArea(this.level.main);this.phase='intro';this.phaseFrame=0;this.introLength=TRANSITIONS.levelIntroFrames;
 }
}
