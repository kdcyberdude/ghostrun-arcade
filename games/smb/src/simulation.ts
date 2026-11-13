import {nativeTransformRows,nativeTransformStep} from './native-player-task.js';
import {nativePowerupEmergence,nativePowerupContact} from './native-powerup.js';
import {nativeAreaBindings,nativePhysicalAreas} from './native-area-catalog.js';
import {initializeNativeGameTimer,runNativeGameTimer,tickNativeGameTimer} from './native-game-timer.js';
import {nativeVerticalPipe,nativeSidePipe,nativeSidePipeTimer,nativeSavedScroll} from './native-pipe.js';
import {NativeCastlePictures} from './native-castle-picture.js';
import graphics from '../assets/graphics/graphics-manifest.json';
import {nativeScreenPicture,nativeScreenBackdrop} from './native-screen-picture.js';
import {NativePalette} from './native-palette.js';
import {nativeIntervalStep,nativeStarMusic,nativeStarPalette,NATIVE_STAR_PICKUP} from './native-interval.js';
import {nativeSpring,advanceNativeSpring,type NativeSpring} from './native-spring.js';
import {nativeFrenzyControllers,retainNativeFrenzyController,nativeWarpZoneRelease,seedNativePageControllers,type NativeFrenzyController} from './native-frenzy-controllers.js';
import {landNativeWalker} from './native-walker-motion.js';
import {NativeWaterStream} from './native-water-stream.js';
import nativeWaterStreams from '../data/native-water-streams.json';
import {nativeFlameHit} from './native-flame-contact.js';
import type {Area,Button,CannonSpec,Enemy,EnemySpec,FirebarSpec,GeneratorSpec,Item,Level,MazeSpec,NativeHammerBro,Phase,Player,PlatformSpec,ScorePopup,SpringSpec,TilePiece,Vine} from './types.js';
import {PlatformMotion,platformSupportsX,nativePlatformObject,nativePlatformHoldsSlot,platformMotionModel,nativeSmallPlatform,nativePlatformSpawnCamera} from './platform-motion.js';
import {nativePlatformLanding,nativePlatformHeadBump,nativeBackgroundSkipped,nativePlatformSide} from './native-platform-contact.js';
import {motionOf} from './native-motor.js';
import type {Direction} from './native-motor.js';
import {PlayerMotor} from './native-player-motor.js';
import {PlayerAnim} from './player-anim.js';
import {nativeFlagStep,nativeFlagNumberStep} from './native-flagpole.js';
import {captureEnemyPicture,enemyPicture,enemyPictureTimersStopped} from './enemy-picture.js';
import {advanceFirebarMotor,createFirebarMotor,firebarFlameCenters} from './firebar-motion.js';
import {FirebarSlots} from './firebar-slots.js';
import {nativeBowserState,stepNativeBowser,nativeBowserHit} from './native-bowser.js';
import {nativeFirebarHit} from './firebar-contact.js';
import {PiranhaColumns} from './piranha-columns.js';
import {NativeParserClock} from './native-parser-clock.js';
import {advanceNativeHorizontalFlight} from './horizontal-paratroopa.js';
import {advanceBowserX,bowserBodyX,bowserFaceMario,bowserFlameDue,bowserFlameSpeed,bowserHopPause,createBowserMotor,nativeBowserSpawnX,BOWSER_FLAME_OFFSET_X,BOWSER_HOP} from './bowser-motion.js';
import type {FirebarGeometry,FirebarMotor} from './firebar-motion.js';
import {advanceWater,WATER_FORCES} from './water-physics.js';
import {NativeWater,whirlpoolAt,whirlpoolPull,STROKE_TIMER,NO_INPUT_Y,SWIM_DEATH_Y,SWIM_WALL_DEPTH,SURFACE_Y} from './native-water.js';
import type {WhirlpoolZone} from './native-water.js';
import whirlpoolData from '../data/water-whirlpools.json';
import transitionMeasurements from '../data/transition-measurements.json';
import powerupRules from '../data/powerup-rules.json';
import enemyRules from '../data/enemy-rules.json';
import swimmingCheepRules from '../data/cheep-swimming-rules.json';
import flyingFishData from '../data/native-flying-fish.json';
import {moveSwimmingCheep} from './swimming-cheep.js';
import {nativeWaterEnemyHit} from './native-water-contact.js';
import {NativeBubbles} from './native-bubbles.js';
import {NativeRandom,AREA_LOAD_FRAME_COUNTER} from './native-random';
import {lakituStep,lakituReappear,stopFrenzyParsed,SPINY_EGG} from './lakitu';
import {flyingCheepLaunch,moveFlyingCheep} from './flying-cheep.js';
import {newNativeBlooper,stepNativeBlooper} from './blooper-motion.js';
import {nativeAutoWalkAreaLoad} from './area-load-clock.js';
import {hammerBroStep} from './hammer-bro';
import {nativeLakituBox,nativeLakituContact} from './lakitu-contact';
import {NativeSpecialSlot,type AreaControl} from './native-special-slot';
import nativeAreaControls from '../data/native-area-controls.json';
import {nativeCoinSlot,nativeMiscGravity,nativeMiscOffscreen,nativeHammerBox,nativePlayerBox,nativeHammerContact,nativeAboveCoinStart,nativeCoinBlockStartY,type NativeBox} from './native-misc';
import waterActorData from '../data/native-water-actors.json';
import bulletData from '../data/native-bullets.json';
import deathRules from '../data/death-rules.json';
import shellRules from '../data/shell-rules.json';
import shellLaunchRules from '../data/shell-goomba-launch-rules.json';
import stompRules from '../data/stomp-rules.json';
import {COIN_TILE,flagPoleTouched} from './award-rules.js';
import {nativeHurtHeight,nativeHurtReachX} from './native-hurtbox.js';
import goombaSquashRules from '../data/goomba-squash-rules.json';
import popupRules from '../data/popup-rules.json';
import hammerBroData from '../data/native-hammer-bros.json';
import flagRules from '../data/flag-completion-rules.json';
import {stepNativeVictory,nativeVictoryText,type NativeVictory} from './native-victory.js';
import {nativeLevelLoad,stepNativeLevelLoad,type NativeLevelLoad} from './native-level-load.js';
import {NativeAreaControls} from './native-area-controls.js';
import multiCoinRules from '../data/multi-coin-rules.json';
import {nativeEnemiesCollision,nativeUnwingedStomp} from './enemy-collision.js';
import {advanceNativeRedFlight,createNativeRedFlight} from './red-paratroopa.js';
import {advanceNativeGreenParatroopa} from './native-paratroopa.js';
const CONTROL_GRACE_ROWS=2; // native: an A held through the load jumps on the same row as an A first pressed on the first control row; the remake's 2-frame input queue makes that two grace rows (campaign-compare MODEL_LOCAL seeds its own constant); an empty queue (native RAM-trace replays: each pad on its native row) needs none
export const TRANSITIONS=transitionMeasurements.runtimeCandidates;
export const POWERUPS=powerupRules.timingAndScores;
export const FLAG_COMPLETION=flagRules.runtimeCandidates;
// 6-4 native: the rescue walk starts 14 rows later (146 vs 132) and ends 16 rows later, and the load is one clock step later: native 716 rows control end -> load vs about 690; cause not found, scoped constant.
export const CASTLE_COMPLETION={secondMessageFrames:128}; // PrimaryMsgCounter2: 2*256/4 message updates
const PIRANHA=enemyRules.piranha;
const NATIVE_FALLERS=['goomba','koopa','redKoopa','beetle','spiny'];
const SWIMMING_CHEEP_SPEEDS:Record<string,number>=swimmingCheepRules.horizontalSpeedByPalette;
// Native leaping Cheep Cheep (object id 20): one 187-frame parabola; launch times, start offset and speed come from the native random register and Mario's speed (docs/NATIVE_ROLES.md).
const FLYING_FISH=flyingFishData.rules;
const WATER_RULES=waterActorData.rules;
const SWIM_GEN=waterActorData.rules.swimCheepGenerator;
// Native BulletBillCheepCheep: random byte s >= $aa selects SwimCC_IDData[1],
// and WorldNumber != World2 inverts that index. BitMFilter cycles eight heights.
export function nativeSwimCheepPick(byte:number,bag:number,level:string){
 const index=(Number(byte>=SWIM_GEN.idThreshold)+Number(Number(level.split('-')[0])!==2))&1;
 return {id:[10,11][index],...nativeFrenzyHeight(byte,bag)};
}
// BulletBillCheepCheep height (shared by the swimming Cheeps and the 5-3/6-3 Bullet Bills): q = random byte s & 7, moved up past the bits of BitMFilter ($06DD, all 8 set ->
// emptied first), y = Enemy17YPosData[q] (+ 8 = native y). 18 of 18 frenzy Bullet Bills of the 5-3/6-3 traces.
export function nativeFrenzyHeight(byte:number,bag:number){
 if(bag===255)bag=0;
 let q=byte&7;while(bag>>q&1)q=(q+1)&7;
 return {y:SWIM_GEN.heights[q],bag:bag|1<<q};
}
const BULLETS=bulletData.rules; // native Bullet Bill cannons and 5-3/6-3 generator (data/native-bullets.json, docs/NATIVE_ROLES.md, Bullet Bill section)
const HAMMER_NATIVE=hammerBroData.rules; // native Hammer Bro roster, clock patrol, hammers and jumps (data/native-hammer-bros.json, docs/NATIVE_ROLES.md, Hammer Bro section)
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
// Native ImposeGravity on an object: y (with the page above 256) += speed byte + carry of fraction += move force; then the 8.8 speed grows by `down`/256, and a speed of
// `max` or more with a move force of 128 or more becomes exactly `max` (SMB disassembly ImposeGravity; checked on every row of the 5-4/6-4/8-2 traces).
export type NativeMoveState={y:number;speed:number;force:number;fraction:number;timer:number};
export const nativeMoveState=(y:number,timer=0):NativeMoveState=>({y,speed:0,force:0,fraction:0,timer});
export function nativeImposeGravity(n:NativeMoveState,down:number,max:number){
 const f=n.fraction+n.force;n.fraction=f&255;n.y+=n.speed+(f>>8);
 const v=n.force+down;n.force=v&255;n.speed+=v>>8;
 if(n.speed>=max&&n.force>=128){n.speed=max;n.force=0;}
}
/** Native MovePiranhaPlant on one frame (state bytes: y $CF, speed $58, move flag $A0, up y $0417, down y $0434, EnemyFrameTimer $078A; frameCounter = FrameCounter $09). */
export type NativePiranha={y:number;speed:number;flag:number;up:number;down:number;timer:number};
export function nativePiranhaStep(n:NativePiranha,plantX:number,marioX:number,frameCounter:number,tickTimer=true){
 if(tickTimer&&n.timer>0)n.timer--;
 if(n.timer!==0)return;
 if(!n.flag){
  if(n.speed>0){const d=plantX-marioX,lo=d<0?(256-(d&255))&255:d&255;if(lo<0x21)return;} // PlayerEnemyDiff low byte (negated when Mario is right of the plant)
  n.speed=-n.speed;n.flag=1;
 }
 if(frameCounter%2!==1)return;
 n.y+=n.speed;if(n.y===(n.speed>0?n.down:n.up)){n.flag=0;n.timer=0x40;}
}
export const NATIVE_HZ=60.0988;
const STOMP_SPEED_THREE=['hammerBro','lakitu','blooper','cheep','bullet'];
// Native rows (RAM 0x500 collision map, 0x416 y sub-pixel, 0x70a fall class): feet this deep in a cell do not land; a fall before any jump of the area uses 40/256.
const FOOT_LAND_DEPTH=5,FALL_GRAVITY_AFTER_LOAD=0.15625;
export const PHYSICS={walkMax:1.5,runMax:2.5,walkAccel:0.037353515625,runAccel:0.0557861328125,brake:0.037109375,reverse:0.109375,jump:-4,runJump:-5,heldGravity:0.125,gravity:0.4375,maxFall:4.125};
// Small-player fit; three 3px discrepancies still exceed the unchanged 2px limit.
export const WATER_PHYSICS={groundMax:1,swimMax:1.5,accel:0.0390625,reverse:0.1044921875,brake:0.03759765625,entryGravity:0.1015625,...WATER_FORCES};
// Image samples support growth≈0.5 and up≈0.875px/native frame. Downward speed
// is inferred from a cap-limited sample; automatic-entry timing remains unmeasured.
export const VINE_PHYSICS={growth:0.5,climbUp:0.875,climbDown:1.5};
// See data/paratroopa-physics-candidate.json for independent trajectory checks.
export const GREEN_PARATROOPA_PHYSICS={gravity:7/64,bounce:-3,maxFall:3}; // native: MoveJ_EnemyVertically 28/256 per frame, cap 3; EnemyJump speed -3
// Native-measured Paratroopa/Beetle rules, see evidence/paratroopa-beetle-findings-20261109.md. Contact with the floor only registers once the
// downward speed has reached 1 px per native frame (a Paratroopa that starts at rest on the floor sinks about 5 px and hops at age 11), and a
// side collision is tested after any floor snap, at x (left) and x+16 (right), native sprite-top+20 (4 px above the feet). Other walkers retain their qualified probes.
export const GREEN_PARATROOPA_LANDING={landingSpeed:1,sideProbe:{right:16,left:0,heightAboveFeet:4}};
// A jumping Paratroopa is made at rest (speed and move force 0; 8-1 row 1267, 8-2 row 83, fraction byte 0 on both): the route's first-sample spawnVy / spawnYFraction are not used.
const greenBounceSpec=(e:EnemySpec)=>e.kind==='paratroopa'&&e.palette!=='0f-16-30-27'&&(e.paratroopaMotion??'bounce')==='bounce';
const greenSpawnVy=(e:EnemySpec)=>greenBounceSpec(e)?-GREEN_PARATROOPA_PHYSICS.gravity:0;
const REACH_MEASURED=['koopa','redKoopa','beetle','paratroopa','goomba','spiny','piranha','podoboo','hammerBro','lakitu']; // kinds whose horizontal touch reach is measured (src/native-hurtbox.ts; Lakitu: the one native Lakitu touch, 8-2 row 225 |dx| 9, row 224 |dx| 10 none)
const isGreenParatroopa=(e:EnemySpec)=>e.kind==='paratroopa'&&e.palette!=='0f-16-30-27';
const wallReach=(e:{kind:string},dx:number)=>e.kind==='paratroopa'||e.kind==='beetle'?(dx>0?GREEN_PARATROOPA_LANDING.sideProbe.right-15:GREEN_PARATROOPA_LANDING.sideProbe.left-1):0;
const nativeWalkerWallTurn=(kind:string)=>kind==='goomba'||kind==='koopa'||kind==='redKoopa'||kind==='spiny';
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
const LIFE_FLOW={clockPeriod:21,clockTickPhase:7,screenTail:19,screenBlackTail:3,ticksScreen:7,ticksTimeUp:14,controlPhase:5,pitEndFeetY:1312,setTitle:8,setDeath:9,deathArcEndFeetY:800,gameoverSet:9,gameoverTicks:20,gameoverTail:2};
interface LifeIntro{set:number;ticks:number;seen:number;end:number;fromDeath:boolean;timeUp:boolean}
const newLifeIntro=(timeUp:boolean,fromDeath:boolean):LifeIntro=>({set:(fromDeath?LIFE_FLOW.setDeath:LIFE_FLOW.setTitle)-(timeUp?1:0),ticks:timeUp?LIFE_FLOW.ticksTimeUp:LIFE_FLOW.ticksScreen,seen:0,end:0,fromDeath,timeUp});
interface Slot {level:number;lives:number;score:number;coins:number;size:0|1|2;checkpoint:boolean;checkpointArea?:string}
interface MazeState {spec:MazeSpec;sourceFrom:number;sourceTo:number;gate:number;completed:boolean}
/** Native loop commands (LoopCmdWorldNumber/LoopCmdPageNumber/LoopCmdYPosition, ProcLoopCommand): per world, the page whose column 0 carries a loop object and the
 * Player_Y_Position ($CE) Mario must stand on (Player_State 0) when the area parser reaches it. World 7 checks its pages in groups of three and loops back only
 * after the third when not all three were right; the other worlds loop back at once. A loop back (ExecGameLoopback) moves Mario and the screen back four pages
 * and KillAllEnemies restarts the enemy data. 4-4/7-4/8-4 v2: pages reached on 871/522/673, loop back on the next row (x 2057->1033, 1284->260, 1278->254). */
const CASTLE_LOOPS:Record<number,{page:number;y:number}[]>={4:[{page:5,y:0x40},{page:9,y:0xb0}],
 7:[{page:4,y:0xb0},{page:5,y:0x80},{page:6,y:0x40},{page:8,y:0x40},{page:9,y:0x80},{page:10,y:0x40}],8:[{page:6,y:0xf0},{page:11,y:0xf0},{page:16,y:0xf0}]};
/** The area parser (AreaParserTaskNum $071F = 7 on a 32 px scroll crossing, counting down a task per row) draws the two columns 384 px right of the crossed
 * boundary; the second of them is reached on the 7th row after the crossing and ProcLoopCommand sees it one row later. */
const LOOP_PARSER_AHEAD=384,LOOP_CHECK_ROWS=8,LOOP_BACK=1024;
// Native 4-2 area-3 (r6 mood2 rows 709-712): Down held while still falling (y 127, vy 4) one row above the bonus pipe top does not enter; Mario lands
// at x 1358 next row, outside the entry range. Down pipes are entered only from footing (grounded).
export function downPipeFooting(p:{grounded:boolean}):boolean{return p.grounded;}
// Native 7-1 (r4 mood5 rows 2394-2406, branching probe): Down+Right (or Down+Left) held on the LANDING frame onto the pipe top enters (x 1495, 1493),
// while Down+Right held after Mario already stood there never enters (x 1496..1503, and r1 6-2 mood6, r4 2-1 mood3). Left/Right only block from footing.
export function downPipeLateralBlocks(wasGrounded:boolean,b:{has(k:'left'|'right'):boolean}):boolean{return wasGrounded&&(b.has('right')||b.has('left'));}
export class Simulation {
 levels:Level[]; levelIndex=0; area!:Area; tiles=new Map<string,number>(); freeTiles:TilePiece[]=[]; frame=0; areaFrame=0; areaPlayFrame=0; camera=0;
 /** Display only: native ColorRotation runs (ColorRotateOffset $06D4) since the area was initialized; drives the ?-block/coin palette cycle in the renderer. */
 colorRotations=0;readonly paletteClock=new NativePalette();private paletteRemove=false;private graphicsBuffer1=false;private blockUpdateBusy=false;
 readonly blockBackground=new Map<string,number|null>();private blockBackgroundQueue=new Map<string,number|null>();
 readonly blockGraphics:{slot:number;key:string;x:number;y:number;metatile:number;pictureY:number|undefined;replace:boolean}[]=[];
 get colorDrawRotations(){return this.paletteClock.draw;}
 player!:Player; enemies:Enemy[]=[]; items:Item[]=[]; popups:ScorePopup[]=[]; phase:Phase='title'; phaseFrame=0; titleFrame=0;
 climbPoseFrame=0;
 locomotionPose:{kind:'stand'|'walk'|'skid'|'jump';frame:number;facing:number}={kind:'stand',frame:0,facing:1};
 wallDisplayPose?:{kind:'walk';frame:number;facing:number};private wallDisplayTimer=0;
 /** Native PlayerAnimCtrl/Timer/TimerSet (src/player-anim.ts). */
 playerAnim=new PlayerAnim();private jumpPose=false;private playerAnimNmiTimer=0;private playerAnimNmiCtrl=0;
 private offscreenLavaDeath=false;
 private offscreenPitDeath=false;
 private offscreenDeathRows=0;
 private timeUpDeath=false;private loseLife=false;
 private lastJumpFallForce=0.5625;
 private fallingThroughCastleLava=false;private pitMusic=false;
 private sideCollisionTimer=0;private platformScroll=0;private blockBounceTimer=0;private platformEjection=0;private slotReleaseFrame=[-1,-1,-1,-1,-1];
 private stompChain=0;
 /** Native AreaParserTaskNum / ScrollThirtyTwo and buffer2 VRAM writes. */
 private castlePictures=new NativeCastlePictures('','');
 private areaControls=new NativeAreaControls('','');private parserClock=new NativeParserClock();private parserVramBusy=false;private parserLoaderWasBlocked=false;
 springSlots=new Map<SpringSpec,number>();private springLoadColumns=0;
 get parserColumnX(){return this.areaControls.column*16;}
 set parserColumnX(x:number){this.areaControls.column=x/16;}
 // Camera crossings remain inputs to the separate loop/frenzy parser models.
 private scrollCrossFrame=-Infinity;private scrollCrossCamera=0;private loopPass=0;private loopCorrect=0;
 /** Native Player_MovingDir ($45): the sign of the speed byte ($57) whenever that byte is non-zero, else unchanged (115,065 of 115,071 native play rows).
  * The run timer is refreshed only while it equals the pressed direction (0 of 6,436 B presses refresh it otherwise). */
 movingDir:-1|1=1;
 /** Floatey-number points: native FloateyNumbersRoutine adds them when FloateyNum_Timer, set to $30, reaches $2B, five frames after the award (4-3 v2: stomps at 187/203 pay at 192/208; coins and bricks pay at once). */
 private pendingScore:{value:number,left:number}[]=[];
 private stompedThisStep=false;
 private activatedHidden1ups=new Set<string>();
 private multiCoinExpiries=new Map<string,number>();
 swimPoseFrame=0;
 lives=3; score=0; coins=0; time=400; paused=false; muted=false; twoPlayer=false; currentPlayer=0;
 private gameoverClosingFrame=-1;private gameoverSkipDelay=0;introFromGameover=false;
 slots:Slot[]=[]; events:string[]=[]; checkpoint=false; previous=new Set<Button>(); timerFrames=0;
 private activatedCheckpointArea?:string;
 castleStage:'bridge'|'fall'|'walk'|'message'='bridge';castleArrivalFrame=0;nativeVictory?:NativeVictory;private victoryBoss?:Enemy;private victoryMessages:number[]=[];private victoryPending=-1;levelLoad?:NativeLevelLoad;private victoryErase?:'axe'|'chain'|'bridge';
 readonly flagNumber={y:0,fraction:0};flagTop=49;flagInside=false;flagBonus=0;private flagWait=0;
 private flagFireworkCount=0;private flagFireworksAwarded=0;private flagCastleGeometry?:{x:number;roofY:number};
 powerChange?:{from:0|1|2;to:0|1|2;remaining:number;kind:'grow'|'fire'|'shrink'};
 /** Water pipe drop-in (2-2, 7-2): native PlayerEntrance runs until Mario's y reaches $30, and the game timer starts with control (2-2 v2: y49 on row 385, routine 8 and 401 -> 400 on row 386). */
 private waterEntryTimerHold=0;
 private waterEntryFall=false;private waterSurface={active:false,contacted:false};
 private fetchGameTimer=false;private screenTimer=0;private introLength=TRANSITIONS.introFrames;private lifeIntro?:LifeIntro;private deathLoad?:{state:NativeLevelLoad;dispatch:boolean;area:string;spawn?:[number,number];camera?:number;player?:Player};private gameoverEnd=0;private lifeFrozen=0;private lifeRow=0;private entryLanding=false;
 private entryFalling=false;private entryFallAge=0;private entryReadyAge=-1;/** Rows a queued pad trails its native read in the entry (default: queue length - 1); tools that seed the queue on native rows set 0. */entryInputLag?:number;private entryInputDelay=-1;private entryTimerDelay=-1;
 private slotCamera=0;private slotScroll=false;private slotSub=[0,0,0,0,0];slotYSpeed=[0,0,0,0,0];slotYFraction=[0,0,0,0,0];private slotYFrac=[0,0,0,0,0]; // native sub-pixel byte left in each enemy slot (docs/NATIVE_ROLES.md, Object slots): a new walker starts with it; every area load (level, pipe, respawn) clears it
 private playerXScroll=0;private pipeTimer=0;
 private pipeRise=0;private enemyContactOff=false;broClock=0;random=new NativeRandom();secondaryHardMode=false;primaryHardMode=false;recordedRoute=false; /* set by the route comparison: its fish and cannons replay the recorded attempts, whose hidden slot state a re-seeded replay cannot reproduce */private fishTimer=0;private swimTimer=0;private swimBag=0;private marioMotion=1;private cannonTable:{cannon:CannonSpec;timer:number}[]=[];private cannonsLoaded=0;
 private platformMotion=new PlatformMotion({levelId:'',areaId:''});private platformFrame=0;
 private flameFrenzy=false;private flameTimer=0;private flameTimerCounter=0;private mouthFlame?:Enemy;
 private firebarMotors=new Map<FirebarSpec,{state:FirebarMotor;geometry:FirebarGeometry}>();private firebarDeathFrame=0;private deathMove?:NativeMoveState;private firebarMarioScreenX=0;private firebarSlots?:FirebarSlots;
 private bridge:string[]=[];private springTimers=new Map<SpringSpec,NativeSpring>();private erasedVineSlots=new Set<number>();private mazeStates:MazeState[]=[];private mazeSource!:Area;
 vines:Vine[]=[];private climbingVine?:Vine;private vineProgress=new Map<string,number>();private vineDetached=false;private entryVineActive=false;private autoVineActive=false;private entryVineStage:'grow'|'climb'|'right'|'fall'='climb';
 warpZoneActive=false;
 private footPushed=false;private piranhaTouchFeetY?:number;private landingFraction=0;private fallGravity=FALL_GRAVITY_AFTER_LOAD;private walkingOff=false;
 private motor=new PlayerMotor();private wallSpeed?:number;private wallBackOut=false;
 readonly bubbleState=new NativeBubbles();
 get bubbles(){return this.bubbleState.slots;}
 private bubblesInitialized=false;private waterScrollX=0;
 private waterEnemyStream?:NativeWaterStream;private waterSlotPositions=Array.from({length:6},()=>({x:0,y:0}));
 /** Native-exact swimming (src/native-water.ts): active in water areas once the legacy entry fall is over. */
 private water=new NativeWater();private swimActive=false;private swimDy=0;private swimPull=0;private swimLock=0;private swimAbsolute=0;private swimDirection:Direction=0;
 /** The first controlled swim frame of a room load or respawn counts a held A as a fresh press (native rows: the stroke lands on the first control row whatever was held before). */
 private swimFreshA=false;
 bump=new Map<string,number>(); readonly usedBlockRehits=new Set<string>(); private destination?:{area:string;level?:string;spawn:[number,number];camera?:number;direction:string;frames:number;smallPlayerRoomPreviewFrames?:number;smallPlayerRoomEntry?:{transitionFrames:number;spawnFeetY:number;initialVy:number;gravity:number};ordinaryEnemyFrontier?:number;returnCloudOffsetX?:number;riseFrames?:number}; private inputs:Set<Button>[]=[new Set(),new Set()]; private pauseCooldown=0;private airRunning=false;private mediumJump=false;private runJump=false;private headBumped=false;private brokenBrick?:{key:string;rows:number};private bouncing=false; private braking=PHYSICS.brake;private skidAccel=0; private jumpHeld=0;private jumpArc=false;private landJump:'inactive'|'held'|'released'='inactive'; private lastFire=-12;
 constructor(levels:Level[]){if(!levels.length)throw new Error('No observed level data');this.levels=levels;this.reset();}
 get level(){return this.levels[this.levelIndex];}
 get height(){return this.player.size>0&&!this.player.duck?28:12;}
 get fireballThrowAge(){return this.lastFire<0?-1:this.frame-this.lastFire;}
 castleBowserFalls(e:Enemy){return this.victoryBoss===e&&Boolean(this.nativeVictory!.bossState&64);}
 get vineEntryStage(){return this.entryVineActive?this.entryVineStage:undefined;}
 get pipeRising(){return this.pipeRise>0;}
 /** True while the native entry is still engine 7 (no control): the underground fall's first 17 rows, the water room's 34-row fall to native y 49. */
 get entryControlLocked(){const native=this.entryFalling?this.area.entryFall?.native:undefined;return native?this.entryReadyAge<0:this.swimLock>0;}
 get verticalPipeGraphics(){return this.phase==='pipe'&&this.destination?.direction==='down';}
 get pipeHidden(){return this.phase==='pipe'&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=(this.area.autoWalk?TRANSITIONS.autoWalkPipe.hiddenFrame:32));}
 /** Native time-out: a TIME UP screen for the first 7 clock ticks of the 14, then the ordinary lives screen. */
 nativeBackdrop=0x22; // PPUpalette0: retained across CPU RAM initialization, advanced by source screen writes
 get nativeScreen(){return this.deathLoad?.state??this.levelLoad;}
 get timeUpScreen(){return this.phase==='intro'&&Boolean(this.lifeIntro?.timeUp)&&this.lifeIntro!.seen<LIFE_FLOW.ticksScreen;}
 /** DisplayIntermediate/DisplayTimeUp queues the text and enables PPU output; it appears on the following NMI. */
 get introHiddenEarly(){if(this.levelLoad)return this.levelLoad.task===0||this.levelLoad.screen<=6;return this.phaseFrame<(this.lifeIntro?.fromDeath?this.lifeIntro.set+1:TRANSITIONS.introHiddenBeforeFrame);}
 get introHiddenLate(){if(this.levelLoad)return this.levelLoad.screen>=8;return this.lifeIntro?this.lifeIntro.end>0&&this.phaseFrame>=this.lifeIntro.end-LIFE_FLOW.screenBlackTail:this.phaseFrame>=TRANSITIONS.introHiddenFromFrame;}
 get gameoverClosing(){return this.phase==='gameover'&&this.gameoverClosingFrame>=0;}
 get pipePreviewArea(){const d=this.destination;if(this.phase!=='pipe'||this.player.size!==0||!d?.smallPlayerRoomPreviewFrames||d.frames-this.phaseFrame>d.smallPlayerRoomPreviewFrames)return undefined;return this.level.areas.find(a=>a.id===d.area);}
 get pipeLoading(){return this.phase==='pipe'&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=this.destination.frames-TRANSITIONS.pipeBlackoutFinalFrames); }
 get pipeClearing(){return this.phase==='pipe'&&!this.area.autoWalk&&Boolean(this.destination&&this.destination.frames>64&&this.phaseFrame>=48&&this.phaseFrame<this.destination.frames-TRANSITIONS.pipeBlackoutFinalFrames);}
 get entryFallHidden(){return this.entryFalling&&this.entryFallAge<=(this.area.entryFall?.visibleDelay??0);}
 get waterEntryStanding(){return this.entryFalling&&this.area.theme==='water'&&this.entryFallAge<=(this.area.entryFall?.initialStandFrames??0);}
 get entryFallPose(){return this.entryFalling&&this.area.theme!=='water';}
 get entryTimerHidden(){return Boolean(this.area.entryFall&&this.entryTimerDelay!==0);}
 reset(playing=false){
  this.frame=0;this.lifeRow=0;this.lifeFrozen=0;this.lifeIntro=undefined;this.deathLoad=undefined;this.levelLoad=undefined;this.levelIndex=0;this.lives=3;this.score=0;this.pendingScore=[];this.coins=0;this.currentPlayer=0;this.checkpoint=false;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.introFromGameover=false;
  this.activatedCheckpointArea=undefined;
  this.slots=[0,1].map(()=>({level:0,lives:3,score:0,coins:0,size:0,checkpoint:false}));this.previous.clear();this.inputs=[new Set(),new Set()];this.events=[];this.paused=false;this.pauseCooldown=0;
  this.destination=undefined;this.lastFire=-12;this.airRunning=false;this.runJump=false;this.mediumJump=false;this.bouncing=false;this.braking=PHYSICS.brake;this.skidAccel=0;this.motor.reset();this.jumpHeld=0;this.landJump='inactive';
  this.vineProgress.clear();this.climbingVine=undefined;this.activatedHidden1ups.clear();
  if(this.player)this.player.size=0;this.loadArea(this.level.main);this.timerFrames=this.level.id==='1-1'?TRANSITIONS.freshReferenceResetTimerFrames:0;if(this.level.id==='1-1'){this.areaFrame=FLAG_COMPLETION.freshAreaFrame;this.broClock=HAMMER_NATIVE.freshClock;}/* the recorded 1-1 route's area clock phase: its level end falls on native row 1975 */this.fetchGameTimer=!playing;if(!playing){this.time=0;this.timerFrames=24;this.events=['command_silence'];}this.phase=playing?'play':'title';this.phaseFrame=0;this.titleFrame=0;
 }
 loadArea(id:string,spawn?:[number,number],camera?:number,preserveTimer=false,lifeEntry=false){
  this.piranhaTouchFeetY=undefined;this.fallGravity=FALL_GRAVITY_AFTER_LOAD;this.landingFraction=0;this.walkingOff=false;
  this.fallingThroughCastleLava=false;this.pitMusic=false;
  this.spinyTimer=0;this.spinyBuffer=false;this.lakituReappearCount=0;this.nativeStompTimer=0;this.specialSlot5=new NativeSpecialSlot();this.nativeFrenzyTurn=undefined;this.slotBroJump=[0,0,0,0,0];this.miscHammerBytes=Array.from({length:9},()=>({force:0,fraction:0,collision:false}));this.miscOffscreen=0;this.hammerPlayerBox=undefined;this.miscPositions=Array.from({length:9},()=>({x:0,y:0}));this.blockControl=0;this.nativeBlockBounce=0;this.nativeBlocks=Array.from({length:4},(_,slot)=>({slot,x:0,y:0,state:0,speed:0,force:0,fraction:0})); // InitializeArea clears the timers ($0780-$07A1) and the frenzy buffer (8-2 row 684 after a death: $078F 0, $06CB 0)
  const [world,course]=this.level.id.split('-').map(Number);this.secondaryHardMode=world>5||world===5&&course>=3;
  const source=this.level.areas.find(a=>a.id===id);if(!source)throw new Error(`Unmapped area ${this.level.id}/${id}`);
  this.stompChain=0;
  this.multiCoinExpiries.clear();
  // Stream inserts belong to this visit. Reset/death must reload the explicit
  // observed map rather than retain a previous failed route's extra sections.
  const area=structuredClone(source);this.mazeSource=source;
  this.sideCollisionTimer=0;this.platformScroll=0;this.screenTimer=0;
  this.platformMotion.reset({levelId:this.level.id,areaId:id});this.platformFrame=0;
  const size=this.player?.size??0;this.area=area;this.tiles=new Map(area.tiles.map(([x,y,id])=>[`${x},${y}`,id]));this.freeTiles=(area.freeTiles??[]).map(t=>({...t}));
  // Firebars share the five native enemy slots and inherit each slot's vertical speed byte as their initial angle.
  this.firebarSlots=area.firebars?.length?new FirebarSlots(area.firebars):undefined;
  if(this.firebarSlots){this.firebarSlots.busy=slot=>{const enemies=new Set(this.enemies.flatMap(e=>e.active&&e.enemySlot!==undefined&&!e.slotFreed?[e.enemySlot]:[]));return enemies.has(slot)||this.objectSlots(enemies).has(slot);}; /* lifts hold slots too (2-4 row 536: lifts 43/44 in slots 2, 3, bar in 4) */this.firebarSlots.slotByte=slot=>this.slotYSpeed[slot];this.firebarSlots.release=(slot,byte)=>{this.slotYSpeed[slot]=byte;};}
  this.firebarMotors.clear();
  for(const bar of area.firebars??[])if(bar.motor&&bar.length===6)this.firebarMotors.set(bar,{state:createFirebarMotor(bar.motor),geometry:{x:bar.x,y:bar.y,length:6}});
  // Activation consumes a hidden1up across ordinary deaths; its used block reloads blank.
  for(const[key,id]of this.tiles)if(id===96&&this.activatedHidden1ups.has(`${this.currentPlayer}/${this.level.id}/${area.id}/${key}`))this.tiles.delete(key);
  this.warpZoneActive=false;
  this.vines=(area.vines??[]).map(v=>{const height=this.vineProgress.get(this.vineKey(v.id))??v.initialHeight??0;return {...v,height,growing:height>0&&height<v.baseY-v.topY};});this.climbingVine=undefined;this.vineDetached=false;
  for(const block of area.blockContents??[])if(block.kind==='vine'&&this.vineProgress.has(this.vineKey(block.vineId)))this.tiles.set(`${block.col},${block.row}`,196);
  const [x,y]=spawn??area.spawn;this.player={x,y,vx:area.spawnVelocity?.[0]??0,vy:area.spawnVelocity?.[1]??0,grounded:true,facing:1,size,invincible:0,star:0,duck:false,anim:0,dead:false,climbing:false};
  this.airRunning=false;this.mediumJump=false;this.runJump=false;this.bouncing=false;this.braking=PHYSICS.brake;this.skidAccel=0;this.motor.reset(0,1,0);this.jumpHeld=0;this.landJump='inactive';
  this.powerChange=undefined;this.powerupStateZero=false;this.transformPreviousAB=undefined;this.nativePlayerAB=0;this.starPalette=0;this.starDrawPalette=undefined;
  const spawnAtEntry=!spawn||spawn[0]===area.spawn[0]&&spawn[1]===area.spawn[1];
  this.waterEntryFall=Boolean(area.waterEntryFall&&spawnAtEntry);this.waterEntryTimerHold=this.waterEntryFall?1:0;this.waterSurface={active:false,contacted:false};
  this.startSwim(spawnAtEntry,preserveTimer||lifeEntry);this.bubbleState.reset();this.bubblesInitialized=false;
  if(lifeEntry&&this.swimLock===3)this.swimLock=2; // respawn PlayerEntrance starts its first gravity pass on the next row; a pipe load has one intervening engine row
  this.entryFalling=Boolean(area.entryFall&&spawnAtEntry);this.entryFallAge=0;this.entryReadyAge=-1;this.entryInputLag=undefined;this.entryInputDelay=this.entryFalling?-1:0;this.entryTimerDelay=this.entryFalling?-1:0;
  this.entryFallFacing(area);
  this.entryVineActive=Boolean(area.entryVine);this.autoVineActive=false;this.entryVineStage='climb';
  if(area.entryVine){
   this.climbingVine=this.vines.find(v=>v.id===area.entryVine!.vineId)!;
   if(area.entryVine.waitUntilGrowthComplete&&this.climbingVine.height<this.climbingVine.baseY-this.climbingVine.topY){this.climbingVine.growing=true;this.entryVineStage='grow';}
   this.player.climbing=this.entryVineStage==='climb';
  }
  if(!this.nativeScreen)this.nativeBackdrop=graphics.palette_observations[area.palette].palette[0];
  this.player.grounded=this.isSolid(x+8,y);this.camera=camera??area.camera??Math.max(0,x-112);this.areaFrame=0;this.colorRotations=0;this.playerXScroll=0;this.pipeTimer=0;this.paletteClock.reset(Math.floor(this.camera)&31);this.blockGraphics.length=0;this.blockBackground.clear();this.blockBackgroundQueue.clear();this.nativePowerSlot={speed:0,force:0,fraction:0};this.scrollCrossFrame=-Infinity;this.castlePictures=new NativeCastlePictures(this.level.id,area.id);this.areaControls=new NativeAreaControls(this.level.id,area.id,this.camera);this.parserClock=new NativeParserClock();this.springLoadColumns=lifeEntry?12:0;if(lifeEntry)this.areaControls.column-=24;this.springSlots.clear();this.parserVramBusy=false;this.parserLoaderWasBlocked=false;this.movingDir=1;this.areaPlayFrame=0;this.slotSub=[0,0,0,0,0];this.slotYSpeed=[0,0,0,0,0];this.slotYFraction=[0,0,0,0,0];this.flameFrenzy=false;this.flameTimer=0;this.flameTimerCounter=0;this.mouthFlame=undefined;this.collisionBits=[0,0,0,0,0];this.groupParserSlot=5;this.groupSlotsBefore=[false,false,false,false,false];this.slotYFrac=[0,0,0,0,0];this.slotVertical=[0,1,2,3,4].map(()=>({speed:0,force:0,fraction:0}));this.fishTimer=0;this.fishCamera=undefined;this.swimTimer=0;this.swimBag=0;this.cannonTable=[];this.cannonsLoaded=0;this.platformSlots.clear();this.frenzyControllers=nativeFrenzyControllers(this.level.id,area.id);seedNativePageControllers(this.frenzyControllers,this.camera,this.areaControls.origin*16);this.slotReleaseFrame.fill(-1);this.enemies=area.enemies.map(e=>this.makeEnemy(e));for(const e of this.enemies)if(e.kind==='bowser')e.x=e.originX=nativeBowserSpawnX(this.level.id,e.x);
  for(const object of this.areaControls.castleGraphics)if(object.column>=0&&object.column*16<area.width)this.blockBackground.set(`${object.column},${object.row}`,object.id);
  this.waterScrollX=(Math.floor(this.player.x)-Math.floor(this.camera))&255;
  const waterSource=nativeWaterStreams.streams.find(s=>s.areas.some(a=>a.level===this.level.id&&a.area===area.id));this.waterEnemyStream=waterSource?new NativeWaterStream(waterSource.bytes):undefined;this.waterSlotPositions=Array.from({length:6},()=>({x:0,y:0}));
  this.piranhaColumns=new PiranhaColumns(this.camera);
  this.bindNativeHammerBros();
  for(const command of this.specialAreaCommands())if(command.x>=Math.floor(this.camera/256)*256&&command.x<Math.floor(this.camera/256)*256+384)this.applySpecialAreaCommand(command);
  if(area.entryVine)this.specialSlot5.claimVine(Math.floor(this.player.x+8)&~15,240);
  this.climbPoseFrame=0;this.locomotionPose={kind:'stand',frame:0,facing:1};this.playerAnim.reset();this.jumpPose=false;this.wallDisplayPose=undefined;this.wallDisplayTimer=0;
  this.swimPoseFrame=0;
  this.springTimers.clear();this.erasedVineSlots.clear();this.springRelease=false;this.loopPass=0;this.loopCorrect=0;this.mazeStates=[...area.mazes??[],...area.maze?[area.maze]:[]].filter(spec=>!this.nativeLoopPage(spec.loopAt)).map(spec=>({spec,sourceFrom:spec.loopTo,sourceTo:spec.loopAt,gate:0,completed:false}));this.nativeVictory=undefined;this.victoryBoss=undefined;this.victoryMessages=[];this.victoryPending=-1;this.victoryErase=undefined;this.bridge=[];this.castleStage='bridge';this.castleArrivalFrame=0;
  this.flagNumber.y=this.flagNumber.fraction=0;this.flagTop=48;this.flagInside=false;this.flagBonus=0;this.flagWait=0;
  this.items=[];this.popups=[];this.bump.clear();this.blockBounceTimer=0;this.usedBlockRehits.clear();if(!preserveTimer){this.time=this.level.time;this.timerFrames=0;}
  if(!lifeEntry)for(const spring of this.area.springs??[])if(spring.nativeColumn!==undefined&&spring.nativeColumn>=this.parserColumnX-384&&spring.nativeColumn<this.parserColumnX)this.createNativeSpring(spring);
  this.emit(this.areaMusic());
 }
 private emit(id:string){this.events.push(id);}
 private areaMusic(){const area=this.area;return `music_${area.entryVine?'cloud':area.theme==='underground'?'underground':area.theme==='water'?'water':area.theme==='castle'?'castle':'ground'}${this.time<=100?'_hurry':''}`;}
 private awardPopup(value:number|'1up',x:number,y:number,victim?:Enemy){
  // SetupFloateyNumber overwrites the label in this enemy slot (or the special power-up slot5).
  this.popups=this.popups.filter(p=>victim?p.victim!==victim&&(victim.enemySlot===undefined||p.victim?.enemySlot!==victim.enemySlot):p.victim!==undefined);
  this.popups.push({value,x:Math.floor(x-this.camera),y:Math.floor(y),age:0,life:0x30,victim});
 }
 private enemyPopup(value:number|'1up',enemy:Enemy){
  const picture=enemyPicture(enemy);this.awardPopup(value,picture.x,picture.y-popupRules.enemyFeetYOffset,enemy);
 }
 private eraseEnemy(enemy:Enemy){
  enemy.dead=100;this.popups=this.popups.filter(p=>p.victim!==enemy); // EraseEnemyObject clears FloateyNum_Control, leaving its timer residue
 }
 /** Score with the floatey-number points still waiting to be paid (what has been awarded, independent of when the HUD shows it). */
 get awardedScore(){return this.pendingScore.reduce((n,s)=>n+s.value,this.score);}
 private floateyScore(value:number){this.pendingScore.push({value,left:5});}
 private payFloateyScore(){for(const s of this.pendingScore)if(--s.left===0){this.score+=s.value;this.blockUpdateBusy=this.graphicsBuffer1=true;}this.pendingScore=this.pendingScore.filter(s=>s.left>0);}
 private advancePopups(){
  for(const popup of this.popups){popup.age++;if(popup.y>=16)popup.y--;}
  this.popups=this.popups.filter(popup=>popup.age<popup.life); // native raw Y stops at23; the SBC carry makes the visible artwork stop at15
 }
 /** Native walker groups are created from the screen, not the map (first rows over 25 runs: 704..708 at one group, x - Mario a constant 143), so a group whose trigger the camera passed by n px appears n px further right, followers included. Lone walkers keep a fixed x. */
 /** Native enemy group (HandleGroupEnemies, data ids $37-$3E): two or three Goombas/Beetles/Koopas made on one frame at ScreenRight_X_Pos (camera + 255), +24, +48. A list
  * entry belongs to such a group when entries of its kind recorded within 3 px of camera sit 20-28 px apart from a leader near spawnCamera + 255 (76 of 76 group followers of the v2 traces). */
 private nativeGroupMembers(e:Enemy):Enemy[]|undefined{
  if(e.nativeGroup)return this.enemies.filter(m=>m.nativeGroup?.column===e.nativeGroup!.column).sort((a,b)=>a.nativeGroup!.index-b.nativeGroup!.index);
  if(e.spawnCamera===undefined||!['goomba','koopa','redKoopa','beetle'].includes(e.kind))return;
  const near=this.enemies.filter(o=>o.kind===e.kind&&o.spawnCamera!==undefined&&Math.abs(o.spawnCamera-e.spawnCamera!)<=3).sort((p,q)=>p.originX-q.originX);
  let chain:Enemy[]=[];
  for(const o of near){if(chain.length&&o.originX-chain[chain.length-1].originX>=20&&o.originX-chain[chain.length-1].originX<=28)chain.push(o);else{if(chain.includes(e))break;chain=[o];}}
  if(chain.length<2||!chain.includes(e)||chain.length>3||Math.abs(chain[0].originX-chain[0].spawnCamera!-255)>10)return;
  return chain;
 }
 /** Index of e in its native group (entries of one kind recorded within 3 px of camera, 20-28 px apart, the leader near spawnCamera + 255). */
 private nativeGroupIndex(e:Enemy){const g=this.nativeGroupMembers(e);return g?g.indexOf(e):undefined;}
 /** A group is made when its enemy-data column reaches (ScreenRight + 48) & 0xF0; the leader's recorded spawnCamera only bounds that column, (spawnCamera + 303) & ~15
  * (8-1 Koopa pair: recorded camera 435, native made at 434). Other list objects keep their recorded spawnCamera. */
 private spawnCameraReached(e:Enemy){
  const g=this.nativeGroupMembers(e);
  if(e.nativeGroup)return ((Math.floor(this.camera)+303)&~15)>=e.nativeGroup.column;
  // A single object on a 16 px column is made when the column reaches (ScreenRight + 48) & 0xF0, i.e. camera >= x - 303 (1-1 Goomba 352: made at camera 49, recorded 50).
  if(g===undefined&&['goomba','koopa','redKoopa','beetle'].includes(e.kind)&&e.originX%16===0)return e.originX<=Math.floor(this.camera)+303;
  return g===undefined?this.camera>=e.spawnCamera!:((Math.floor(this.camera)+303)&~15)>=((g[0].spawnCamera!+303)&~15);
 }
 /** HandleGroupEnemies fills the lowest free slots in x order on one frame; with all five slots busy a member is never made (2-1 x 1088 Goomba has no slot natively). */
 private activateNativeGroupMember(m:Enemy){
  m.active=true;m.x=Math.floor(this.camera)+255+24*this.nativeGroupIndex(m)!;this.takeNativeSlot(m);
  if(m.enemySlot===undefined){m.active=false;m.slotLost=true;}
 }
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
  e.movingShell=true;e.shellAge=0;e.shellChain=0;e.kickOverlap=true;e.vx=(p.x-e.x<3?1:-1)*shellRules.speedPixelsPerNativeFrame;this.floateyScore(this.shellKickAward());this.emit('sfx_kick');return true;
 }
 private makeEnemy(e:EnemySpec):Enemy{return {...e,nativeSlot:e.nativeSlot??(e.kind==='blooper'&&e.stroke||e.kind==='cheep'&&e.swim?'wait':undefined),autoPhase:e.kind==='piranha'&&e.phase===undefined?true:undefined,phase:e.phase??(e.kind==='piranha'?(Math.abs(this.player.x-e.x)<=PIRANHA.proximity.maximumInhibitedIntegerSeparation?PIRANHA.stages[1].fromPhaseInclusive:PIRANHA.initialPhase):undefined),vx:(e.direction??-1)*0.5,vy:greenSpawnVy(e),active:false,dead:0,shell:false,movingShell:false,age:0,y:e.y+(greenBounceSpec(e)?0:e.spawnYFraction??0),originX:e.x,originY:e.y,hp:5,unwingedAir:e.spawnUnwinged?-1:undefined};} // spawnUnwinged: a route Koopa that natively first appears as a just-stomped Paratroopa (state 1, untouchable until it lands)
 step(buttons:Button[],frames=1,buttons2:Button[]=[]){
  if(!Number.isInteger(frames)||frames<0||frames>18000)throw new Error('frames must be an integer in 0..18000');
  const held=[new Set(buttons),new Set(buttons2)];
  for(let i=0;i<frames;i++){
   const player=this.phase==='title'||!this.twoPlayer?0:this.currentPlayer;
   this.inputs.push(new Set(held[player]));const effective=this.inputs.shift()!;
   for(const key of ['start','select'] as Button[]){if(held[0].has(key)||(this.phase==='title'&&held[1].has(key)))effective.add(key);else effective.delete(key);}
   {const starBefore=this.player.star,paletteBefore=this.starPalette,areaBefore=this.area,cameraBefore=this.camera,engineBefore=!['title','intro','gameover','ending','castle'].includes(this.phase),fresh=this.freshA,grace=this.phase==='play'&&this.controlGrace>0;if(grace){effective.delete('a');this.controlGrace--;}this.paletteRemove=false;this.graphicsBuffer1=false;this.blockUpdateBusy=false;this.update(effective);this.nativeBackdrop=nativeScreenBackdrop(this.nativeBackdrop,this.nativeScreen?nativeScreenPicture(this.nativeScreen,this.area.theme==='water'):undefined,graphics.palette_observations[this.area.palette].palette[0]);if(!this.paused&&areaBefore===this.area){if(engineBefore){const buffer2=this.paletteClock.step(Math.max(0,Math.floor(this.camera)-Math.floor(cameraBefore)),this.colorRotations,this.paletteRemove,this.graphicsBuffer1||(this.random.frame&7)===0);if(!buffer2){for(const [key,id]of this.blockBackgroundQueue)this.blockBackground.set(key,id);this.blockBackgroundQueue.clear();}}else this.paletteClock.draw=this.colorRotations;this.starDrawPalette=starBefore||this.player.star?paletteBefore:undefined;this.starPalette=nativeStarPalette(this.player.star,this.random.frame);}if(fresh&&!grace)this.freshA=false;}this.previous=effective;
  }
 }
 private update(b:Set<Button>){
  // Native: the row that ends the death sets engine 6 (PlayerLoseLife) to run on the NEXT row, so that row is still a death row (1-1 v2: e11 786..992, e6 993, lives screen
  // from 994). The lives screen is timed from the e6 row, as before, so the deferred respawn runs first, on the clock of the row that ended the death.
  if(this.phase==='dying'&&this.loseLife){this.loseLife=false;this.respawn();}
  this.lifeRow++;
  if(this.levelLoad?.task===0&&this.levelLoad.screen===0||this.phase==='intro'&&this.lifeIntro?.fromDeath&&this.phaseFrame===2){
   // InitializeArea clears FrameCounter and holds the LFSR on the third row after PlayerLoseLife (all native v2 respawns).
   this.random.frame=0;this.random.prev=[...this.random.bytes];
  }else this.random.tick();
  if(this.nativeBlockBounce>0)this.nativeBlockBounce--;
  const resumedAB=this.powerupStateZero?this.transformPreviousAB:undefined,previousA=resumedAB===undefined?this.previous.has('a'):Boolean(resumedAB&128),previousB=resumedAB===undefined?this.previous.has('b'):Boolean(resumedAB&64);
  const pressed=(key:Button)=>b.has(key)&&(!(key==='a'?previousA:key==='b'?previousB:this.previous.has(key))||(key==='a'&&this.freshA));
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
  if(this.paused){this.random.frame=(this.random.frame-1)&255;this.lifeFrozen++;return;}
  this.frame++;this.phaseFrame++;this.areaFrame++;this.advancePopups();this.payFloateyScore();
  this.firebarMarioScreenX=Math.floor(this.player.x)-Math.floor(this.camera); // Mario's OAM x as the previous frame drew it (src/firebar-contact.ts)
  this.lifeClockFreeze();
  if(this.levelLoad){this.updateLevelLoad();return;}
  if(this.phase==='intro'&&this.deathLoad)this.updateDeathLoad();
  if(this.phase==='intro'&&this.lifeIntro){const ready=this.lifeIntroDone(),firstEngine=this.lifeIntro.end-(this.entryFalling&&this.area.entryFall?.native?0:1);if(this.lifeIntro.end>0&&this.phaseFrame>=firstEngine&&(this.random.frame&7)===0)this.colorRotations++;if(this.lifeIntro.end>0&&this.phaseFrame>=this.lifeIntro.end-LIFE_FLOW.screenTail+(this.entryFalling&&this.area.entryFall?.native?1:0)+1)this.renderInitialSpringColumns();if(this.lifeIntro.end>0&&this.phaseFrame===firstEngine){this.initializeGameTimer();this.primeNativeEntryObjects();}if(this.lifeIntro.end&&this.phaseFrame>=this.lifeIntro.end-1){this.updateBubbles(this.bubblesInitialized,false);this.updateWaterEntryEnemies();}if(ready)this.startPlayAfterIntro();return;}
  if(this.phase==='intro') {if(this.phaseFrame>=this.introLength-18)this.renderInitialSpringColumns();if(this.phaseFrame===this.introLength-1){this.initializeGameTimer();this.primeNativeEntryObjects();}if(this.phaseFrame>=this.introLength){this.phase='play';this.freshA=true;this.controlGrace=Math.min(CONTROL_GRACE_ROWS,this.inputs.length);this.phaseFrame=0;this.introFromGameover=false;this.lifeClockAtControl();this.primeNativeReadyEnemies();if(this.phase==='play')this.consumeGameTimer(!this.entryControlLocked&&!this.area.autoWalk);this.emit(this.areaMusic());}return;}
  if(this.phase==='gameover'){
   if(this.gameoverClosingFrame>=0){if(++this.gameoverClosingFrame>=(this.twoPlayer&&this.slots[1-this.currentPlayer].lives>0?6:26))this.finishGameover();}
   else if(this.gameoverSkipDelay>0){if(--this.gameoverSkipDelay===0)this.gameoverClosingFrame=0;}
   else if(pressed('start'))this.gameoverSkipDelay=4;
   // Visible source durations vary; this timer is a provisional approximation.
   else if(this.gameoverEnd>0&&this.phaseFrame>=this.gameoverEnd-26)this.gameoverClosingFrame=0;
   return;
  }
  if(this.phase==='ending'){if(pressed('start')||pressed('b'))this.restartToTitle();return;}
  if(this.phase!=='castle'&&(this.random.frame&7)===0&&!(this.phase==='pipe'&&['down','right'].includes(this.destination?.direction??'')&&this.pipeTimer<=1))this.colorRotations++; // display only: native ColorRotation in the game engine, frames with FrameCounter&7==0
  if(this.phase==='dying'){
   this.updateWorldInPitFall();
   if(!this.offscreenLavaDeath&&!this.offscreenPitDeath)this.emergeFrozenNativePowerups();
   if(!this.offscreenLavaDeath&&!this.offscreenPitDeath&&this.phaseFrame>deathRules.freezeFrames){
    const move=this.deathMove!;nativeImposeGravity(move,40,4);this.player.y=move.y+move.fraction/256;this.player.vy=move.speed+move.force/256;
   }
   this.updateBubbles(this.phaseFrame>=255,false); // injury sets TimerControl=$ff; the bubble timer holds while that byte counts down
   if(this.offscreenLavaDeath||this.offscreenPitDeath?this.phaseFrame>=this.offscreenDeathRows:this.player.y>=LIFE_FLOW.deathArcEndFeetY)this.loseLife=true;return;
  }
  if(this.phase==='pipe'){
   // Initial automatic entry uses FetchNewGameTimerFlag: its level clock is
   // initialized by the destination header, rather than carried across rooms.
   if(!this.area.autoWalk)this.gameTimerStep(false);
   if(!this.area.autoWalk)this.tickIntervalTimers(); // intro-pipe NMIs are already accounted by nativeAutoWalkAreaLoad
   this.restoreStarMusic();
   const automatic=this.destination&&this.destination.frames>64;
   if(this.destination?.direction==='down'){
    if(this.pipeTimer>0){
     const previousCamera=this.camera,oldFeet=this.player.y;
     this.sideCollisionTimer=Math.max(0,this.sideCollisionTimer-1);
     const n={y:(Math.floor(this.player.y)-32)&255,change:this.pipeTimer,camera:this.camera,xScroll:this.playerXScroll,platformScroll:this.platformScroll&255};
     const scroll=nativeVerticalPipe(n,this.waterScrollX,this.sideCollisionTimer,this.areaControls.locked);
     this.player.y=n.y+32+this.player.y-Math.floor(this.player.y);this.camera=n.camera;this.playerXScroll=n.xScroll;this.platformScroll=n.platformScroll;this.pipeTimer=n.change;
     if(this.pipeTimer)this.updatePipeWorld(previousCamera,oldFeet,scroll);
    }
   }
   else if(this.destination?.direction==='right'){if(this.pipeTimer>0){
    const previousCamera=this.camera,oldFeet=this.player.y,oldX=this.player.x;this.sidePipeStep();
    this.sideCollisionTimer=Math.max(0,this.sideCollisionTimer-1);
    const n={camera:this.camera,xScroll:(Math.floor(this.player.x)-Math.floor(oldX))&255,platformScroll:this.platformScroll&255};
    const scroll=nativeSavedScroll(n,this.waterScrollX,this.sideCollisionTimer,this.areaControls.locked);
    this.camera=n.camera;this.playerXScroll=n.xScroll;this.platformScroll=n.platformScroll;
    if(this.pipeTimer)this.updatePipeWorld(previousCamera,oldFeet,scroll);
   }}
   else if(!automatic||this.phaseFrame<=TRANSITIONS.pipeMotionFrames){
    if(this.destination?.direction==='right')this.player.x+=automatic?TRANSITIONS.pipeMotionSpeed:0.5;else this.player.y+=this.destination?.direction==='up'?-0.5:(automatic&&this.player.size===0?1:0.5);
   }
   if(this.destination?.direction!=='down'&&this.destination?.direction!=='right')this.updateBubbles(true,false);
   if(this.verticalPipeGraphics)this.updateLocomotionPose(this.player.grounded,this.motor.absolute,false,new Set<Button>(),false);
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
     this.phase='play';this.updateBubbles(false,false);this.updateWaterEntryEnemies();
    }
    this.phaseFrame=0;
   }
   return;
  }
  if(this.phase==='castle'){this.updateCastle();this.restoreStarMusic();return;}
  if(this.phase==='flag'){this.gameTimerStep(false);this.tickIntervalTimers();const wasGrounded=this.player.grounded,oldFeet=this.player.y,previousCamera=this.camera,previousArea=this.area;this.updateFlag();if(this.phase==='flag'&&this.area===previousArea){this.updateFlagPlatforms(oldFeet,previousCamera);this.updateLocomotionPose(wasGrounded,this.motor.absolute,false,new Set<Button>(['right']));}this.restoreStarMusic();return;}
  if(this.powerChange){
   this.lifeFrozen++;const next=nativeTransformStep(this.powerChange.kind,this.powerChange.remaining);this.powerChange.remaining=next.remaining;
   if(next.done){this.player.size=this.powerChange.to;this.powerChange=undefined;this.resumeWorldAfterTransform();}
   else{this.emergeFrozenNativePowerups();this.updateBubbles(false,false);}
   return;
  }
  this.gameTimerStep(false); // NMI precedes player/actor routines, including automatic entrances.
  this.parserVramBusy=false;
  this.platformFrame++;
  if(this.area.autoWalk&&this.phaseFrame<=TRANSITIONS.autoWalkDelayFrames)return;
  if(this.pipeRise>0){this.updatePipeRise();return;}
  const entry=this.area.entryFall;
  // Native underground entry (rows 2500..2551 of 1-2): fall physics and control timing count steps since the area load.
  const nativeEntry=this.entryFalling?entry?.native:undefined;
  // Native PlayerEntrance (engine $0E=7, AltEntranceControl!=2): while Mario's y ($CE) is above $30 it runs AutoControlPlayer with the pad nulled; the first step
  // that starts at y>=$30 is PlayerRdy (engine 8 set, no movement, timer 401->400) and the pad read from the next step drives Mario (1-2 native 366/367, 4-2 368/369
  // in the v2 RAM-trace replays, which feed each pad on its native read row with an empty queue). A queued pad trails its native read by queue length - 1 rows
  // (recorded-route convention, tests/native-entry-timeline.test.ts), so the pads applied that many rows after PlayerRdy were still read on ignored rows.
  // With a queued pad (the same input lag) the row after the landing still takes the air step (native row 51: +152, then +228); an empty queue steps on the ground at once.
  const entryLag=this.entryInputLag??Math.max(0,this.inputs.length-1),landingGrace=this.entryLanding&&entryLag>0;this.entryLanding=false;
  if(nativeEntry){this.entryFallAge++;if(this.entryReadyAge<0&&this.player.y-32>=48)this.entryReadyAge=this.entryFallAge;
   if(this.entryReadyAge<0||this.entryFallAge<=this.entryReadyAge+entryLag)b=new Set<Button>();}
  else if(this.entryFalling){
   this.entryFallAge++;if(this.entryFallHidden&&!this.swimActive){if(this.entryFallAge>entry!.enemyDelay)this.updateEnemies(this.player.y);return;}
   if(this.waterEntryStanding&&!this.swimActive){this.updateEnemies(this.player.y);return;}
   if(this.player.y>=entry!.controlFeetY){
    this.entryInputDelay=this.entryInputDelay<0?entry!.inputDelay:Math.max(0,this.entryInputDelay-1);
    this.entryTimerDelay=this.entryTimerDelay<0?entry!.timerDelay:Math.max(0,this.entryTimerDelay-1);
   }
   if(this.level.id==='1-1'&&this.area.id==='bonus-coins'&&this.player.size===0&&this.entryFallAge===13)this.entryTimerDelay=0;
   if(this.entryInputDelay!==0)b=new Set<Button>();
  }
  // Automatic entry engines suppress digits; their NMI counter still advances above.
  if(this.waterEntryTimerHold>0&&this.player.y-32>=48)this.waterEntryTimerHold--;
  if(nativeEntry&&this.entryReadyAge>=0){this.entryTimerDelay=0;this.entryInputDelay=0;}
  this.piranhaTouchFeetY=undefined;
  const p=this.player,nativeStateZero=this.powerupStateZero;this.powerupStateZero=false;if(nativeStateZero)p.grounded=true;const oldBottom=p.y;const oldX=p.x;const scrollLocked=this.areaControls.locked;this.hammerPlayerBox=undefined;const poseGrounded=p.grounded,poseLocked=this.swimLock>0||this.area.theme==='water'&&p.y-32>=NO_INPUT_Y,poseAbsolute=this.area.theme==='water'?this.swimAbsolute:this.motor.absolute,poseEvents=this.events.length;
  let nativeGroundOnly=false;let cameraAttemptX:number|undefined,cameraAttemptVx=0,cameraMotion:number|undefined,springScroll:number|undefined,waterScroll:number|undefined,waterBoundsShift=0,waterBoundsVx:number|undefined;
  if(this.blockBounceTimer>0)this.blockBounceTimer--;p.invincible=Math.max(0,p.invincible-1);p.duck=this.nextDuck(this.area.autoWalk?new Set<Button>(['right']):b);this.finishBrickBreak(); // the entrance walk (engine 7) replaces the controller before the crouch check (4-2 rows 4..: Down held, native shows walk frames)
  if(this.area.autoWalk)b=new Set<Button>(['right']);
  this.nativePlayerAB=(b.has('a')?128:0)|(b.has('b')?64:0);
  this.wallSpeed=undefined;
  this.growVines();const vineMovement=this.moveOnVine(b,pressed('a'));if(vineMovement==='transition')return;
  if(!vineMovement){
  const direction=Number(b.has('right'))-Number(b.has('left'));
  const water=this.area.theme==='water';
  // The fitted float path below runs only in water and in non-native entry falls, where the run step never applies.
  const running=false;
  {const speedByte=Math.floor(Math.round(p.vx*4096)/256);if(speedByte!==0)this.movingDir=speedByte>0?1:-1;}
  const max=water?(p.grounded?WATER_PHYSICS.groundMax:WATER_PHYSICS.swimMax):(p.grounded?(pressed('a')?Math.abs(p.vx)>PHYSICS.walkMax:running):this.airRunning)?PHYSICS.runMax:PHYSICS.walkMax;
  // Native horizontal motor (src/native-player-motor.ts): the native speed bytes in 1/4096 px, stepped every land frame; water and
  // non-native entry falls keep the fitted float rules below. p.vx is always motor speed / 4096, so outside writes stay exact.
  const useMotor=!water&&(!this.entryFalling||Boolean(nativeEntry));
  const swim=water&&this.swimActive;
  if(useMotor)this.motor.speed=Math.round(p.vx*4096);
  const jumpClassByte=this.motor.absolute; // native InitJS reads Player_XSpeedAbsolute, last written by the previous frame's ImposeFriction (a wall stop leaves it)
  if(swim){this.swimStep(b,pressed('a'),direction);}else if(useMotor){
   // The automatic pipe walk is a held-right press under GameEngineSubroutine 7, whose right cap is speed byte 12.
   const motorGround=(p.grounded||this.springTimers.size>0)&&!landingGrace,motorJump=pressed('a')&&p.grounded&&!this.springTimers.size;
   if(motorGround&&!motorJump)this.playerAnim.setSpeed(this.motor.absolute); // OnGroundStateSub: GetPlayerAnimSpeed reads the speed before this frame's friction
   p.vx=this.motor.step({direction:direction as -1|0|1,ground:motorGround,jump:motorJump,b:b.has('b'),down:b.has('down'),
    buttons:(['b','select','start','up','down','left','right'] as Button[]).some(k=>b.has(k)),capRight:this.area.autoWalk?TRANSITIONS.autoWalkCapByte:undefined})/4096;
   if(direction&&!(b.has('down')&&p.grounded)&&!(p.duck&&p.grounded))p.facing=direction;
  }else if(direction&&!(p.duck&&p.grounded)&&(!b.has('down')||!p.grounded)){
   const opposite=p.vx*direction<0;if(opposite)this.skidAccel=water?WATER_PHYSICS.accel*2:p.grounded&&!running&&(this.skidAccel===0.0390625||(!this.skidAccel&&this.braking===PHYSICS.brake))?0.0390625:(!p.grounded||this.skidAccel===0.072265625)?0.072265625:p.grounded&&this.braking<=0.0380859375?0.0546875:0.0625;const accel=opposite?(water?WATER_PHYSICS.reverse:p.grounded?(this.skidAccel===0.0390625?(Math.abs(p.vx)>1?0.0625:0.15625):this.skidAccel===0.072265625?PHYSICS.reverse:this.braking<=0.0380859375?(Math.abs(p.vx)>0.75?0.0703125:Math.abs(p.vx)+0.0625):(Math.abs(p.vx)>0.75?0.0947265625:Math.abs(p.vx)+0.0625)):this.airRunning?0.052734375:PHYSICS.walkAccel):(this.skidAccel===0.0625&&Math.abs(p.vx)>0.5?0.0537109375:this.skidAccel)|| (water?WATER_PHYSICS.accel:(p.grounded?running:this.airRunning)?PHYSICS.runAccel:PHYSICS.walkAccel);
   p.vx=direction>0?Math.min(max,p.vx+accel):Math.max(-max,p.vx-accel);p.facing=direction;this.braking=water?WATER_PHYSICS.brake:(!p.grounded||this.skidAccel===0.072265625)?(running||(!p.grounded&&this.airRunning)?0.04931640625:PHYSICS.brake):!opposite?(running?(Math.abs(p.vx)>1.75?0.04931640625:0.0380859375):PHYSICS.brake):running&&Math.abs(p.vx)>1.75?0.04931640625:this.braking;
  }else if(p.grounded&&(water||(!pressed('a')&&this.hasSupportAt(p.x+Math.sign(p.vx)*Math.floor(Math.abs(p.vx)*32)/32,p.y)))){const downSpeedBeforeBrake=p.vx;const skidCoast=!water&&!b.has('down')&&this.skidAccel>0&&this.skidAccel!==0.072265625&&p.vx*p.facing<0;if(!skidCoast)this.skidAccel=0;if(!water&&b.has('down')&&Math.abs(p.vx)<=1.6875)this.braking=PHYSICS.brake;p.vx=Math.sign(p.vx)*Math.max(0,Math.abs(p.vx)-(skidCoast?0.07421875:water?WATER_PHYSICS.brake:b.has('down')?(Math.abs(p.vx)>1.6875?this.braking:PHYSICS.brake):this.braking));if(!water&&b.has('b')&&!b.has('down')&&Math.abs(p.vx)<0.625)p.vx=0;if(this.area.smallPlayerDownStop&&p.size===0&&b.has('down')&&direction*downSpeedBeforeBrake<=0&&Math.floor(downSpeedBeforeBrake*16)>=-10&&Math.floor(downSpeedBeforeBrake*16)<=10)p.vx=0;}
  if(!useMotor&&!water)this.motor.reset(Math.round(p.vx*4096),p.facing<0?-1:1); // a fitted (non-native) entry fall hands the motor the steady-state bytes of its speed
  if(!water&&p.grounded)this.airRunning=Math.abs(p.vx)>PHYSICS.walkMax;
  if(water){
   if(pressed('a')){this.waterEntryFall=false;p.grounded=false;this.emit('sfx_swim');}
   if(this.waterEntryFall)p.vy=Math.min(PHYSICS.maxFall,p.vy+WATER_PHYSICS.entryGravity);
   else if(!swim){const next=advanceWater(p.y,p.vy,b.has('a'),pressed('a'),this.waterSurface);p.y=next.y;p.vy=next.vy;}
  }else{
   if(pressed('a')&&p.grounded&&!this.springTimers.size){if(nativeStateZero)p.y=Math.floor(p.y);const jumpSpeed=Math.abs(p.vx);this.runJump=useMotor?jumpClassByte>=25:jumpSpeed>1.5;this.mediumJump=!this.runJump&&(useMotor?jumpClassByte>=16:jumpSpeed>1&&jumpSpeed<=1.5);this.lastJumpFallForce=this.runJump?0.5625:this.mediumJump?0.375:PHYSICS.gravity;this.fallGravity=this.runJump?0.5625:this.mediumJump?0.375:PHYSICS.gravity;p.vy=this.runJump?PHYSICS.runJump:PHYSICS.jump;p.grounded=false;this.jumpArc=true;this.jumpHeld=0;this.landJump='held';if(!b.has('b'))this.braking=PHYSICS.brake;this.emit(p.size?'sfx_jump_big':'sfx_jump_small');}
   // Fresh no-contact release/repress pairs: A cannot restore held gravity.
   if(this.landJump==='held'&&!b.has('a')&&p.vy<0)this.landJump='released';
   this.jumpHeld++;
  }
  // OnGroundStateSub omits vertical motion unless InitJS changed state0 to1.
  nativeGroundOnly=nativeStateZero&&p.grounded&&!swim;
  const nativeFeet=p.y+(swim?this.swimDy-this.water.whirlMoved:0);
  if(water&&nativeFeet>=32&&nativeFeet<288)this.water.horizontalState.collision=255;
  const height=this.height;
  // MovePlayerHorizontally returns the nonzero spring control in A without
  // moving; OnGroundStateSub still stores A as Player_X_Scroll ($06ff).
  springScroll=this.springTimers.values().next().value?.control;
  const motion=springScroll?0:useMotor||swim?motionOf(Math.round(p.vx*4096)):Math.sign(p.vx)*Math.floor(Math.abs(p.vx)*32)/32;cameraAttemptX=p.x+(springScroll??motion);cameraAttemptVx=p.vx;cameraMotion=springScroll??motion;p.x+=motion;if(swim){this.playerXScroll=(Math.floor(p.x)-Math.floor(oldX)+this.platformScroll)&255;waterScroll=this.nativeScrollPreview(oldX,p.x);const beforeBounds=p.x;this.waterScreenBounds(this.camera+waterScroll);waterBoundsShift=p.x-beforeBounds;waterBoundsVx=p.vx;}p.grounded=false;this.headBumped=false;const hammerBoxX=p.x,verticalStep=nativeGroundOnly?0:swim?this.swimDy:nativeEntry&&this.entryFallAge===this.entryReadyAge?0:p.vy,hammerBoxFeet=p.y+verticalStep;this.hammerPlayerBox=nativePlayerBox(hammerBoxX,hammerBoxFeet,p.size,p.duck,this.camera);this.movePlayerY(verticalStep,swim?this.swimHeight(height):height,!water&&(nativeGroundOnly?p.vy:p.vy+this.airGravity(b))<0,nativeGroundOnly?p.vy:this.airGravity(b),true);
  if(!nativeGroundOnly&&!water&&!p.climbing&&p.vy<0&&!this.headBumped)this.platformHeadBump(p.x-motion,this.airGravity(b),this.nativeScrollPreview(oldX,cameraAttemptX??p.x));
  // Native frames back out of a wall one pixel per frame (the contact frame included), not by snapping to the tile edge.
  this.wallBackOut=false;this.motor.clearContacts();if(!nativeBackgroundSkipped(p.y))this.movePlayerX(motion,height,!useMotor&&!swim);this.footPushed=false;
  // Native contacts resume after one masked row (Player_CollisionBits are restored every frame); a zero-motion back-out row masks its side again (movePlayerX).
  // The jump class after a contact reads the stale Player_XSpeedAbsolute (native 4-2 r8m0 row373, 5-2 r8m3 row1325, 7-1 r8m5 row1933).
  // ImpedePlayerMove: the contact zeroes the speed byte (the fraction stays) and masks that side's press on the next frame.
  if(useMotor&&this.wallSpeed!==undefined){this.motor.speed=Math.round(this.wallSpeed*4096);this.motor.contact((Math.sign(this.wallSpeed)||Math.sign(motion)||this.motor.moving||1) as 1|-1,true);p.vx=this.motor.speed/4096;}
  // Swimming uses its own motor: a zero-motion back-out row holds its wall pause too (native 7-2 rows832..835).
  if(swim&&this.wallBackOut)this.water.motor.freeze=Math.max(1,this.water.motor.freeze);
  if(swim){this.swimContact(this.swimDy,oldBottom);if(p.y-this.water.whirlMoved>=288)this.areaControls.locked=true;if(this.swimPull>0&&!(this.water.horizontalState.collision&1))this.swimPull=0;p.x+=this.swimPull;}else if(water&&p.grounded&&!this.entryFalling)this.swimActive=true;
  if(p.grounded){if(!poseGrounded){if(Math.abs(p.vx)<=PHYSICS.walkMax)this.braking=PHYSICS.brake;}this.fallingThroughCastleLava=false;this.jumpArc=false;this.bouncing=false;this.runJump=false;this.mediumJump=false;this.landJump='inactive';this.waterEntryFall=false;this.entryLanding=Boolean(nativeEntry);this.entryFalling=false;this.waterSurface={active:false,contacted:false};}
  if(this.entryFalling&&nativeEntry){if(this.entryFallAge>=nativeEntry.gravityStartAge&&this.entryFallAge!==this.entryReadyAge){p.vy+=entry!.gravity;if(p.vy>=nativeEntry.resetAt)p.vy=nativeEntry.resetTo;}}
  else if(this.entryFalling){if(entry!.gravityBeforeControl||p.y>=entry!.controlFeetY)p.vy=Math.min(entry!.maxFall,p.vy+entry!.gravity);}
  else if(nativeGroundOnly){if(!p.grounded){this.walkingOff=true;this.jumpArc=false;this.jumpPose=false;this.bouncing=false;this.landJump='released';}}
  else if(this.walkOffFall()){}
  else if(this.area.theme!=='water'&&!p.grounded&&!this.headBumped)p.vy=this.nativeFallCap(p.vy+this.airGravity(b));
  if(!water&&p.x<this.camera){
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
  let springJumped=false;this.platformEjection=0;const xBeforePlatforms=p.x;if(!p.climbing){this.updatePlatforms(oldBottom,this.nativeScrollPreview(oldX,cameraAttemptX??p.x));springJumped=this.updateSprings(oldBottom,b.has('a'));if(!springJumped&&!nativeGroundOnly)this.walkOffStart(poseGrounded);}
  if(p.grounded)this.stompChain=0;
  // GameCoreRoutine returns before GameEngine when HandleAxeMetatile switches to victory task0.
  if(this.axeFootContact()){
   this.camera+=this.nativeScrollPreview(oldX,cameraAttemptX??p.x);this.sideCollisionTimer=Math.max(0,this.sideCollisionTimer-1);
   if(Math.floor(p.x)>this.camera+239)p.x=this.camera+239+p.x-Math.floor(p.x);
   this.tickIntervalTimers();this.playerAnim.tick();this.beginCastle();return;
  }
  this.updateBubbles();this.updateGenerators();this.lakituScroll=this.nativeScrollPreview(oldX,cameraAttemptX??p.x);this.hammerPlayerBox??=nativePlayerBox(p.x,p.y,p.size,p.duck,this.camera);if(this.hammerPlayerBox){this.hammerPlayerBox[0]=(this.hammerPlayerBox[0]-this.lakituScroll)&255;this.hammerPlayerBox[2]=(this.hammerPlayerBox[2]-this.lakituScroll)&255;}this.updateEnemies(oldBottom);this.updateItems();this.restoreStarMusic();
  let jumped=springJumped;for(let i=poseEvents;i<this.events.length;i++)if(this.events[i]==='sfx_jump_small'||this.events[i]==='sfx_jump_big')jumped=true;
  this.updateLocomotionPose(poseGrounded,poseAbsolute,jumped,poseLocked?new Set():b); // the uncontrolled water entry (engine 7) and the water bottom (PlayerCtrlRoutine DisJoyp, y >= $d0) replace the controller: 2-2 rows 352..386 and 1393.. keep swim frame 0 with A down
  const wallDisplay=poseGrounded&&p.grounded&&p.size===0&&this.area.theme==='ground'&&this.camera===0&&p.x===this.camera&&b.has('left')&&!b.has('right')&&this.locomotionPose.kind!=='jump';
  if(wallDisplay){
   if(!this.wallDisplayPose){this.wallDisplayPose={kind:'walk',frame:this.locomotionPose.frame,facing:this.locomotionPose.facing};this.wallDisplayTimer=this.playerAnim.timer;}
   else{this.wallDisplayTimer=Math.max(0,this.wallDisplayTimer-1);if(this.wallDisplayTimer===0){this.wallDisplayPose.frame=(this.wallDisplayPose.frame+1)%3;this.wallDisplayTimer=7;}this.wallDisplayPose.facing=this.locomotionPose.facing;}
  }else this.wallDisplayPose=undefined;
  for(const [key,age]of this.bump){if(age>=16){this.bump.delete(key);this.usedBlockRehits.delete(key);}else this.bump.set(key,age+1);}
  this.collectTiles();
  // Advance existing motors before collision. New viewport entries are handled
  // after the ordinary camera commits, so their first increment is not delayed.
  if(this.phase==='play')this.firebarSlots?.step(this.camera);
  const inactiveFirebars=[...this.firebarMotors].filter(([,motor])=>!motor.state.active);
  if(this.phase==='play')for(const [bar,motor]of this.firebarMotors)if(motor.state.active)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
  if(!p.dead&&this.area.fallExit&&p.vy>=0&&p.y>this.area.fallExit.belowY){const exit=this.area.fallExit;this.enterArea(exit.to,exit.spawn,exit.camera);return;}
  // PlayerHole keeps engine 8 and ordinary movement through the offscreen fall. Only page 6 selects PlayerLoseLife (engine 6).
  // Native coordinates have page 1 on screen: remake feet 288 is page 2, and 1312 is page 6.
  if(this.area.theme!=='water'&&oldBottom>=288&&Math.floor(p.x)>this.camera+239){p.x=this.camera+239+p.x-Math.floor(p.x);p.vx=(Math.round(p.vx*4096)&255)/4096;}
  if(p.y>=LIFE_FLOW.pitEndFeetY){this.die(this.fallingThroughCastleLava,!this.fallingThroughCastleLava);this.loseLife=true;return;}
  if(oldBottom>=288&&!this.pitMusic){this.pitMusic=true;this.emit('event_death');}
  const lava=this.tileAt(p.x+8,p.y-1);if(this.area.theme==='castle'&&!p.grounded&&(lava===134||lava===135))this.fallingThroughCastleLava=true;else if(this.area.theme!=='water'&&this.area.theme!=='castle'&&(lava===134||lava===135))this.die();
  if(this.area.checkpoint&&p.x>=this.area.checkpoint.activationX){this.checkpoint=true;this.activatedCheckpointArea=this.area.id;}
  const previousCamera=this.camera,attemptX=cameraAttemptX??p.x;
  // ProcessWhirlpools runs after native ScrollHandler; its trailing x pull is not a side-wall stop.
  const cameraContact=springScroll===undefined&&(cameraMotion??p.x-oldX)>0&&(attemptX+waterBoundsShift>xBeforePlatforms-this.swimPull+1e-7||(waterBoundsVx??cameraAttemptVx)>0&&p.vx===0||this.wallSpeed!==undefined&&this.wallSpeed>0);
  // Native ScrollHandler (fitted on all 32 v2 traces: 113,240 of 113,311 play frames, the rest are castle-loop resets). Player_X_Scroll is the
  // attempted pixel move before wall ejection plus Platform_X_Scroll, the lift carry of the
  // previous frame (1-3 f574: own 3, carry -1 this frame, scroll 3; f575: own 2 + previous carry -1, scroll 1); screen position, and SideCollisionTimer ($0785, counted down once per frame)
  // are the previous frame's. No scroll below screen x 80; one pixel less than the move below 112 (a 1 px move stays 1).
  this.sideCollisionTimer=Math.max(0,this.sideCollisionTimer-1);
  if(waterScroll!==undefined)this.camera+=waterScroll;
  else{const scrollMove=Math.floor(attemptX)-Math.floor(oldX)+this.platformScroll,screenX=this.area.theme==='water'?this.waterScrollX:Math.floor(oldX)-previousCamera;this.playerXScroll=scrollMove&255;
   if(!scrollLocked&&oldBottom<288&&screenX>=80&&this.sideCollisionTimer===0&&scrollMove>0)this.camera+=screenX>=112||scrollMove<2?scrollMove:scrollMove-1;}
  // The side collision is found after the scroll: the contact frame itself still scrolls (native 1-1 f129: $0785 0 -> 16 with a 2 px scroll).
  // A back-out row is still a side collision natively (4-3 f244..245: $0785 16, 16, 15).
  if(cameraContact||this.wallSpeed!==undefined||this.wallBackOut)this.sideCollisionTimer=16;
  this.platformScroll=Math.floor(p.x)-Math.floor(xBeforePlatforms)-this.platformEjection;
  this.camera=Math.max(previousCamera,Math.min(this.camera,this.area.cameraEnd??this.area.warpZone?.cameraEnd??Math.max(0,this.area.width-256)));
  if(Math.floor(this.camera/32)>Math.floor(previousCamera/32)){this.scrollCrossFrame=this.frame;this.scrollCrossCamera=Math.floor(this.camera/32)*32;}
  this.eraseOffscreenEnemies();this.releaseNativeSprings();this.birthNativeWaterEnemies();this.items=this.items.filter(i=>i.nativePowerState===undefined||i.x>=this.camera-72&&i.x<this.camera+328);
  this.platformMotion.advance(this.platformFrame,this.camera,this.random.frame);this.platformSlotResidues();
  this.passNativeObjects();this.passNativeCannons();this.passNativeFrenzy();this.updateSwimGenerator();this.passNativeCastleFlames();
  this.gateNativePlatforms(previousCamera);this.busyNativeSlots(); // register newly eligible platforms on their native birth row
  for(const popup of this.popups)if(popup.age===0)popup.x+=previousCamera-this.camera;
  // The observed sky rider stops at screen240 as the cloud continues beyond
  // the viewport. The ordinary camera boundary also applies off platforms.
  if(this.area.theme!=='water'&&oldBottom>=288&&Math.floor(p.x)>this.camera+239){p.x=this.camera+239+p.x-Math.floor(p.x);p.vx=(Math.round(p.vx*4096)&255)/4096;}
  else if(this.area.theme!=='water'&&oldBottom<288&&scrollLocked&&Math.floor(p.x)>this.camera+239){p.x=this.camera+239+p.x-Math.floor(p.x);if(!(b.has('left')&&!b.has('right'))){p.vx=(Math.round(p.vx*4096)&255)/4096;this.motor.speed=Math.round(p.vx*4096);}}
  else if(this.area.theme!=='water'&&oldBottom<288&&!scrollLocked&&p.x>this.camera+240){p.x=this.camera+240;p.vx=Math.min(0,p.vx);}
  if(this.phase==='play'){
   if(this.piranhaColumns){this.piranhaColumns.step(this.camera);this.birthParserPiranhas();}
   this.firebarSlots?.cameraEntry(previousCamera,this.camera);
   for(const [bar,motor]of inactiveFirebars)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
   for(const bar of this.area.firebars??[])this.collideFirebar(bar); // after the scroll: native flames are placed against this frame's screen left
  }
  // RenderPlayerSub caches $0755 before ProcessWhirlpools. Injury's odd
  // FrameCounter rows return before that write, as in PlayerGfxHandler.
  if(!p.invincible||!(this.random.frame&1))this.waterScrollX=(Math.floor(p.x-(this.area.theme==='water'&&this.swimActive?this.swimPull:0))-Math.floor(this.camera))&255;
  this.parserLoaderWasBlocked=this.parserClock.blocked;
  this.advanceNativeAreaParser(this.camera-previousCamera);
  if(this.player.dead)return;
  const warp=this.area.warpZone;
  if(warp&&!this.warpZoneActive&&this.camera>=warp.activateAtCamera){
   this.warpZoneActive=true;
   // ScrollLockObject_Warp calls KillEnemies(PiranhaPlant), independent of a fitted artwork x.
   this.enemies=this.enemies.filter(e=>e.kind!=='piranha'||!this.holdsNativeSlot(e));
  }
  for(const pipe of this.area.pipes??[]){
   if(pipe.requiresWarpActivation&&!this.warpZoneActive)continue;
   // Native 8-4 area-3 pipe: Mario slid along the pipe top with Down+Right held for 14 rows (x 3645..3654) and went in only the row after Right was released.
   const down=pipe.direction==='down'&&b.has('down')&&downPipeFooting(p)&&!downPipeLateralBlocks(poseGrounded,b)&&Math.abs(Math.floor(p.x)+8-pipe.x)<(pipe.entryHorizontalTolerance??(pipe.requiresWarpActivation?9:5))&&Math.abs(p.y-pipe.y)<3;
   // Native side pipes start when a grounded Mario moving right reaches entryTriggerX; the 8-4 water pipe starts with only Down held (momentum).
   // The automatic pipe walk at the start of 1-2/2-2/4-2/7-2 starts it at floor(x)+13>=pipe.x (native rows).
   const side=pipe.direction==='right'&&p.facing===1&&(this.area.autoWalk?b.has('right')&&Math.floor(p.x)+TRANSITIONS.autoWalkPipe.triggerOffset>=pipe.x:pipe.entryTriggerX!==undefined?(b.has('right')||p.vx>0||(this.wallSpeed??0)>0)&&p.grounded&&(Math.floor(p.x)>=pipe.entryTriggerX||(this.wallSpeed??0)>0&&Math.floor(p.x)+1>=pipe.entryTriggerX)&&Math.floor(p.x)<pipe.entryTriggerX+32:b.has('right')&&Math.abs(p.x+14-pipe.x)<3)&&Math.abs(p.y-pipe.y)<12;
   const up=pipe.direction==='up'&&b.has('up')&&Math.abs(p.x+8-pipe.x)<9&&Math.abs(p.y-this.height-pipe.y)<3;
   if(down||side||up){this.phase='pipe';this.phaseFrame=0;this.destination={area:pipe.to,level:pipe.targetLevel,spawn:pipe.spawn,camera:pipe.camera,direction:pipe.direction,frames:(p.size===0?pipe.smallPlayerRoomEntry?.transitionFrames:undefined)??pipe.transitionFrames??64,smallPlayerRoomPreviewFrames:pipe.smallPlayerRoomPreviewFrames,smallPlayerRoomEntry:p.size===0?pipe.smallPlayerRoomEntry:undefined,ordinaryEnemyFrontier:pipe.ordinaryEnemyFrontier,returnCloudOffsetX:pipe.returnCloudOffsetX,riseFrames:pipe.riseFrames};this.pipeTimer=down?0x30:side?(this.camera+this.areaControls.origin*16<256?0xa0:0x34):0;if(up)p.vx=0;p.vy=0;this.emit('sfx_pipe');return;}
  }
  this.updateMaze(oldX);this.nativeLoopCommand();
  const exit=this.area.exit;
  // Native axe contact (tests/native-axe-contact.test.ts): a foot inside the cell while not rising; x+13 stands for the right foot, the left side is kept loose so a remake 1-3 px ahead still reaches it.
  const touchingExit=exit&&(exit.kind==='axe'?this.axeFootContact():exit.kind==='flag'&&flagPoleTouched(p.x,exit.x)&&p.y<193);
  if(exit&&touchingExit){
   this.phase=exit.kind==='axe'?'castle':'flag';this.phaseFrame=0;if(exit.kind!=='axe')p.vx=0;
   this.flagBonus=exit.kind==='flag'?(FLAG_COMPLETION.scoreThresholds.find(t=>p.y<t.feetBelow)?.score??FLAG_COMPLETION.lowestScore):0;
   if(exit.kind==='axe'){this.beginCastle();
   }else {p.x=exit.x-15+(p.x-Math.floor(p.x));this.beginFlag();this.emit('command_silence');this.emit('sfx_flagpole');}
  }
  if(this.phase==='play')this.consumeGameTimer(!this.entryVineActive&&!this.autoVineActive&&!this.area.autoWalk&&!this.entryControlLocked&&!this.entryTimerHidden&&this.waterEntryTimerHold===0);
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
 private enemyCollisionAt(x:number,y:number){
  const spring=this.area.springs?.find(s=>x>=s.x&&x<s.x+16&&y>=s.y-24&&y<s.y+8);
  if(spring)return {x:spring.x,y:spring.y-24+Math.floor((y-spring.y+24)/16)*16,width:16,height:16,id:y<spring.y-8?0x67:0x68};
  return this.collisionAt(x,y);
 }
 private enemySolid(x:number,y:number){return this.enemyCollisionAt(x,y)!==undefined;}
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
 private axeFootContact(){
  const p=this.player,exit=this.area.exit;if(exit?.kind!=='axe'||exit.y===undefined||p.vy<0)return false;
  return Math.floor(p.y)>=exit.y&&Math.floor(p.y)<exit.y+16&&[3,12].some(dx=>Math.floor(p.x)+dx>=exit.x-8&&Math.floor(p.x)+dx<exit.x+8);
 }
 private sideTileAt(x:number,y:number){
  const tile=this.collisionAt(x,y);if(tile)return tile;
  if(this.tileAt(x,y)===197)return {x:Math.floor(x/16)*16,y:Math.floor(y/16)*16,width:16,height:16,id:197};
 }
 /** ScrollHandler/ChkPOffscr runs before BG collision and late whirlpool pull. */
 private waterScreenBounds(camera:number){
  const p=this.player,left=Math.floor(camera),bits=nativeMiscOffscreen(Math.floor(p.x),0,left)&15;
  const edge=bits&8?0:bits&2?1:undefined;if(edge===undefined)return;
  p.x=left+(edge?239:0)+p.x-Math.floor(p.x);
  if(this.water.steering!==(edge?2:1))p.vx=(Math.round(p.vx*4096)&255)/4096;
 }
 private movePlayerX(dx:number,h:number,snap=true){
  const p=this.player;
  if(this.footPushed||this.axeFootContact())return;
  if(this.swimActive){this.swimSideWall(dx,h);return;}
  if(dx===0){
   for(const y of[p.y-h+4,p.y-8]){
    if(this.sideTileAt(p.x+13,y)){if(this.swimActive)this.water.blockSide(1);p.x--;this.wallBackOut=true;this.motor.contact(1,false);return;}
    if(this.sideTileAt(p.x+2,y)){if(this.swimActive)this.water.blockSide(-1);p.x++;this.wallBackOut=true;this.motor.contact(-1,false);return;}
   }
   return;
  }
  const edge=p.x+(dx>0?13:2);
  for(const y of[p.y-h+4,p.y-8]){const tile=this.sideTileAt(edge,y)??this.springSideAt(edge,y);if(tile){
   if(this.swimActive)this.water.blockSide(Math.sign(dx));
   const fraction=p.x-Math.floor(p.x);if(snap)p.x=(dx>0?tile.x-13:tile.x+tile.width-2)+fraction;else p.x-=Math.sign(dx);this.wallSpeed=p.vx;p.vx=0;return;
  }
  }
 }
 /** Native DoPlayerSideCheck/ImpedePlayerMove uses the ordinary-pass Y and
  * left-before-right order, independent of the current movement direction. */
 private swimSideWall(dx:number,h:number){
  if(this.swimFootWall(dx))return;
  const p=this.player,feet=p.y-this.water.whirlMoved,lowY=(Math.floor(feet)-32)&255;
  for(const side of [-1,1]){
   const x=p.x+(side<0?2:13);
   if(!((lowY>=32&&this.sideTileAt(x,feet-h+4))||(lowY>=8&&this.sideTileAt(x,feet-8))))continue;
   this.water.blockSide(side);
   const speedByte=Math.floor(p.vx*16);
   if(side<0?speedByte>0:speedByte<0)return;
   p.x-=side;this.wallSpeed=p.vx;p.vx=0;if(dx===0)this.wallBackOut=true;
   return;
  }
 }
 /** A swimmer that is not rising is also stopped by its feet, at the landing probes, once they are SWIM_WALL_DEPTH or more inside a tile (shallower it lands on top; rising it passes: 2-2 pillar branch probe, the block falls on the first row with speed >= 0). */
 private swimFootWall(dx:number){
  const p=this.player,y=Math.floor(p.y-this.water.whirlMoved),lowY=(y-32)&255;
  if(this.water.contactSpeed<0||lowY>=0xcf||(y&15)<SWIM_WALL_DEPTH||![3,12].some(x=>this.collisionAt(p.x+x,y)))return false;
  // DoFootCheck uses Player_MovingDir even when the speed byte is zero.
  const dir=Math.sign(dx)||this.marioMotion||-1;
  this.water.blockSide(dir);p.x-=dir;this.wallSpeed=p.vx;p.vx=0;if(dx===0)this.wallBackOut=true;
  return true;
 }
 // Native head bump of a small Mario in the air (rows in tests/native-head-bump.test.ts): the head probe sits 14 px above the feet (the legacy snap bump probes 12) and only acts while the
 // speed after this frame's gravity is still upward (a jump that merely touches a ceiling at its apex is no bump); the position is NOT snapped, the speed becomes 1 (0 for a hit block: brick,
 // question, used) plus the fraction of the speed after this row's gravity (see bumpHead), the jump class (gravity 0.5625/0.375/0.4375, cap) is kept and that frame takes no gravity step.
 // Native ImposeGravity cap (MovePlayerVertically, maximum speed 4): after the gravity step a speed byte of 4 or more whose move force is 128 or more
 // becomes exactly 4.0 (force 0). One rule for every airborne frame, jump, walk-off and stomp bounce alike: 3.96875 -> 4.53125 moves 4 (17 of 17
 // route rows); 4.4375 + 0.5625 = 5.0 keeps 5 one row (fall bytes 3 3 4 5 4); 4 + 0.4375 = 4.4375 stays (3-2 v2 row 475 after a stomp bounce:
 // speed 4, force 80; the old 4.125 cap of non-jump falls moved 4 instead of 5).
 private nativeFallCap(v:number){const speed=Math.floor(v);return speed>=4&&v-speed>=0.5?4:v;}
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
 // Native stomp sets only the speed byte (Player_Y_Speed) and keeps the move force $433, i.e. the sub-pixel part of the speed after this frame's gravity
 // (8-2 r6 row 106, all 8 moods: y 128,125,122,120,119,118,117 = rise 11; at the fall cap the force is already 0: 1-2 mood0 row 3740 -4,-4,-4;
 // 3-2 v2 row 457: 4 + 112/256 -> -4 + 112/256). The byte is -3 for the EnemyStompedPts kinds (Hammer Bro, Lakitu, Bloober, Cheep Cheeps,
 // Bullet Bills: SMB disassembly EnemyStomped, 3-1 v2 row 924 Hammer Bro 3 + 152/256 -> -3 + 152/256) and -4 for the rest (SBnce).
 private stompBounceVy(vy:number,kind?:string){return (kind!==undefined&&STOMP_SPEED_THREE.includes(kind)?-3:-4)+(vy-Math.floor(vy));}
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
 /** CrouchingFlag: big Mario on the ground holding Down; SaveJoyp drops Up/Down (and Left/Right) when Left or Right is held with it (4-2 rows 403..407: Down+Right on the ground, $0714 stays 0). */
 private nextDuck(b:Set<Button>){const p=this.player,down=b.has('down')&&!b.has('left')&&!b.has('right');return p.size>0&&(p.grounded||this.area.theme==='water'?down&&p.grounded:p.duck);}
 // Native apex landing (free-play rows, 35 of 35 in 256 model runs, remake one row late on all): on the row where the speed after gravity is no longer upward, a Mario still moving
 // up 1 px runs the foot probes, not the head probe, and lands on a floor top his feet are under 5 px into (feet 83 -> 80, 1-3 row 992).
 private apexFootProbe(dy:number,nativeHead:boolean,gravity:number){return dy<0&&gravity>0&&!nativeHead&&this.area.theme!=='water';}
 private movePlayerY(dy:number,h:number,nativeHead=false,gravity=0,cutoff=false){
  const p=this.player,oldY=p.y;p.y+=dy;this.piranhaTouchFeetY=p.y;
  if(cutoff&&nativeBackgroundSkipped(p.y))return;
  const water=this.area.theme==='water',down=water?this.water.contactSpeed>=0:dy>0||(dy===0&&!nativeHead)||this.apexFootProbe(dy,nativeHead,gravity);
  const waterFeet=water?p.y-this.water.whirlMoved:p.y;
  const edge=down?waterFeet:(water?waterFeet:p.y)-(nativeHead?this.nativeHeadProbe(h):h);
  // HeadChk uses PlayerBGUpperExtent and the returned probe low nibble, before the late whirlpool pass.
  if(water&&!down&&(((Math.floor(waterFeet)-32)&255)<(p.size?32:16)||(Math.floor(edge)&15)<4))return;
  for(const x of (down?[p.x+3,p.x+12]:[p.x+8])){
   const tile=this.collisionAt(x,edge,!down&&(this.area.theme==='water'||hiddenBlockBumps(p.y)));
   const pipeTop=down?this.pipeTopAt(x,oldY,edge):undefined;
   if(!tile&&pipeTop===undefined)continue;
   if(tile&&this.area.theme==='water'&&down&&(waterFeet-tile.y>=SWIM_WALL_DEPTH||this.water.contactSpeed<0))continue;
   if(down&&tile&&this.area.theme!=='water'&&Math.floor(p.y)-tile.y>=FOOT_LAND_DEPTH){this.footPush();break;}
   if(down){if(dy!==0)this.landingFraction=p.y-Math.floor(p.y);p.y=tile?.y??pipeTop!;p.vy=0;p.grounded=true;}
   else{if(!tile)continue;
    // Native BlockBounceTimer ($0784, 16 after a block hit, counted down every frame): while it runs a brick, ?-block or hidden block bumps like a
    // solid cell (speed 1 plus the fraction, no hit, no sound; PlayerBGCollision NYSpd; 7-1 v2 row 440: timer 7, speed 1 + 80/256).
    if(nativeHead&&this.blockBounceTimer>0&&isHitBlock(tile.id)&&tile.id!==196){this.bumpHead(dy,1,gravity);break;}
    if(nativeHead)this.bumpHead(dy,isHitBlock(tile.id)&&(p.size===0||tile.id!==196&&!(tile.id>=81&&tile.id<=83))?0:1,gravity);else{if(!water)p.y=tile.y+tile.height+h;p.vy=0.5;this.runJump=false;this.mediumJump=false;}
    if('col' in tile){const wasBroken=this.brokenBrick;this.hitBlock(tile.col!,tile.row!,tile.id);if(nativeHead&&this.brokenBrick&&this.brokenBrick!==wasBroken)this.bumpHead(dy,-2,gravity);}else if('piece' in tile&&tile.piece.interactive&&(tile.id===192||tile.id===196))this.hitBlock(tile.piece.x/16,tile.piece.y/16,tile.id,tile.piece);else this.emit('sfx_bump');
   }break;
  }
 }
 private hitBlock(x:number,y:number,id:number,piece?:TilePiece){
  const key=`${x},${y}`;if(this.bump.has(key))return;this.bump.set(key,0);if(id!==196&&this.area.theme!=='water'&&id<[0x10,0x61,0x88,0xc4][id>>6])this.blockBounceTimer=16;if(id===196&&!piece)this.usedBlockRehits.add(key);
  if(id===96)this.activatedHidden1ups.add(`${this.currentPlayer}/${this.level.id}/${this.area.id}/${key}`);
  const p=this.player;
  // Native CheckTopOfBlock (BumpBlock and BrickShatter): a coin ($C2) right above a bumped block is taken with it, +200 and a coin at once (1-2 v2 row 865: col 59 C2 -> 0, brick 52 -> 23).
  const above=`${x},${y-1}`;if(!piece&&isHitBlock(id)&&id!==196&&this.tiles.get(above)===COIN_TILE){this.tiles.delete(above);this.parserVramBusy=true;this.paletteRemove=true;this.coin();this.spawnNativeAboveBlockCoin(x,y);}
  let bumpedNativeBlock=false;
  if(!this.nativeBlockBounce&&this.area.theme!=='water'&&id<[0x10,0x61,0x88,0xc4][id>>6]){
   bumpedNativeBlock=true;
   const slot=this.blockControl,n=this.nativeBlocks[slot],shatter=Boolean(p.size&&[81,82,83].includes(id));
   Object.assign(n,{x:Math.floor(p.x+8)&~15,y:y*16,state:shatter?0x12:0x11,speed:shatter?-6:-2,force:0});
   if(shatter)Object.assign(this.nativeBlocks[slot+2],{x:n.x,y:n.y+8,speed:-4,force:0});
   this.blockControl^=1;this.nativeBlockBounce=16;
  }
  const nativeBlock=this.nativeBlocks[this.blockControl^1];
  const newNativeBlock=nativeBlock.state>=16&&nativeBlock.x===(Math.floor(p.x+8)&~15);
  if(newNativeBlock){this.blockBackgroundQueue.set(key,null);this.blockUpdateBusy=this.graphicsBuffer1=true;}
  const content=this.area.blockContents?.find(block=>block.col===x&&block.row===y);
  const powerupContent=content&&content.kind!=='vine'&&content.kind!=='multiCoin'&&id!==196?content.kind:undefined;
  if(content?.kind==='vine'&&id!==196){
   const vine=this.vines.find(v=>v.id===content.vineId)!;this.tiles.set(key,196);vine.growing=true;this.specialSlot5.claimVine(x*16,y*16);
   this.vineProgress.set(this.vineKey(vine.id),vine.height);this.emit('sfx_vine_grows');
  }else if(content?.kind==='multiCoin'&&id!==196){
   const expiry=this.multiCoinExpiries.get(key)??multiCoinExpiry(this.frame);
   this.multiCoinExpiries.set(key,expiry);
   if(this.frame>=expiry)this.tiles.set(key,196);
   this.coin();this.spawnNativeBlockCoin(x);
  }else if(powerupContent||id===192||id===193||id===95||id===96||id>=85&&id<=94){
   let item:Item['kind']='coin';
   if(id===193||id===85||id===90)item=p.size?'flower':'mushroom';
   if(id===96||id===89||id===94)item='1up';
   if(id===87||id===92)item='star';
   if(powerupContent)item=powerupContent==='powerup'?(p.size?'flower':'mushroom'):powerupContent;
   if(piece)piece.id=196;else this.tiles.set(key,196);
   if(item==='coin'){this.coin();this.spawnNativeBlockCoin(x);}
   else {this.specialSlot5.claimPowerup(x*16,y*16-8);this.items=this.items.filter(i=>i.nativePowerState===undefined);this.items.push({kind:item,x:x*16,y:y*16,vx:item==='flower'?0:1,vy:0,age:0,life:2000,emerging:POWERUPS.powerupEmergenceNativeFrames.value,nativePowerState:1});this.emit('sfx_powerup_appears');}
  }else if((id===81||id===82||id===83)&&p.size){
   this.brokenBrick={key,rows:0};this.score+=50;this.emit('sfx_brick_shatter');
   for(let i=0;i<4;i++)this.items.push({kind:'debris',x:x*16+(i%2)*8,y:y*16+Math.floor(i/2)*8,vx:(i%2?1:-1)*1.5,vy:i<2?-4:-2,age:0,life:60});
  }else this.emit('sfx_bump');
  if(newNativeBlock){const old=this.blockGraphics.findIndex(b=>b.slot===nativeBlock.slot);if(old>=0)this.blockGraphics.splice(old,1);this.blockGraphics.push({slot:nativeBlock.slot,key,x:nativeBlock.x,y:y*16,metatile:this.brokenBrick?.key===key?0:(piece?.id??this.tiles.get(key)??0),pictureY:undefined,replace:nativeBlock.state===0x12});}
  // EnemyToBGCollisionDet only stuns a walker when BumpBlock wrote $23.
  // Solid tree/stone head contact does not create that native marker.
  if(bumpedNativeBlock)for(const e of this.enemies)if(e.active&&!e.dead&&e.kind!=='blooper'&&!(e.kind==='cheep'&&e.swim)&&Math.abs(e.y-y*16)<3&&Math.abs(e.x-x*16)<18){e.dead=1;e.vy=-3;this.floateyScore(100);}
 }
 /** ProcessPlayerAction (src/player-anim.ts): the pose kind and frame from the native Player_State at the end of the frame (ground, jump,
  * walk-off fall), the speed byte, Left/Right (dropped by Down on the ground), Player_XSpeedAbsolute and the moving/facing directions. */
 private updateLocomotionPose(wasGrounded:boolean,absolute:number,jumped:boolean,buttons:Set<Button>,refreshSpeed=true){
  const p=this.player,pose=this.locomotionPose,anim=this.playerAnim;anim.tick();this.playerAnimNmiTimer=anim.timer;this.playerAnimNmiCtrl=anim.ctrl;
  if(anim.fresh){anim.fresh=false;if(!jumped)anim.setSpeed(absolute);} // JumpSwimSub bypasses GetPlayerAnimSpeed on a first-frame ground jump; the cleared reload stays 0 until landing
  const water=this.area.theme==='water';
  pose.facing=water?p.facing:this.motor.facing; // the sprite flip is PlayerFacingDir, which on land only a ground press changes (1-2 row 484: Left pressed on the landing row, still drawn facing right)
  if(jumped)this.jumpPose=true;
  if(p.climbing){if(this.phase==='flag'){anim.setClimb(p.vy);this.climbPoseFrame=Math.floor(p.vy)!==0?anim.animate(2):anim.still();}return;}
  if(p.invincible&&this.random.frame&1)return; // PlayerGfxHandler returns at once on odd FrameCounter rows while the injury timer runs
  if(this.powerChange)return; // DoChangeSize replaces ProcessPlayerAction
  if(p.grounded&&!jumped){
   this.jumpPose=false;
   const lr=buttons.has('down')&&wasGrounded?0:Number(buttons.has('right'))|Number(buttons.has('left'))<<1;
   if(water&&refreshSpeed)anim.setSpeed(absolute); // OnGroundStateSub on the water floor (the land motor sets it otherwise)
   const m=water?{speed:Math.round(p.vx*4096),absolute:Math.abs(Math.floor(Math.round(p.vx*4096)/256)),moving:Math.sign(p.vx),facing:p.facing}:this.motor;
   const byte=Math.floor(m.speed/256)&255;
   if(p.duck||byte===0&&lr===0){pose.kind='stand';anim.still();}
   else if(m.absolute>=9&&m.moving!==m.facing){pose.kind='skid';anim.still();}
   else{pose.kind='walk';pose.frame=anim.animate(3);}
  }else if(water&&this.swimActive){
   // JumpSwimSub (ProcSwim) runs GetPlayerAnimSpeed every swimming frame; ActionSwimming animates while the swim timer runs, the frame is
   // not 0 or A is held.
   if(refreshSpeed)anim.setSpeed(absolute);
   pose.kind='jump';this.swimPoseFrame=this.water.timer||anim.ctrl||buttons.has('a')?anim.animate(3):anim.hold();
  }else if(this.jumpPose||p.duck){pose.kind='jump';anim.still();}
  else{pose.kind='walk';pose.frame=anim.hold();} // a walk-off fall keeps its walking frame and facing
 }
 /** Native-exact swimming (src/native-water.ts) starts with the room unless the legacy entry fall still plays (5-2, 6-2). */
 private startSwim(spawnAtEntry:boolean,arrival=false){
  const area=this.area,p=this.player,w=this.water;w.reset();this.swimActive=false;this.swimLock=0;this.swimDy=0;this.swimAbsolute=0;
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
 /** One swimming frame: vertical pass, horizontal speed and whirlpool pull (the movement itself is applied by update()). */
 private swimStep(b:Set<Button>,pressedA:boolean,direction:number){
  const p=this.player,w=this.water;
  this.swimPull=0;
  if(this.swimLock===1){this.swimLock=0;this.swimDy=0;this.entryTimerDelay=0;this.entryInputDelay=0;return;}
  if(this.swimLock===3){this.swimLock=2;this.swimDy=0;return;}
  // The entry fall is uncontrolled until the player reaches native y 49; one more frame passes before the first input counts.
  // Below the map the controller no longer acts: the speed is kept and the fall goes on.
  const locked=this.swimLock===2,noInput=locked||p.y<32||p.y-32>=NO_INPUT_Y,held=!noInput&&b.has('a'),dir=(noInput?0:direction) as Direction;this.swimDirection=dir;
  const heldBefore=held&&!pressedA&&!this.swimFreshA;if(held&&!pressedA&&this.swimFreshA)this.emit('sfx_swim');if(!locked)this.swimFreshA=false;
  w.motor.speed=Math.round(p.vx*4096);
  const bits=noInput?0:(b.has('a')?1:0)|(b.has('b')?2:0)|(b.has('select')?4:0)|(b.has('start')?8:0)|(b.has('up')?16:0)|(b.has('down')?32:0)|(b.has('left')?64:0)|(b.has('right')?128:0);
  const horizontal=w.horizontalSource(bits,p.grounded,w.canStroke(held,heldBefore,p.grounded));
  p.vx=horizontal.speed/4096;this.swimAbsolute=horizontal.absolute;p.facing=horizontal.facing===1?1:-1;
  this.marioMotion=horizontal.moving===1?1:horizontal.moving===2?-1:0;
  // Whirlpool membership is tested where this frame's move lands (the other capture phase tests where it starts).
  const probe=Math.floor(w.whirlFirst?p.x:p.x+motionOf(Math.round(p.vx*4096)));
  const zone=whirlpoolAt(this.whirlpools,probe);
  const step=w.vertical(held,heldBefore,p.y-32,p.grounded,!!zone);
  // ProcessWhirlpools pulls on odd native FrameCounter rows. The helper uses even sample indices; the counter can change parity across a life load.
  const pull=whirlpoolPull(zone,w.whirlFirst||w.pullFromStart?Math.floor(p.x):probe,this.random.frame+1+(w.whirlFirst?1:0),w.whirlFirst||w.pullFromStart);
  // PPU rows show a trailing pull after tile contact; a zero-motion back-out skips it (native7-2 rows1429..1434).
  if(w.whirlFirst||w.pullFromStart)p.x+=pull;else this.swimPull=pull;
  this.swimDy=step.dy;
  if(locked&&p.y-32+step.dy>=49)this.swimLock=1;
 }
 /** Contact results of the swimming move: a landing clears the vertical speed, a head bump turns it around, a wall keeps the fraction. */
 private swimContact(dy:number,oldY:number){
  const p=this.player,w=this.water;
  // A rising frame that happens not to move (dy 0) is not a landing even with a tile top at the feet.
  if(dy===0&&w.speed<0)p.grounded=false;
  // A head bump keeps the position the move reached (no clamp to the tile) and only turns the speed around. Inside a whirlpool zone the bump
  // falls between the ordinary pass and the trailing whirlpool pass, which is redone at speed 1 (2-2/7-2 free-play strokes under a ceiling
  // in a zone: the swimmer does not move on the bump row, 172 of 177; outside a zone it moves, 338 of 338).
  if(p.grounded)w.land();else if(w.contactSpeed<0&&p.vy===0.5){p.y=oldY+dy;p.y+=w.bump();}else if(w.speed<0&&this.swimUnderLift()){p.y+=w.bump();}
  if(this.wallSpeed!==undefined)p.vx=w.wall(Math.round(this.wallSpeed*4096),this.swimDirection===0||this.swimDirection*this.wallSpeed>0)/4096;
  p.vy=p.grounded?0:w.speed+w.force/256;
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

 /** Rendering and collision read the same motor state without advancing it. */
 firebarCenters(bar:FirebarSpec):{x:number;y:number}[]{
  if(this.firebarSlots?.tracks(bar))return bar.x-4-this.camera>0&&bar.x-4-this.camera<256?this.firebarSlots.centers(bar):[];
  const motor=this.firebarMotors.get(bar);
  if(motor)return motor.state.active?firebarFlameCenters(motor.state,motor.geometry):[];
  const angle=(this.phase==='dying'?this.firebarDeathFrame:this.areaFrame)*bar.speed;
  return Array.from({length:bar.length},(_,n)=>({x:bar.x+Math.cos(angle)*n*8,y:bar.y+Math.sin(angle)*n*8}));
 }
 private collideFirebar(bar:FirebarSpec){
  const p=this.player;
  for(const flame of this.firebarCenters(bar))if(nativeFirebarHit(flame,this.camera,this.firebarMarioScreenX,p.y,p.size>0&&!p.duck))this.hurt();
 }
 /** Native coin pickup points (accept/reject grid of Mario against coin tiles, small Mario, model runs + route): feet x+3/x+12 at the feet row (dy >= 0), body x+13 at feet-8 (dx -13 accepted, -14 not; dy <= 23), head x+8 at feet-14 (dy <= 29).
  * The left body points are BlockBuffer_X_Adder $02 (feet-8, and feet-24 for big Mario), as the right ones are $0D: 3-2 v2 row 369, small Mario at x 909.56 takes the coin at column 56 with x+2 = 911.
  * PlayerBGCollision probes head, left foot, right foot, then each side top to bottom, and a coin (HandleCoinMetatile) ends the routine: one coin per row
  * (2-2 v2 rows 1323/1324, two coins one row apart). */
 private collectTiles(){const p=this.player,big=this.height>16,px=p.x-(this.swimActive?this.swimPull:0),py=p.y-(this.swimActive?this.water.whirlMoved:0),points=[[px+8,py-this.height-2],[px+3,py],[px+12,py],...big?[[px+2,py-24]]:[],[px+2,py-8],...big?[[px+13,py-24]]:[],[px+13,py-8]];for(const [x,y] of points){
  const col=Math.floor(x/16),row=Math.floor(y/16),key=`${col},${row}`,id=this.tiles.get(key);
  if(id===194||id===195){this.tiles.delete(key);this.parserVramBusy=true;this.paletteRemove=true;this.coin();return;}
 }}
 private coin(){this.blockUpdateBusy=this.graphicsBuffer1=true;this.coins++;this.score+=200;this.emit('sfx_coin');if(this.coins>=100){this.coins-=100;this.lives++;this.emit('sfx_1up');}}
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
 /** EnterSidePipe replaces only the native speed byte; its fraction and
  * normal motor latches determine the first step on every approach. */
 private sidePipeStep(){
  const p=this.player,water=this.area.theme==='water';
  if(water&&this.phaseFrame===1){
   this.motor.reset(this.water.motor.speed,p.facing<0?-1:1,this.marioMotion as -1|0|1,this.swimAbsolute);
  }
  // GetPlayerAnimSpeed reads this.motor.absolute here, before friction.
  p.x=nativeSidePipe(this.motor,p.x,p.grounded,water,Boolean(this.area.autoWalk));p.vx=this.motor.speed/4096;p.facing=this.motor.facing;this.marioMotion=this.motor.moving;
  if(this.pipeTimer>0)this.pipeTimer=nativeSidePipeTimer(this.pipeTimer,p.x,this.camera+this.areaControls.origin*16,Boolean(this.area.autoWalk));
  if(water){this.water.motor.speed=this.motor.speed;this.swimAbsolute=this.motor.absolute;}
 }
 /** UpToFiery passes Y0 to SetPRout; SaveAB retains the last actual player input during growth. */
 private powerupStateZero=false;private transformPreviousAB:number|undefined;private nativePlayerAB=0;
 /** DonePlayerTask clears TimerControl after NMI's timer pass. Mario has already
  * finished his turn, but the remaining GameEngine objects move this same row. */
 private nmiTimersHeld=false;
 private resumeWorldAfterTransform(){
  this.nmiTimersHeld=true;
  try{
   const p=this.player;this.platformFrame++;this.parserVramBusy=false;this.lakituScroll=0;this.broClock=(this.random.frame-1)&255;
   this.updateBubbles(false,false);this.updateGenerators();this.updateEnemies(p.y);this.updateItems();this.restoreStarMusic();
   this.firebarSlots?.step(this.camera);
   for(const [bar,motor]of this.firebarMotors)if(motor.state.active)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
   this.eraseOffscreenEnemies();this.birthNativeWaterEnemies();
   this.platformMotion.advance(this.platformFrame,this.camera,this.random.frame);this.platformSlotResidues();
   this.passNativeObjects();this.passNativeCannons();this.passNativeFrenzy();this.updateSwimGenerator();this.passNativeCastleFlames();this.gateNativePlatforms(this.camera);
   if(this.piranhaColumns){this.piranhaColumns.step(this.camera);this.birthParserPiranhas();}
   for(const bar of this.area.firebars??[])this.collideFirebar(bar);
   this.gameTimerStep(p.y<288);
   this.parserLoaderWasBlocked=this.parserClock.blocked;this.advanceNativeAreaParser(0);
  }finally{this.nmiTimersHeld=false;}
 }
 private finishVineEntry(){this.entryVineActive=false;this.climbingVine=undefined;this.player.climbing=false;}
 /** NMI counts GameTimerCtrlTimer down even while engine3/7 suppresses
  * RunGameTimer. A pending zero is consumed on the same row engine8 resumes.
  * timerFrames is the elapsed form of that byte (24 means a pending zero). */
 private gameTimerState(){return {time:this.time,control:Math.max(0,24-this.timerFrames),fetch:this.fetchGameTimer};}
 private initializeGameTimer(){
  if(!this.fetchGameTimer)return;
  const n=this.gameTimerState(),binding=/^[1-8]-[1-4]$/.test(this.level.id)?nativeAreaBindings(this.level).bindings.find(b=>b.area===this.area.id):undefined;
  const initialized=binding?initializeNativeGameTimer(n,nativePhysicalAreas[binding.code].header[0]>>6):n.fetch;
  if(!binding&&n.fetch){n.time=this.level.time+1;n.fetch=false;}
  if(initialized){this.time=n.time;this.fetchGameTimer=n.fetch;this.player.star=0;}
 }
 private gameTimerStep(run:boolean){
  const n=this.gameTimerState();if(!this.nmiTimersHeld)tickNativeGameTimer(n);this.timerFrames=24-n.control;
  return run?this.consumeGameTimer(true):false;
 }
 private consumeGameTimer(run:boolean){
  const n=this.gameTimerState(),result=runNativeGameTimer(n,1,run?8:7,Math.floor((this.player.y-32)/256)+1);
  this.time=n.time;this.timerFrames=24-n.control;
  if(result.timeUp){this.timeUpDeath=true;this.die();return true;}
  if(result.tick)this.graphicsBuffer1=true;if(result.hurry)this.emit('event_hurry');return false;
 }
 // Pipe exits rise without control (engine7) until the native spawn feet row.
 private beginPipeRise(frames:number){this.pipeRise=frames;this.player.y+=frames;this.player.grounded=false;this.player.vx=0;this.player.vy=0;}
 private updatePipeRise(){
  this.pipeRise--;this.player.y--;this.updateBubbles(true,false);this.enemyContactOff=true;this.updateEnemies(this.player.y);this.enemyContactOff=false; // native engine 7 (pipe exit): enemies run, PlayerEnemyCollision does not (8-4 area 2: no touch from the hidden Piranha at the exit pipe)
  if(this.pipeRise===0)this.player.grounded=this.isSolid(this.player.x+8,this.player.y);
  this.gameTimerStep(this.pipeRise===0&&this.player.y<288);
 }
 private enterArea(id:string,spawn:[number,number],camera?:number,ordinaryEnemyFrontier?:number){
  const introPipe=this.area.autoWalk;
  const autoWalkLoad=this.area.autoWalk&&this.phase==='pipe'?this.phaseFrame:undefined;
  this.loadArea(id,spawn,camera,true);this.timerFrames=24;this.initializeGameTimer();this.broClock=HAMMER_NATIVE.pipeClock;this.lifeFrozen++;
  this.random.frame=AREA_LOAD_FRAME_COUNTER; // FrameCounter $09 restarts with the area (palette rotation, Blooper strokes and other 8-frame phases)
  if(autoWalkLoad!==undefined)this.intervalControl=nativeAutoWalkAreaLoad(this.random,this.intervalControl,autoWalkLoad);
  if(introPipe)this.colorRotations=1; // native ColorRotation runs on the first engine row, FrameCounter 24
  // A measured return may resume the ordinary NPC stream beyond its viewport.
  // Pipe plants are terrain actors; generators retain their normal lifecycle.
  if(ordinaryEnemyFrontier!==undefined)this.enemies=this.enemies.filter(e=>e.kind==='piranha'||e.originX>=ordinaryEnemyFrontier);
  if(this.area.entryFall?.native)this.primeNativeEntryObjects();
 }
 private restartToTitle(){const frame=this.frame,row=this.lifeRow,frozen=this.lifeFrozen;this.reset();this.frame=frame;this.lifeRow=row;this.lifeFrozen=frozen;}
 /* native: an A held through the load starts the first control row's jump (no release edge needed) */ private freshA=false;private controlGrace=0;
 private springPinX=0;private springPinY=0;private springPrevA=false;private springRelease=false;private springLaunchSpeed=0;
 springCompression(spring:SpringSpec){return this.springTimers.get(spring)?.compression??0;}
 private updateSprings(oldBottom:number,heldJump:boolean){
  const p=this.player,edgeA=heldJump&&!this.springPrevA;this.springPrevA=heldJump;
  if(this.springRelease){
   this.springRelease=false;
   // Launch writes only Y speed. The next OnGroundStateSub has no vertical
   // move, then background collision changes Player_State to falling.
   if(!edgeA){p.y=this.springPinY;p.vy=this.springLaunchSpeed;p.grounded=false;return true;}
  }
  for(const spring of this.area.springs??[]){
   let n=this.springTimers.get(spring);const born=!n;
   const top=spring.y-24,aligned=Math.floor(p.x)+12>=spring.x&&Math.floor(p.x)+3<spring.x+16;
   if(!n&&aligned&&p.vy>=0&&oldBottom<=top+3&&p.y>=top){
    n=nativeSpring();this.springTimers.set(spring,n);this.springPinX=p.x;
    // LandPlyr clears raw Player_Y_Position's low nibble, retaining $0416.
    this.springPinY=((Math.floor(p.y)-32)&~15)+32+p.y-Math.floor(p.y);
    this.jumpArc=false;this.bouncing=false;this.runJump=false;this.mediumJump=false;this.landJump='inactive';
   }
   if(!n)continue;
   const step=advanceNativeSpring(n,edgeA,!born);
   this.springPinY+=step.dy;p.x=this.springPinX;p.y=this.springPinY;p.vy=0;p.grounded=true;
   if(step.launch){
    p.vy=n.force;this.springLaunchSpeed=n.force;this.springRelease=true;this.springTimers.delete(spring);
    this.bouncing=true;this.bounceGravity=this.lastJumpFallForce;this.landJump='inactive';
    if(p.size)this.emit('sfx_jump_big');return true;
   }
  }
  return false;
 }
 /** GameCoreRoutine continues GameEngine after pipe engines2/3/7 until ChgAreaPipe
  * clears OperMode_Task on its final row. Enemies move; player injury does not run. */
 private updatePipeWorld(previousCamera:number,oldFeet:number,scroll:number){
  this.parserVramBusy=false;this.platformFrame++;this.updateBubbles(true,false);
  if(Math.floor(this.camera/32)>Math.floor(previousCamera/32)){this.scrollCrossFrame=this.frame;this.scrollCrossCamera=Math.floor(this.camera/32)*32;}
  this.updateGenerators(false);this.lakituScroll=scroll;this.enemyContactOff=true;
  const beforeX=this.player.x;this.platformEjection=0;this.updatePlatforms(oldFeet,scroll);
  this.platformScroll=Math.floor(this.player.x)-Math.floor(beforeX)-this.platformEjection;
  this.updateEnemies(oldFeet);this.updateItems();this.enemyContactOff=false;
  this.firebarSlots?.step(this.camera);
  for(const [bar,motor]of this.firebarMotors)if(motor.state.active)advanceFirebarMotor(motor.state,motor.geometry,bar.motor!,this.camera);
  this.eraseOffscreenEnemies();this.birthNativeWaterEnemies();
  this.platformMotion.advance(this.platformFrame,this.camera,this.random.frame);this.platformSlotResidues();
  this.passNativeObjects();this.passNativeCannons();this.passNativeFrenzy();this.updateSwimGenerator();this.passNativeCastleFlames();this.gateNativePlatforms(previousCamera);this.busyNativeSlots(); // register newly eligible platforms on their native birth row
  this.piranhaColumns?.step(this.camera);this.birthParserPiranhas();this.firebarSlots?.cameraEntry(previousCamera,this.camera);
  if(!this.player.invincible||!(this.random.frame&1))this.waterScrollX=(Math.floor(this.player.x)-Math.floor(this.camera))&255;
  this.parserLoaderWasBlocked=this.parserClock.blocked;this.advanceNativeAreaParser(scroll);
 }
 private updateGenerators(tickInterval=true){
  // The shot's 1.5px/frame travel is measured. Cannon cooldown and close-range
  // inhibition are inferred rules; phases are deterministic across resets.
  this.areaPlayFrame++;if(tickInterval)this.tickIntervalTimers();
  this.updateNativeCannons();
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
   if(generator.heights){this.frenzyDue=generator;continue;} // runs after this frame's scroll (passNativeFrenzy)
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
 // entry, whose timer counts down; at 0 it restarts and the cannon makes a Bullet Bill object (state 0) in slot s at the cannon. On the next frame's pass, at slot s's turn (so s does not
// pick), BulletBillHandler keeps it only if it is on screen (0 <= x - camera <= 255) and d = x - Mario's pixel x is outside -40..38 (PlayerEnemyDiff + carry + 0x28 < 0x50 erases it),
// with that frame's camera and Mario: 252 of 252 native creations in the 32 v2 traces (tests/native-enemy-rules.test.ts).
 // Native RAM of free play (evidence/hazards2-findings-20261111.md, 7 runs): (1) a cannon loads on the row its column comes in, x - camera <= 352 for x on a 32-px boundary, <= 358 between
 // (camera of the row before, as the remake reads it here), and is first picked on the next row; (2) the object holds slot s on the next row, so s does not pick then;
 // (3) the level's first native row (engine 7, before the remake's first frame) already runs a pass on the register one frame back.
 private cannonStartTable?:object;
 private updateNativeCannons(){
  const cannons=(this.area.cannons??[]).filter(c=>c.native);if(!cannons.length||this.recordedRoute)return;
  while(this.cannonsLoaded<cannons.length&&cannons[this.cannonsLoaded].x-this.camera<=(cannons[this.cannonsLoaded].x%32?BULLETS.cannonLoadAheadOdd:BULLETS.cannonLoadAhead)){this.cannonTable[this.cannonsLoaded%6]={cannon:cannons[this.cannonsLoaded],timer:0};this.cannonsLoaded++;}
  this.cannonPassDue=true;
 }
 // Native order (ProcessCannons runs after the enemy loop, both after the frame's scroll): the pass sees this frame's camera, and an enemy the
 // native loader makes on this frame (the remake activates it on the next one, see enemyLoadBlocked) already holds the lowest free slot.
 private cannonPassDue=false;
 private passNativeCannons(){
  if(!this.cannonPassDue)return;this.cannonPassDue=false;
  this.freeNativeSlot();
  // Busy slots: the native slot model (releaseNativeSlots: a removed walker keeps its slot until native x - camera < -74); a cannon shot is removed inside the pass, after its own slot's turn.
  const used=new Set<number|undefined>(this.enemies.filter(e=>e.active&&(e.nativeShot?!e.dead||e.goneFrame===this.frame:!e.slotFreed&&(!e.dead||e.enemySlot!==undefined))).map(e=>e.enemySlot));
  for(const held of this.objectSlots(used))used.add(held);
  for(const e of this.enemies)if(this.nativeLoadsThisFrame(e)){let slot=0;while(used.has(slot))slot++;used.add(slot);}
  const mask=Number(this.level.id[0])>=BULLETS.cannonHardWorld?7:15,b=this.random.bytes;
  for(const e of this.enemies)if(e.bbCheck&&e.active&&!e.dead)this.nativeBulletBillCheck(e); // objects made on an earlier frame (each at its slot's turn; its slot stays in `used`)
  if(this.cannonStartTable!==this.cannonTable){this.cannonStartTable=this.cannonTable;this.nativeCannonPass(used,mask,[0,1,2,3].map(k=>(b[k]<<1|b[k+1]>>7)&255));}
  this.nativeCannonPass(used,mask,b);
 }
 private nativeCannonPass(used:Set<number|undefined>,mask:number,bytes:number[]){
  for(let slot=2;slot>=0;slot--){ // slots 2, 1, 0: when two slots pick one entry, the lower one makes the attempt (8 of 8 native double picks)
   const entry=used.has(slot)?undefined:this.cannonTable[bytes[slot+1]&mask];
   if(!entry)continue;
   if(entry.timer>0){entry.timer--;continue;}
   entry.timer=BULLETS.cannonRestart;
   const {x,y}=entry.cannon;
   this.spawnNativeBullet(x,y+16,this.player.x<x?-1:1);Object.assign(this.enemies[this.enemies.length-1],{enemySlot:slot,age:1,bbCheck:true});used.add(slot); // made after this frame's enemy step: its spawn row is done
  }
 }
 // BulletBillHandler, state 0 (the frame after the cannon made it): erased when off screen or Mario is close, else it starts flying away from him (and moves this frame).
 private nativeBulletBillCheck(e:Enemy){
  e.bbCheck=false;
  const d=Math.floor(e.x)-Math.floor(this.player.x);
  if(e.x<this.camera||e.x-this.camera>BULLETS.cannonScreenRight||d>=BULLETS.cannonEraseLeft&&d<=BULLETS.cannonEraseRight){this.eraseEnemy(e);e.goneFrame=this.frame;return;}
  e.vx=(d<0?1:-1)*Math.abs(e.vx);e.x+=Math.sign(e.vx)*BULLETS.speed;
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
 // 5-3 / 6-3 frenzy (BulletBillCheepCheep, after this frame's scroll like the native enemy loop): one Bullet Bill at a time. A frenzy Bullet Bill is removed at its own slot's turn
 // when its x before this frame's move is 72+ px left of this frame's camera (17 of 17 native removals: -72..-76 removed, -71.5 kept); the frenzy then runs at the next empty slot s
 // (a slot before it still saw the old one), places it at camera + 287 at the height of random byte s (nativeFrenzyHeight), so a removal and the next spawn share a frame (5-3 rows 119, 210).
 /** InitBowserFlame: object $15 enables the frenzy; free enemy slots read $078F, $0367 and their random byte. */
 private passNativeCastleFlames(){
  if(!this.nmiTimersHeld&&this.flameTimer>0)this.flameTimer--;
  const x=this.area.flameFrenzyX;if(x===undefined)return;
  if(this.enemies.some(e=>e.active&&!e.dead&&e.kind==='bowser')){this.flameFrenzy=false;return;}
  if(!this.flameFrenzy&&this.camera>=x-303&&this.scrollCrossFrame!==this.frame-1)this.flameFrenzy=true;
  if(!this.flameFrenzy||this.flameTimer>0||this.scrollCrossFrame===this.frame-1)return;
  const slot=this.freeNativeSlot();if(slot>=5)return;
  const target=this.random.bytes[slot]&3;
  this.flameTimer=[191,64,191,191,191,64,64,191][this.flameTimerCounter]+(Number(this.level.id[0])>=5?16:32);this.flameTimerCounter=(this.flameTimerCounter+1)&7;
  this.slotSub[slot]=0;this.slotYFraction[slot]=target;
  this.items.push({kind:'flame',x:this.camera+287,y:[144,128,112,144][target],vx:Number(this.level.id[0])>=5?-1.375:-1.25,vy:0,age:0,life:Infinity,nativeFlame:{slot,target,force:0}});
  this.emit('sfx_bowser_flame');
 }
 private frenzyDue?:GeneratorSpec;
 private passNativeFrenzy(){
  const generator=this.frenzyDue;this.frenzyDue=undefined;if(!generator||this.spinyTimer>0)return;
  const shots=this.enemies.filter(e=>e.frenzy&&e.active&&!e.slotFreed&&e.dead<100);
  let going=this.enemies.find(e=>e.frenzy&&e.goneFrame===this.frame);
  for(const e of shots)if(e.dead===0&&e.x+(e.age>1?BULLETS.speed:0)-this.camera<=-BULLETS.generatorRemoveLeft){this.eraseEnemy(e);going=e;}
  if(shots.some(e=>e!==going)||this.camera<generator.fromCamera!||this.camera>generator.toCamera!)return;
  this.freeNativeSlot();
  const used=new Set(this.enemies.filter(e=>e.active&&!e.dead).map(e=>e.enemySlot));for(const held of this.objectSlots(used))used.add(held);
  let slot=going?going.enemySlot!+1:0;while(used.has(slot)||this.groupSlotsBefore[slot])slot++;if(slot>=5)return;
  this.spawnFrenzyBullet(slot);
 }
 private spawnFrenzyBullet(slot:number){
  const pick=nativeFrenzyHeight(this.random.bytes[slot],this.swimBag);this.swimBag=pick.bag;
  this.spawnNativeBullet(this.camera+BULLETS.generatorSpawnAhead,pick.y+BULLETS.generatorFeetOffset,-1);Object.assign(this.enemies[this.enemies.length-1],{enemySlot:slot,frenzy:true,age:1,graphicsVisible:false});this.slotSub[slot]=0;this.slotVertical[slot].fraction=0;this.slotYFrac[slot]=0;this.slotYFraction[slot]=0; // made after this frame's enemy step
  this.spinyTimer=32;
 }
 // A native shot is removed when its next position is left of the screen (native: x - camera < about -73 on the current camera; the enemy step sees the previous camera, so 70 here) or right of camera + 329.
 private eraseDefeatedBullet(e:Enemy){
  this.eraseEnemy(e);e.goneFrame=this.frame;
  if(e.enemySlot===undefined)return;const slot=e.enemySlot;
  this.slotSub[slot]=Math.round((e.x-Math.floor(e.x))*256)&255;
  if(e.pod){Object.assign(this.slotVertical[slot],{speed:e.pod.speed,force:e.pod.force,fraction:e.pod.fraction});this.slotYSpeed[slot]=e.pod.speed&255;this.slotYFraction[slot]=e.pod.fraction;}
  e.slotFreed=true;this.slotReleaseFrame[slot]=this.frame;
 }
 // A live cannon shot's removal reads the next x against the prior scroll; defeated shots erase on their graphics pass.
 private nativeBulletGone(e:Enemy){
  const next=e.x+(!e.nativeShot||e.age>1?Math.sign(e.vx)*BULLETS.speed:0);
  return !e.frenzy&&next<this.camera-BULLETS.removeLeft||next>this.camera+BULLETS.removeRight||e.y>280;
 }
 // Route comparison only: the launches of the recorded route (the list repeats every `period` frames for a slower run), at Mario's x plus the class offset.
 private launchScheduledFish(generator:GeneratorSpec){
  if(this.player.x<generator.from||this.player.x>generator.to)return;
  const period=generator.period??Infinity;
  for(const [frame,index] of generator.schedule!){
   if(this.areaFrame<frame||(this.areaFrame-frame)%period!==0)continue;
   const kind=FLYING_FISH.classes[index];
   const enemy=this.makeEnemy({kind:'cheep',motion:'flying',x:Math.floor(this.player.x)+kind.offsetX,y:FLYING_FISH.launch.feetY,direction:1,evidence:'Native leaping Cheep Cheep: recorded launch schedule, constant-speed class and 187-frame arc.'});
   enemy.nativeFlight=true;enemy.vx=kind.speed;enemy.vy=FLYING_FISH.launch.vy;enemy.active=true;this.enemies.push(enemy);
  }
 }
 // Slots that objects other than enemies hold natively: a measured firebar's (FirebarSlots) and a platform's while it holds one (5-3 lift id 37 in slot 0 at row 400).
 // A platform takes the lowest slot free when it is first seen holding one.
 private platformSlots=new Map<object,number>();
 private frenzyControllers:NativeFrenzyController[]=[];
 /** WarpZoneObject runs in its enemy slot after this frame's ScrollHandler.
  * Its Y test is the source bytewise AND, including the offscreen Y page. */
 private updateNativeWarpZones(){
  const raw=Math.floor(this.player.y)-32;
  for(const c of this.frenzyControllers)if(c.id===52&&c.slot!==undefined&&nativeWarpZoneRelease(this.areaControls.locked,raw&255,((raw>>8)+1)&255)){
   this.areaControls.locked=false;this.slotReleaseFrame[c.slot]=this.frame;c.slot=undefined;c.lost=true;
  }
 }
 // Platforms preserve their slot fractions: id40 inherits x sub-pixels; the
 // balance/drop motors keep Y fractions (3-3 slot2: drop125 → balance125).
 private platformSlotResidues(){
  // OffscreenBoundsCheck erases the object after its last motion step. Keep
  // that final fraction before objectSlots releases and reuses its slot.
  for(const [platform,slot] of this.platformSlots){
   const xByte=this.platformMotion.slotXByte(platform as any,this.platformFrame);
   if(xByte!==undefined)this.slotSub[slot]=xByte;
   const state=this.platformMotion.verticalState(platform as any,this.platformFrame);
   if(state){Object.assign(this.slotVertical[slot],{speed:state.speed,force:state.force,fraction:state.fraction});this.slotYSpeed[slot]=state.speed&255;this.slotYFraction[slot]=this.slotYFrac[slot]=state.fraction;}
  }
  this.objectSlots(new Set(this.enemies.flatMap(o=>o.enemySlot!==undefined&&!o.slotFreed&&o.active?[o.enemySlot]:[])));
  for(const [platform,slot] of this.platformSlots){
   const p=platform as any;
   this.platformMotion.slotSub(p,this.slotSub[slot]);
   this.platformMotion.slotFraction(p,this.slotVertical[slot].fraction);
   const xByte=this.platformMotion.slotXByte(p,this.platformFrame);
   if(xByte!==undefined)this.slotSub[slot]=xByte;
   const state=this.platformMotion.verticalState(p,this.platformFrame);
   if(state){Object.assign(this.slotVertical[slot],{speed:state.speed,force:state.force,fraction:state.fraction});this.slotYSpeed[slot]=state.speed&255;this.slotYFraction[slot]=this.slotYFrac[slot]=state.fraction;}
  }
 }
 private objectSlots(enemySlots:Set<number|undefined>,platformSlots=this.platformSlots){
  const held=new Set<number>([...(this.firebarSlots?.held()??[]),...this.specialSlot5.vineSlots.filter(s=>s<5&&!this.erasedVineSlots.has(s))]),context=this.platformMotion.context;
  for(const slot of this.springSlots.values())if(slot<5)held.add(slot);
  for(const item of this.items)if(item.nativeFlame&&item.life>0)held.add(item.nativeFlame.slot);
  for(const controller of this.frenzyControllers)if(controller.slot!==undefined)held.add(controller.slot);
  for(const e of this.enemies)if(e.active&&!e.dead&&e.nativeBowser?.rearSlot!==undefined)held.add(e.nativeBowser.rearSlot);
  for(const [platform,slot] of platformSlots)if(nativePlatformHoldsSlot(this.platformMotion,platform as any,context,this.camera,this.platformFrame))held.add(slot);else{platformSlots.delete(platform);if(platformSlots===this.platformSlots&&!this.platformMotion.waiting.has(platform as PlatformSpec))this.platformMotion.lost.add(platform as PlatformSpec);}
  for(const platform of this.area.platforms??[])if(!platformSlots.has(platform)&&nativePlatformHoldsSlot(this.platformMotion,platform,context,this.camera,this.platformFrame)){
   if(this.parserClock.blocked)continue; // task7 blocks initialization as well as the creation clock
   let slot=0;while(held.has(slot)||enemySlots.has(slot)||this.slotReleaseFrame[slot]===this.frame)slot++;if(slot<5){platformSlots.set(platform,slot);if(platformSlots===this.platformSlots){this.platformMotion.slotSub(platform,this.slotSub[slot]);this.platformMotion.slotFraction(platform,this.slotVertical[slot].fraction);}held.add(slot);}
  }
  return held;
 }
 // Lowest native enemy slot not in use. Slots are not modelled elsewhere, so live enemies take theirs here, in the order they were activated.
 private freeNativeSlot(blockReleased=false,readOnly=false){
  // A walker the remake already dropped still holds its slot until releaseNativeSlots frees it (7-3 row 302: a koopa at camera - 73 keeps slot 2 natively, no fish there).
  const live=this.enemies.filter(e=>e.active&&!e.dead),used=new Set(this.enemies.flatMap(e=>e.enemySlot===undefined||!e.active||e.slotFreed||e.dead&&!this.holdsNativeSlot(e)?[]:[e.enemySlot]));
  for(const slot of this.objectSlots(used,readOnly?new Map(this.platformSlots):this.platformSlots))used.add(slot);
  if(blockReleased)for(let slot=0;slot<5;slot++)if(this.slotReleaseFrame[slot]===this.frame)used.add(slot);
  const lowest=()=>{let slot=0;while(used.has(slot))slot++;return slot;};
  for(const e of live)if(e.enemySlot===undefined){const slot=lowest();if(!readOnly)e.enemySlot=slot;used.add(slot);}
  return lowest();
 }
 // Native flying fish (docs/NATIVE_ROLES.md): when the timer runs out the lowest free slot s picks the next wait from random byte s+1, and a fish is launched if s is below the area's limit.
 // Random byte s and Mario's speed byte pick its speed and start offset; a standing Mario gets a random offset (byte s+2) unless byte s+1 is 0 in its low bits, and the fish then flies toward him.
 /** Native (RAM 0x71F/0x78F, evidence/leaper3-findings-20261111.md): the fish timer is not read on the row after the camera crosses a multiple of 32 px moving right
  * (15 of 15 expiries on that row launch one row late; rule replay on native RAM 510 of 556 launches vs 432 without it). Returns whether this row is that row. */
 private fishCameraCrossed(){const before=this.fishCamera;this.fishCamera=this.camera;return before!==undefined&&Math.floor(this.camera/32)>Math.floor(before/32);}
 private fishCamera?:number;
 // A slot keeps the sub-pixel x ($0401+s) and y fraction ($0417+s) of its last occupant, and a new flying fish starts with them (32 v2 traces: 30 of 30 fish spawns in a used slot
 // start with the bytes the slot held after its previous occupant was removed). A fish removed on a row still makes that row's horizontal step, not its vertical one.
 private leaveFlyingCheepSlot(e:Enemy){const x=e.nativeSwim?e.x:e.x+e.vx;this.slotSub[e.enemySlot!]=Math.round((x-Math.floor(x))*256)&255;this.slotYFrac[e.enemySlot!]=e.nativeSwim?.fraction??e.pod?.fraction??0;}
 private updateFishFrenzy(generator:GeneratorSpec){
  this.freeNativeSlot(); // an enemy takes its native slot on the frame it activates (not when the timer next reads the slots): a later fish then sees the real free slot
  const crossed=this.fishCameraCrossed();
  if(this.camera<generator.fromCamera!||this.player.x>generator.to||(this.fishTimer>0&&(this.nmiTimersHeld||--this.fishTimer>0)))return;
  if(crossed)return; // the timer stays at 0 and is read on the next row
  const F=FLYING_FISH.frenzy,bytes=this.random.bytes,slot=this.freeNativeSlot(),wait=bytes[slot+1]&3;
  if(slot>=5)return; // all five native slots busy: the timer stays at 0 until one is free (7-3 rows 451, 244)
  this.fishTimer=F.waits[wait];
  if(slot>=generator.maxFish!)return;
  const speedByte=Math.floor(this.player.vx*16)&255,table=speedByte===0?0:speedByte<F.walkSpeedLimit?1:2,entry=table*4+(bytes[slot]&3),place=table===0&&wait?bytes[slot+2]&15:entry;
  const offset=F.offsets[place],speed=F.speeds[entry]*(table===0&&offset>0?-1:1);
  const enemy=this.makeEnemy({kind:'cheep',motion:'flying',x:Math.floor(this.player.x)+offset+this.slotSub[slot]/256,y:FLYING_FISH.launch.feetY,direction:Math.sign(speed),evidence:'Native leaping Cheep Cheep: random-register launch, 187-frame arc.'});
  enemy.nativeFlight=true;enemy.enemySlot=slot;enemy.vx=speed;enemy.vy=FLYING_FISH.launch.vy;enemy.pod={...flyingCheepLaunch(),fraction:this.slotYFrac[slot]};enemy.active=true;this.enemies.push(enemy);
 }
 // Native swimming Cheep generator (2-2/7-2 water, free play; the recorded route replays its list): once the 32-frame timer is 0 the lowest free slot, if below 3, gets a fish at camera + 287.
 // It runs after this frame's scroll with this row's register (2-2 v2 row 1308: camera 929 -> 931, the fish at 1218 with the height of random byte 0 of that row).
 private passNativeWaterStream(){
  const stream=this.waterEnemyStream!;
  if(this.swimTimer>0)this.swimTimer--;
  for(const e of this.enemies)if(e.active&&!e.dead&&!e.slotFreed&&(e.bloop||e.nativeSwim)&&e.enemySlot!==undefined)this.waterSlotPositions[e.enemySlot]={x:e.x,y:e.y-24};
  if(this.parserClock.blocked)return;
  for(let slot=0;slot<6;slot++){
   if(slot<5?this.groupSlotsBefore[slot]:this.specialSlot5.flag&&this.nativeFrenzyTurn?.slot!==5)continue;
   const turn=this.nativeFrenzyTurn?.slot===slot?this.nativeFrenzyTurn:undefined;
   if(turn){if(slot<5&&turn.id===23)this.initNativeWaterFrenzy(slot,true);continue;}
   const event=stream.next(this.camera,this.secondaryHardMode,slot);
   const position=this.waterSlotPositions[slot];if(event.x!==undefined)position.x=event.x+(slot<5?this.slotSub[slot]/256:0);if(event.y!==undefined)position.y=event.y;
   if(slot===5){this.specialSlot5.x=position.x;this.specialSlot5.y=position.y;if(event.kind==='frenzy'&&this.specialSlot5.frenzyBuffer)this.specialSlot5.id=this.specialSlot5.frenzyBuffer;}
   if(event.kind==='frenzy'){if(slot<5&&this.specialSlot5.frenzyBuffer===23)this.initNativeWaterFrenzy(slot,false);continue;}
   if(event.kind==='skip'){const e=this.enemies.find(e=>!e.active&&e.nativeWaterOffset===event.offset);if(e)e.slotLost=true;continue;}
   if(event.kind!=='spawn')continue;
   if(event.id!==7)throw Error(`Unsupported native water stream actor ${event.id}`);
   const e=this.enemies.find(e=>!e.active&&e.nativeWaterOffset===event.offset);if(!e)throw Error(`Missing native water source offset ${event.offset}`);
   Object.assign(e,{active:true,slotLost:false,enemySlot:slot,x:event.x+this.slotSub[slot]/256,y:event.y+24,age:0,bloop:newNativeBlooper()});
   this.waterSlotPositions[slot]={x:e.x,y:event.y};
  }
 }
 private initNativeWaterFrenzy(slot:number,queued:boolean){
  if(slot<3&&this.swimTimer===0){
   const pick=nativeSwimCheepPick(this.random.bytes[slot],this.swimBag,this.level.id);this.swimBag=pick.bag;this.swimTimer=32;
   const fish=this.makeEnemy({kind:'cheep',x:this.camera+287,y:pick.y+24,direction:-1,palette:pick.id===11?'0f-16-30-27':'0f-10-30-27',swim:{},evidence:'Native water frenzy at its source parser slot.'});
   Object.assign(fish,{active:true,enemySlot:slot,nativeSwim:{y:pick.y,fraction:0,flag:this.random.bytes[slot]&16,originY:pick.y}});this.enemies.push(fish);this.waterSlotPositions[slot]={x:fish.x,y:pick.y};
  }else if(queued){const p=this.waterSlotPositions[slot];this.frenzyControllers.push({id:23,offset:-1,column:Math.floor(p.x),x:p.x,y:p.y,hardOnly:false,slot});}
 }
 private nativeSwimFrenzyArea(){return this.area.theme==='water'&&!this.recordedRoute&&(this.specialSlot5.frenzyBuffer===23||this.specialAreaCommands().some(c=>c.id===23));}
 private updateSwimGenerator(){
  if(this.waterEnemyStream||!this.nativeSwimFrenzyArea())return;
  this.enemies=this.enemies.filter(e=>e.active||!(e.kind==='cheep'&&e.swim)); // the route's list is replaced
  if(this.swimTimer>0&&(this.nmiTimersHeld||--this.swimTimer>0)||this.specialSlot5.frenzyBuffer!==23)return;
  if(this.scrollCrossFrame===this.frame-1)return; // the enemy parser does not load a frenzy object on task 7
  const slot=this.freeNativeSlot(true);if(slot>=SWIM_GEN.slots)return;
  const pick=nativeSwimCheepPick(this.random.bytes[slot],this.swimBag,this.level.id);this.swimBag=pick.bag;this.swimTimer=SWIM_GEN.timer;
  const fish=this.makeEnemy({kind:'cheep',x:this.camera+SWIM_GEN.spawnAhead,y:pick.y+SWIM_GEN.feetOffset,direction:-1,palette:(SWIM_GEN.palettes as Record<string,string>)[pick.id],swim:{},evidence:'Native swimming Cheep generator: random byte of its slot, eight-height bag, 32-frame timer.'});
  fish.enemySlot=slot;fish.active=true;fish.nativeSwim={y:pick.y,fraction:0,flag:this.random.bytes[slot]&16,originY:pick.y};this.enemies.push(fish);
 }
 // Native Podoboo (MovePodoboo, id 12): made with EnemyIntervalTimer ($0796+s) = 1 at native y 2 of page 2 (514, below the screen) at rest. Whenever that timer is 0 it starts
 // again from 514 with speed byte -7, move force = random byte s+1 | 0x80 and timer = (that & 15) | 6. Every frame MoveJ_EnemyVertically adds the 8.8 speed (plus the carry of the
 // fraction $0417+s) to y and 28/256 to the speed, capped at 3. Interval timers count down once every 21 frames (IntervalTimerControl $077F). 5-4/6-4 traces, tests/native-podoboo.test.ts.
 starPalette=0;starDrawPalette:number|undefined; // stored $03C4 palette bits, and the prior bits used by this frame's player OAM
 intervalControl=20; // native $077F: counts 20..0 once per frame; at 0 the interval timers tick
 private tickIntervalTimers(){
  if(this.nmiTimersHeld)return;
  const n=nativeIntervalStep(this.intervalControl,this.player.star);
  this.intervalControl=n.interval;this.player.star=n.star;
  if(!n.tick)return;
  if(this.screenTimer>0)this.screenTimer--;
  for(const e of this.enemies){if(e.shellTimer)e.shellTimer--;if(e.pod&&e.pod.timer>0)e.pod.timer--;if(e.bloop&&e.bloop.timer>0)e.bloop.timer--;if(e.hbro&&e.hbro.interval>0)e.hbro.interval--;}
 }
 private restoreStarMusic(){if(nativeStarMusic(this.player.star,this.intervalControl,Math.floor((this.player.y-32)/256)+1))this.emit(this.areaMusic());}
 private updateNativePodoboo(e:Enemy){
  const n=e.pod??={...nativeMoveState(514,1),fraction:this.slotYFraction[e.enemySlot??0]}; // InitPodoboo zeroes speed and force, the slot keeps its y fraction $0417+s (3-4 row 616)
  if(e.waitedForNativeSlot&&e.age===1){e.y=n.y-256+24;return;}
  if(n.timer===0){const force=this.random.bytes[(e.enemySlot??0)+1]|0x80;Object.assign(n,{y:514,speed:-7,force,timer:(force&15)|6});}
  nativeImposeGravity(n,28,3);
  e.y=n.y-256+24;e.vy=n.speed+n.force/256;e.podobooFalling=e.vy>0;
 }
 /** Native Piranha Plant (InitPiranhaPlant / MovePiranhaPlant): made hidden at its pipe (native y = feet - 24) with speed +1, move flag 0; down y is that y, up y 24 px higher.
  * Each frame EnemyFrameTimer ($078A+s) counts down; at 0, a still plant (flag 0) about to rise stays while |plant x - Mario x| (low byte) < 0x21, else its speed is negated
  * and the flag set; it moves 1 px on odd FrameCounter frames and, on reaching its end, clears the flag and waits 0x40 frames. Speed $58+s, flag $A0+s, up $0417+s, down $0434+s. */
 private birthParserPiranhas(){
  for(const e of this.enemies){
   if(e.kind!=='piranha'||e.active||this.nativeSlotDenied(e,true)||!e.slotHeld)continue;
   // VerticalPipe runs after enemy movement. Objects erased in that pass have already released their native flag.
   const used=new Set(this.enemies.filter(o=>o!==e&&!o.slotFreed&&this.holdsNativeSlot(o)).flatMap(o=>o.enemySlot===undefined?[]:[o.enemySlot]));
   for(const held of this.objectSlots(used))used.add(held);
   let slot=0;while(used.has(slot))slot++;
   if(slot>=5){e.slotLost=true;e.slotHeld=false;continue;}
   e.active=true;e.enemySlot=slot;e.age=0;this.startNativePiranha(e);
  }
 }
 private startNativePiranha(e:Enemy){const down=e.originY-24;e.pir={y:down,speed:1,flag:0,up:down-24,down,timer:0};e.y=e.originY;}
 private updateNativePiranha(e:Enemy){nativePiranhaStep(e.pir!,Math.floor(e.x),Math.floor(this.player.x),this.broClock,!this.nmiTimersHeld);e.y=e.pir!.y+24;}
 // Native Blooper runs before ProcessWhirlpools: read Mario's position before its trailing pull/gravity, with this frame's counter and random byte slot+1.
 private updateNativeBlooper(e:Enemy){
  if(e.enemySlot===undefined)this.freeNativeSlot();
  const b=e.bloop??=newNativeBlooper(),p=this.player,mask=this.secondaryHardMode?3:63;
  const next=stepNativeBlooper(b,Math.floor(e.x),Math.floor(e.y)-24,{slot:e.enemySlot!,frameCounter:this.random.frame,randomByte:this.random.bytes[e.enemySlot!+1],mask,playerX:Math.floor(p.x-(this.swimActive?this.swimPull:0)),playerY:(Math.floor(p.y-(this.swimActive?this.water.whirlMoved:0))-32)&255,playerDir:this.marioMotion<0?2:1});
  e.x=next.x+e.x-Math.floor(e.x);e.y=next.y+24;e.nativeDir=b.dir===1?1:-1;
 }
 // Hammer Bro roster entries supply level object positions only. All decisions use native slot state (src/hammer-bro.ts).
 private slotBroJump=[0,0,0,0,0];private miscHammerBytes=Array.from({length:9},()=>({force:0,fraction:0,collision:false}));private miscOffscreen=0;private hammerPlayerBox?:NativeBox;private miscPositions=Array.from({length:9},()=>({x:0,y:0}));private blockControl=0;private nativeBlockBounce=0;private nativeBlocks=Array.from({length:4},(_,slot)=>({slot,x:0,y:0,state:0,speed:0,force:0,fraction:0}));
 private bindNativeHammerBros(){
  this.broClock=HAMMER_NATIVE.levelClock;
  const roster=(hammerBroData.bros as unknown as NativeHammerBro[]).filter(b=>b.level===this.level.id&&b.area===this.area.id),taken=new Set<NativeHammerBro>();
  for(const e of this.enemies){
   if(e.kind!=='hammerBro')continue;
   let best:NativeHammerBro|undefined;
   for(const b of roster)if(!taken.has(b)&&Math.abs(b.x-e.x)<=32&&(!best||Math.abs(b.x-e.x)<Math.abs(best.x-e.x)))best=b;
   if(!best)continue;
   taken.add(best);e.nativeBro=best;e.x=best.x;e.y=best.y;
  }
 }
 private updateNativeHammerBro(e:Enemy){
  if(e.enemySlot===undefined)this.freeNativeSlot();
  const slot=e.enemySlot!;
  const n=e.hbro??={state:0,jumpTimer:this.slotBroJump[slot],throwTimer:0,frameTimer:0,interval:(this.secondaryHardMode?0x50:0x80)-(this.intervalControl===20&&!this.nmiTimersHeld?1:0),speed:0,force:0,fraction:this.slotVertical[slot].fraction,y:Math.floor(e.y)-24};
  if(e.age===1)e.x+=this.slotSub[slot]/256;
  const camera=this.camera+this.lakituScroll,screenX=Math.floor(e.x)-camera;
  const step=hammerBroStep(n,{x:Math.floor(e.x),marioX:Math.floor(this.player.x),frame:this.random.frame,random1:this.random.bytes[slot+1],random2:this.random.bytes[slot+2],hard:this.secondaryHardMode,tickTimer:!this.nmiTimersHeld,
   supported:Boolean(this.enemyCollisionAt(Math.floor(e.x)+8,n.y+24)),sideBlocked:this.enemySolid(Math.floor(e.x)+(e.nativeDir===1?16:0),n.y+20),onScreen:screenX>0&&screenX<=247,spawnHammer:()=>this.spawnNativeHammer(e)});
  e.nativeDir=Math.floor(e.x)-Math.floor(this.player.x)<0?1:-1;e.vx=step.speed/16;e.x+=e.vx*step.steps;e.y=n.y+24;e.vy=n.speed+n.force/256;
  this.slotBroJump[slot]=n.jumpTimer;this.slotSub[slot]=Math.round((e.x-Math.floor(e.x))*256)&255;
 }
 private spawnNativeHammer(e:Enemy){
  const byte=this.random.bytes[1],slot=(byte&7)||(byte&8),guard=[4,4,4,5,5,5,6,6,6][slot];
  if(this.items.some(i=>(i.nativeHammer??i.nativeCoin)?.slot===slot&&i.life>0))return false;
  if(guard<5&&this.enemies.some(o=>o.active&&!o.dead&&o.enemySlot===guard))return false;
  if(guard===5&&this.specialSlot5.flag)return false;
  const x=(e.nativeBowser?.x??e.x)+2,y=(e.nativeBowser?e.nativeBowser.y+24:e.y)-34;
  this.miscPositions[slot]={x:Math.floor(x),y:Math.floor(y)};
  this.items.push({kind:'hammer',x,y,vx:0,vy:0,age:0,life:900,owner:e,nativeHammer:{slot,state:0x90,speed:0,...this.miscHammerBytes[slot]}});return true;
 }
 private spawnNativeBlockCoin(col:number){
  const p=this.player,blockY=(Math.floor(p.y)-32+(p.size===0||p.duck?18:4))&240;
  const busy8=this.items.some(i=>i.life>0&&(i.nativeHammer??i.nativeCoin)?.slot===8);
  this.spawnNativeCoin(col*16+5,nativeCoinBlockStartY(blockY,busy8));
 }
 private spawnNativeAboveBlockCoin(col:number,row:number){
  const offset=nativeAreaControls.areas.find(a=>a.level===this.level.id&&a.area===this.area.id)?.source[0]?.offset??0,nativeCol=col-offset;
  const start=nativeAboveCoinStart(row*16-48,((nativeCol>>4)&1)*0xd0+(nativeCol&15),nativeCol>>4);
  this.spawnNativeCoin(start.x+offset*16,start.y);
 }
 private spawnNativeCoin(x:number,y:number){
  const busy=new Set(this.items.filter(i=>i.life>0).flatMap(i=>{const n=i.nativeHammer??i.nativeCoin;return n?[n.slot]:[];})),slot=nativeCoinSlot(busy);
  for(const item of this.items)if((item.nativeHammer??item.nativeCoin)?.slot===slot)item.life=0;
  this.miscPositions[slot]={x:Math.floor(x),y:Math.floor(y)};
  this.items.push({kind:'coin',x,y,vx:0,vy:-5,age:0,life:1000,nativeCoin:{slot,state:1,speed:-5,...this.miscHammerBytes[slot]}});
 }
 private advanceNativeBlockPictures(){
  let busy=this.paletteClock.pendingBuffer1||this.blockUpdateBusy;
  for(const slot of [1,0]){const b=this.blockGraphics.find(b=>b.slot===slot);if(!b)continue;b.pictureY=undefined;if(b.replace&&!busy){this.blockBackgroundQueue.set(b.key,b.metatile||null);b.replace=false;busy=this.graphicsBuffer1=true;}}
  const bouncing=this.nativeBlocks.slice(0,2).map(n=>(n.state&15)===1);
  this.advanceNativeBlocks();
  for(const b of this.blockGraphics)if(bouncing[b.slot]){const n=this.nativeBlocks[b.slot];b.pictureY=n.y;if(!n.state)b.replace=true;}
 }
 private advanceNativeBlocks(){
  for(const slot of [1,0]){const n=this.nativeBlocks[slot];if(!n.state)continue;n.state&=15;n.y=nativeMiscGravity(n,n.y,0x50,8);
   if(n.state===2){n.x--;const low=this.nativeBlocks[slot+2];low.y=nativeMiscGravity(low,low.y,0x50,8);low.x--;if(n.y>=0){low.y=Math.min(240,low.y);if(n.y>=240)n.state=0;}}
   else if((n.y&15)<5)n.state=0;
  }
 }
 private moveNativeCoin(i:Item){
  const n=i.nativeCoin!;
  if(n.state===1){i.y=nativeMiscGravity(n,i.y,0x50,6);if(n.speed===5)n.state++;}
  else{n.state++;i.x+=this.lakituScroll;if(n.state===0x30){n.state=0;i.life=0;this.miscPositions[n.slot]={x:Math.floor(i.x),y:Math.floor(i.y)};return;}}
  const offscreen=nativeMiscOffscreen(Math.floor(i.x),Math.floor(i.y),this.camera+this.lakituScroll);
  if(n.state>=2&&!(this.random.frame&1))i.y--;
  i.vy=n.speed+n.force/256;Object.assign(this.miscHammerBytes[n.slot],{force:n.force,fraction:n.fraction,collision:n.collision??false});
  this.miscPositions[n.slot]={x:Math.floor(i.x),y:Math.floor(i.y)};this.miscOffscreen=offscreen;
 }
 private moveNativeHammer(i:Item){
  const n=i.nativeHammer!,owner=i.owner!;
  if((n.state&0x7f)>=2){
   if((n.state&0x7f)===2){n.speed=-2;i.vx=owner.nativeDir??-1;if(owner.hbro)owner.hbro.state&=~8;}
   n.state--;i.x=Math.floor(owner.nativeBowser?.x??owner.x)+2;i.y=Math.floor(owner.nativeBowser?owner.nativeBowser.y+24:owner.y)-34;
  }else{
   i.y=nativeMiscGravity(n,i.y,0x10,4);i.x+=i.vx;
   const box=this.hammerPlayerBox??nativePlayerBox(this.player.x,this.player.y,this.player.size,this.player.duck,this.camera+this.lakituScroll);
   if(nativeHammerContact(n,box,this.random.frame,this.miscOffscreen)){i.vx=-i.vx;if(!this.player.star)this.hurt();}
  }
  i.vy=n.speed+n.force/256;Object.assign(this.miscHammerBytes[n.slot],{force:n.force,fraction:n.fraction,collision:n.collision??false});
  const camera=this.camera+this.lakituScroll;this.miscOffscreen=nativeMiscOffscreen(Math.floor(i.x),Math.floor(i.y),camera);n.box=nativeHammerBox(Math.floor(i.x),Math.floor(i.y),camera,n.slot<4?this.nativeBlocks[n.slot].x:this.miscPositions[n.slot-4].x);this.miscPositions[n.slot]={x:Math.floor(i.x),y:Math.floor(i.y)};
  if(this.miscOffscreen&0xfc)i.life=0;
 }
 // Native Lakitu (src/lakitu.ts): MoveLakitu on its pre-step integer x against this frame's Mario x, speed byte and scroll; it steps on its first remake row
 // (the native creation row is the row before). Flee (EndFrenzy sets Lakitu's state): when the area parser queues the Stop_Frenzy object and the enemy pass has a free slot.
 private updateNativeLakitu(e:Enemy){
  let timer=this.spinyTimer;
  if(timer===0&&this.spinyBuffer&&this.scrollCrossFrame!==this.frame-1){const slot=this.freeNativeSlot(false,true);if(slot<5&&slot<(e.enemySlot??5))timer=SPINY_EGG.timer;}
  e.graphicsFrenzyTimer=timer;if(e.graphics)e.graphics.graphicsFrenzyTimer=timer;
  const p=this.player,lak=e.lak??={dir:0,speed:0};
  if(this.nativeFrenzyTurn?.id===24&&this.nativeFrenzyTurn.slot<e.enemySlot!)lak.fleeing=true;
  lak.preX=Math.floor(e.x);
  e.x+=lakituStep(lak,Math.floor(e.x),Math.floor(p.x),this.marioSpeedByte(),this.lakituScroll,Boolean(lak.fleeing))/16;
  if(lak.box===8&&e.enemySlot!==undefined)this.slotSub[e.enemySlot]=Math.round((e.x-Math.floor(e.x))*256)&255;
  if(!lak.fleeing){this.specialSlot5.frenzyBuffer=18;this.spinyBuffer=true;} // MoveLakitu in the normal state puts a Spiny in EnemyFrenzyBuffer
  if(e.stopFrenzyX!==undefined&&stopFrenzyParsed(e.stopFrenzyX,this.scrollCrossCamera,this.frame-this.scrollCrossFrame))lak.stopQueued=true;
  if(this.nativeFrenzyTurn?.id===24){lak.fleeing=true;this.specialSlot5.frenzyBuffer=0;this.spinyBuffer=false;}
  if(lak.stopQueued&&(this.freeNativeSlot()<5||!this.specialSlot5.flag)){lak.fleeing=true;this.spinyBuffer=false;lak.stopQueued=false;}
 }
 private syncSpecialPowerup(){
  if(this.specialSlot5.id===46){const powerup=this.items.find(i=>['mushroom','flower','star','1up'].includes(i.kind));if(powerup){this.specialSlot5.x=Math.floor(powerup.x);this.specialSlot5.y=Math.floor(powerup.y)-8;}else this.specialSlot5.erase();}
 }
 private specialAreaCommands():AreaControl[]{
  const decoded=nativeAreaControls.areas.find(a=>a.level===this.level.id&&a.area===this.area.id)?.commands??[];
  // An unvisited outside area still carries the native flagpole ball metatile, the source command column.
  const flag=this.area.tiles.find(([,,id])=>id===36)?.[0];
  return flag===undefined||decoded.some(c=>c.id===48)?decoded:[...decoded,{x:flag*16,id:48}];
 }
 private applySpecialAreaCommand(command:AreaControl){
  if(command.id===48){this.specialSlot5.claimFlag(command.x);this.flagNumber.y=176;this.items=this.items.filter(i=>!['mushroom','flower','star','1up'].includes(i.kind));}
  else{
   const ids=Array.from({length:5},()=>this.specialSlot5.frenzyBuffer);
   for(const enemy of this.enemies)if(enemy.active&&!enemy.slotFreed&&enemy.enemySlot!==undefined&&enemy.enemySlot<5&&this.holdsNativeSlot(enemy))ids[enemy.enemySlot]=enemy.kind==='lakitu'?17:enemy.kind==='spiny'?18:enemy.kind==='cheep'&&enemy.motion==='flying'?20:enemy.kind==='bullet'?8:-1;
   for(const slot of this.objectSlots(new Set(this.enemies.filter(e=>e.active&&!e.slotFreed).map(e=>e.enemySlot))))ids[slot]=-1;
   this.specialSlot5.areaCommand(command.id,ids);
  }
 }
 private advanceSpecialSlotParser(column:number|undefined){
  if(column===undefined)return;
  for(const command of this.specialAreaCommands())if(command.x===column)this.applySpecialAreaCommand(command);
 }
 /** Player_X_Speed $57 (the native motor's speed byte). */
 private marioSpeedByte(){return Math.floor(Math.round(this.player.vx*4096)/256)&255;}
 /** ScrollAmount $0775 of this row, computed before the enemies run as the native ScrollHandler does (same rule as the camera commit in update()). */
 private nativeScrollPreview(oldX:number,attemptX:number){
  if(this.areaControls.locked)return 0;
  const scrollMove=Math.floor(attemptX)-Math.floor(oldX)+this.platformScroll,screenX=this.area.theme==='water'?this.waterScrollX:Math.floor(oldX)-this.camera;
  let camera=this.camera;
  if(screenX>=80&&Math.max(0,this.sideCollisionTimer-1)===0&&scrollMove>0)camera+=screenX>=112||scrollMove<2?scrollMove:scrollMove-1;
  return Math.max(0,Math.min(camera,this.area.cameraEnd??this.area.warpZone?.cameraEnd??Math.max(0,this.area.width-256))-this.camera);
 }
 specialSlot5=new NativeSpecialSlot();private nativeFrenzyTurn?:{slot:number;id:number};
 private nativeStompTimer=0;private lakituReappearCount=0;private spinyTimer=0;private spinyBuffer=false;private lakituScroll=0; // FrenzyEnemyTimer $078F, EnemyFrenzyBuffer $06CB holds a Spiny, ScrollAmount $0775
 /** Start of the enemy pass: FrenzyEnemyTimer counts down once per frame; Lakitu's slot and pre-step x decide which egg x a lower free slot sees. */
 private spinyFrenzyBefore(){
  if(!this.nmiTimersHeld&&this.spinyTimer>0)this.spinyTimer--;
  return this.spinyBuffer;
 }
 /** LakituAndSpinyHandler in the first free slot (CheckFrenzyBuffer): a slot below Lakitu's runs before Lakitu steps (pre-step x, last row's buffer), a higher one after.
  * The handler is not reached on the row after the camera crosses a 32 px boundary (AreaParserTaskNum, as for list objects: 6-1 row 775 holds the egg one row). */
 private spinyFrenzyAfter(bufferBefore:boolean){
  if(this.spinyTimer>0||this.scrollCrossFrame===this.frame-1)return;
  const slot=this.freeNativeSlot(),lakitu=this.enemies.find(e=>e.kind==='lakitu'&&e.active&&!e.dead);if(slot>=5)return;
  const low=lakitu?.enemySlot!==undefined&&slot<lakitu.enemySlot;
  if(!(low?bufferBefore:this.spinyBuffer))return;
  if(!lakitu){
   const used=new Set(this.enemies.filter(e=>!e.slotFreed&&this.holdsNativeSlot(e)).flatMap(e=>e.enemySlot===undefined?[]:[e.enemySlot]));
   for(const held of this.objectSlots(used))used.add(held);
   const flags=Array.from({length:5},(_,s)=>Number(used.has(s))),ids=flags.map((_,s)=>this.enemies.some(e=>e.kind==='lakitu'&&e.enemySlot===s&&!e.slotFreed&&this.holdsNativeSlot(e))?17:0);
   const n={timer:this.spinyTimer,count:this.lakituReappearCount},born=lakituReappear(n,ids,flags);this.spinyTimer=n.timer;this.lakituReappearCount=n.count;
   if(born!==undefined){
    const e=this.makeEnemy({kind:'lakitu',x:this.camera+this.lakituScroll+287,y:48,evidence:'Native LakituAndSpinyHandler / SetupLakitu / PutAtRightExtent.'});
    Object.assign(e,{active:true,enemySlot:born,age:0,lak:{dir:0,speed:0,box:8}});this.slotSub[born]=0;this.slotVertical[born].speed=0;this.slotVertical[born].force=0;this.enemies.push(e);
    // A higher slot still has its normal turn in this pass; the initiating slot returns from its loader.
    const first=flags.findIndex(f=>!f);if(born>first){e.age++;this.updateNativeLakitu(e);}
   }
   return;
  }
  this.spinyTimer=SPINY_EGG.timer;
  if(lakitu.lak?.fleeing||((Math.floor(this.player.y)-32)&255)<SPINY_EGG.minMarioY)return;
  const x=low?lakitu.lak!.preX!:Math.floor(lakitu.x),y=lakitu.y-SPINY_EGG.aboveLakitu,left=this.slotVertical[slot];
  const egg=this.makeEnemy({kind:'spiny',motion:'falling',x:x+this.slotSub[slot]/256,y,palette:'0f-16-30-27',evidence:'Native CreateSpiny (src/lakitu.ts).'});
  egg.active=true;egg.egg=true;egg.vx=0;egg.vy=SPINY_EGG.speed;egg.enemySlot=slot;egg.age=0;
  egg.pod={...nativeMoveState(y),speed:SPINY_EGG.speed,force:0,fraction:left.fraction}; // speed $FD, MoveForce 0; the y fraction $0417 is what the slot was left with (26 of 26 v2 eggs)
  this.enemies.push(egg);
 }
 /** ProcEnemyDirection for a landing Spiny (egg or a walker that fell): 8/16 px right, turned toward Mario (PlayerEnemyDiff on the pre-step x) unless FrameCounter & 7 is 0.
  * v2 traces: 17 of 17 landings face Mario (none on a FrameCounter multiple of 8); the turn one row later at 4-1 row 733 and 6-1 row 247 is the ordinary wall turn. */
 private spinyLandingVx(x:number){return (this.random.frame&7)===0||Math.floor(this.player.x)-Math.floor(x)>=0?SPINY_EGG.walk:-SPINY_EGG.walk;}
 /** The walker side probe after the landing step (as the walker pass does after its own step: nativeWalkerWallTurn). */
 private spinyWallTurn(e:Enemy){if(this.enemySolid(Math.floor(e.x)+(e.vx>0?16:0),e.y-wallHeight(e)))e.vx=-e.vx;}
 /** A falling egg (state 5): the background test runs before the move; landed, it turns into a Spiny walking toward Mario and steps on that row. */
 private updateSpinyEgg(e:Enemy){
  const n=e.pod!,floor=n.speed>=0?this.enemyCollisionAt(e.x+8,e.y):undefined;
  if(floor){e.y=floor.y;e.vy=0;n.speed=0;n.force=0;e.motion=undefined;e.vx=this.spinyLandingVx(e.x);e.x+=e.vx;this.spinyWallTurn(e);return;}
  nativeImposeGravity(n,SPINY_EGG.down,SPINY_EGG.max);e.y=n.y;e.vy=n.speed+n.force/256;
 }
 /** Castle areas whose loop objects follow the native loop-command table (a remake maze spec on such a page is replaced by it). */
 private nativeLoopPage(x:number){const loops=CASTLE_LOOPS[Number(this.level.id[0])];return this.area.theme==='castle'&&Boolean(loops?.some(l=>l.page*256===x));}
 private nativeLoopCommand(){
  const loops=CASTLE_LOOPS[Number(this.level.id[0])],x=this.scrollCrossCamera+LOOP_PARSER_AHEAD;
  if(this.frame!==this.scrollCrossFrame+LOOP_CHECK_ROWS||x%256!==0||!this.nativeLoopPage(x))return;
  const loop=loops.find(l=>l.page*256===x)!,p=this.player,right=Math.floor(p.y)-32===loop.y&&p.grounded;
  if(this.level.id[0]==='7'){if(right)this.loopCorrect++;if(++this.loopPass<3)return;const all=this.loopCorrect===3;this.loopPass=0;this.loopCorrect=0;if(all)return;}
  else if(right)return;
  p.x-=LOOP_BACK;this.camera-=LOOP_BACK;this.areaControls.column-=LOOP_BACK/16;
  // The block buffer is two screens wide and circular, so the columns already drawn (up to the loop page, not yet drawn) stay under Mario;
  // the parser then draws the area again from the loop's resume offset, i.e. the area's own columns from the loop page - 4, unmodified.
  const lo=this.camera-16,hi=x-LOOP_BACK,source=this.mazeSource,tiles=new Map<string,number>();
  for(const [key,id] of this.tiles){const [cx,cy]=key.split(',').map(Number),x=cx*16;if(x<lo)tiles.set(key,id);else if(x>=lo+LOOP_BACK&&x<hi+LOOP_BACK)tiles.set(`${cx-LOOP_BACK/16},${cy}`,id);}
  for(const [cx,cy,id] of source.tiles)if(cx*16>=hi)tiles.set(`${cx},${cy}`,id);
  this.tiles=tiles;
  const redraw=<T extends {x:number}>(now:T[]|undefined,original:T[]|undefined)=>[...(now??[]).filter(t=>t.x<lo),...(now??[]).filter(t=>t.x>=lo+LOOP_BACK&&t.x<hi+LOOP_BACK).map(t=>({...t,x:t.x-LOOP_BACK})),...(original??[]).filter(t=>t.x>=hi).map(t=>({...t}))];
  this.freeTiles=redraw(this.freeTiles,source.freeTiles);
  this.area={...this.area,pipes:redraw(this.area.pipes,source.pipes),springs:redraw(this.area.springs,source.springs),decorations:redraw(this.area.decorations,source.decorations)};
  // KillAllEnemies, and the enemy data restarts from its first object: objects left of the screen's right edge are skipped, the rest load again as they come in range.
  const edge=this.camera+256;
  this.enemies=this.enemies.filter(e=>!e.active&&!e.dead&&e.originX>=edge);
  this.flameFrenzy=false;this.items=this.items.filter(i=>!i.nativeFlame); // KillAllEnemies clears $06CB and every flame slot
  this.firebarSlots?.loopBack(edge); // firebars are enemy objects: killed, and loaded again from the enemy data
  for(const spec of this.area.enemies)if(spec.x>=edge&&!this.enemies.some(e=>e.originX===spec.x&&e.originY===spec.y&&e.kind===spec.kind))this.enemies.push(this.makeEnemy(spec));
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
  this.area.enemies=this.area.enemies.map(e=>({...e,nativeGroup:e.nativeGroup?{...e.nativeGroup,column:shift(e.nativeGroup.column)}:undefined,x:shift(e.x),spawnCamera:e.spawnCamera===undefined?undefined:e.x>=seam?e.spawnCamera+delta:e.spawnCamera}));
  const repeatedEnemies=source.enemies.filter(e=>inSource(e.x)).map(e=>({...structuredClone(e),nativeGroup:e.nativeGroup?{...e.nativeGroup,column:e.nativeGroup.column+offset}:undefined,x:e.x+offset,spawnCamera:e.spawnCamera===undefined?undefined:e.spawnCamera+offset}));
  this.area.enemies.push(...repeatedEnemies);
  for(const enemy of this.enemies)if(enemy.originX>=seam){enemy.x+=delta;enemy.originX+=delta;if(enemy.nativeGroup)enemy.nativeGroup={...enemy.nativeGroup,column:shift(enemy.nativeGroup.column)};if(enemy.spawnCamera!==undefined)enemy.spawnCamera+=delta;}
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
 nativePowerSlot={speed:0,force:0,fraction:0};
 private flagAwardFrame=-1;
 private flagScrollLocked=true;
 private advanceFlag(){const next=nativeFlagStep(this.flagTop,this.nativePowerSlot.fraction);this.flagTop=next.y;this.nativePowerSlot.fraction=next.fraction;Object.assign(this.flagNumber,nativeFlagNumberStep(this.flagNumber.y,this.flagNumber.fraction));if(this.specialSlot5.id===48)this.specialSlot5.y=this.flagTop;}
 private beginFlag(){
  this.jumpPose=false;this.wallDisplayPose=undefined;this.playerAnim.timer=this.playerAnimNmiTimer;this.playerAnim.ctrl=this.playerAnimNmiCtrl;this.climbPoseFrame=Math.floor(this.player.vy)!==0?this.playerAnim.animate(2):this.playerAnim.still();
  this.flagScrollLocked=true;
  this.items=this.items.filter(i=>i.nativePowerState===undefined);
  this.flagAwardFrame=-1;this.flagTop=FLAG_COMPLETION.flagTopY-1;this.advanceFlag();this.flagInside=false;this.flagWait=0;this.flagFireworksAwarded=0;
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
 /** GameEngine still runs RunLargePlatform after PlayerEndLevel/FlagpoleSlide.
  * Its collision/motor/OffscreenBoundsCheck pass does not stop at the pole. */
 private updateFlagPlatforms(oldFeet:number,previousCamera:number){
  const scroll=this.camera-previousCamera;this.platformFrame++;
  this.platformEjection=0;this.updatePlatforms(oldFeet,scroll);
  this.platformMotion.advance(this.platformFrame,this.camera,this.random.frame);this.platformSlotResidues();
  this.gateNativePlatforms(previousCamera);this.busyNativeSlots();
 }
 private updateFlag(){
  const p=this.player,exit=this.area.exit!,rules=FLAG_COMPLETION;
  if(this.flagAwardFrame<0){
   p.climbing=true;if(Math.floor(p.y)<0x9e+32){p.vy=1+255/256;p.y+=p.vy;}else p.vy=0;
   if(this.flagTop>=0xaa||Math.floor(p.y)>=0xa2+32){this.score+=this.flagBonus;this.flagAwardFrame=this.phaseFrame;}
   else this.advanceFlag();
   return;
  }
  if(this.phaseFrame===this.flagAwardFrame+1)this.emit('event_level_clear');
  const walkFrom=this.flagAwardFrame+rules.flipFrames+1;
  if(this.phaseFrame<walkFrom){p.x=exit.x-1+(p.x-Math.floor(p.x));p.climbing=true;p.facing=-1;return;}
  p.climbing=false;p.facing=1;
  const wasInside=this.flagInside;
  {
   if(this.phaseFrame===walkFrom){
    // PlayerEndLevel offsets Mario four pixels from the pole before the next frame's automatic Right press.
    p.x+=4;p.vx=0;p.vy=0;p.grounded=false;const runningSpeed=this.motor.runningSpeed;this.motor.reset(0,-1,1,this.motor.absolute);this.motor.runningSpeed=runningSpeed;this.jumpArc=false;this.bouncing=false;this.walkingOff=false;return;
   }
   const oldX=p.x,wasGrounded=p.grounded;
   if(wasGrounded)this.playerAnim.setSpeed(this.motor.absolute);
   p.vx=this.motor.step({direction:1,ground:wasGrounded,jump:false,b:false,down:false,buttons:true})/4096;
   p.x+=motionOf(this.motor.speed);p.anim+=p.vx;p.grounded=false;
   this.wallSpeed=undefined;this.footPushed=false;this.movePlayerY(p.vy,this.height);
   if(!p.grounded)p.vy=this.nativeFallCap(p.vy+this.fallGravity);
   this.walkOffStart(wasGrounded);
   // ScrollHandler sees the previous screen position and this frame's integer horizontal move.
   const scroll=Math.floor(p.x)-Math.floor(oldX),screenX=Math.floor(oldX)-this.camera;
   this.sideCollisionTimer=Math.max(0,this.sideCollisionTimer-1);
   if(!this.flagScrollLocked&&this.sideCollisionTimer===0&&screenX>=80&&scroll>0)this.camera+=screenX>=112||scroll<2?scroll:scroll-1;
   this.camera=Math.min(this.camera,this.area.width-256);
   this.wallBackOut=false;this.motor.clearContacts();this.movePlayerX(motionOf(this.motor.speed),this.height,false);this.footPushed=false;
   if(this.wallSpeed!==undefined){this.motor.contact(1,true);p.vx=this.motor.speed/4096;this.flagInside=true;}
   if(this.wallSpeed!==undefined||this.wallBackOut)this.sideCollisionTimer=16;
   // PlayerEndLevel clears ScrollLock after AutoControlPlayer, at native y >= $ae; this frame still used the lock.
   if(Math.floor(p.y)>=0xae+32)this.flagScrollLocked=false;
  }
  if(!wasInside)return;
  if(this.time>0){
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
 private beginCastle(){
  if((this.random.frame&7)===0)this.colorRotations--; // GameCoreRoutine skips the GameEngine tail on axe contact.
  this.paletteRemove=true;this.phase='castle';this.phaseFrame=0;this.flagBonus=0;
  this.bridge=[...this.tiles].filter(([,id])=>id===137).sort((a,b)=>Number(b[0].split(',')[0])-Number(a[0].split(',')[0])).map(([key])=>key);
  this.castleStage='bridge';this.emit('command_silence');this.beginNativeVictory();
 }
 get spritePictureOwner(){return this.castlePictures.owner;}
 get castleRetainer(){return this.castlePictures.retainer;}
 enemyPictureShown(e:Enemy){return this.spritePictureOwner==='engine'||this.spritePictureOwner==='victory'&&e===this.victoryBoss;}
 private beginNativeVictory(){
  this.castlePictures.begin();
  const boss=this.enemies.find(e=>e.kind==='bowser'&&e.active),body=boss?.nativeBowser;
  this.victoryBoss=boss;this.victoryMessages=[];this.victoryPending=-1;this.victoryErase='axe';
  const task={bridge:0,fall:0,walk:2,message:3}[this.castleStage];
  this.nativeVictory={task,destination:((Math.floor(this.camera)+255)>>8)+1,walk:0,scrollFraction:0,primary:0,secondary:0,endTimer:0,
   feet:body?.feet??32,controls:body?.controls??0,bridge:0,bossState:boss?.dead?32:0,
   boss:body?{...body.move,y:body.y}:{y:Math.floor(boss?.y??256)-32,speed:0,force:0,fraction:0,timer:0}};
  if(task===0){this.motor.speed=24*256+(this.motor.speed&255);this.player.vx=this.motor.speed/4096;}
 }
 get castleText(){return this.nativeVictory?nativeVictoryText(this.nativeVictory,this.victoryPending<0?this.victoryMessages:[...this.victoryMessages,this.victoryPending],this.currentPlayer):undefined;}
 private updateCastle(){
  if(!this.nativeVictory)this.beginNativeVictory();
  const n=this.nativeVictory!,p=this.player,oldTask=n.task,previousCamera=this.camera;
  if(this.victoryPending>=0){this.victoryMessages.push(this.victoryPending);this.victoryPending=-1;}
  if(this.victoryErase){
   const exit=this.area.exit!,kind=this.victoryErase;this.victoryErase=undefined;
   if(kind==='bridge'){const key=this.bridge.shift();if(key){this.tiles.delete(key);const x=Number(key.split(',')[0])*16;this.freeTiles=this.freeTiles.filter(t=>t.id!==137||t.x<x||t.x>=x+16);}}
   else{const key=kind==='axe'?`${Math.floor(exit.x/16)},${Math.floor((exit.y??0)/16)}`:`${Math.floor(exit.x/16)-1},9`;if(this.tiles.get(key)===(kind==='axe'?197:12))this.tiles.delete(key);}
  }
  this.gameTimerStep(false);this.tickIntervalTimers();
  let poseGround=p.grounded,poseAbsolute=this.motor.absolute,poseWalk=false;
  const result=stepNativeVictory(n,{world:Number(this.level.id[0]),camera:Math.floor(this.camera),playerX:Math.floor(p.x),bossPresent:Boolean(this.victoryBoss),intervalTick:this.intervalControl===20,
   autoControl:walk=>{
    const oldX=p.x,wasGrounded=p.grounded;poseGround=wasGrounded;poseAbsolute=this.motor.absolute;poseWalk=walk;
    if(wasGrounded)this.playerAnim.setSpeed(poseAbsolute);
    this.motor.speed=Math.round(p.vx*4096);
    p.vx=this.motor.step({direction:walk?1:0,ground:wasGrounded,jump:false,b:false,down:false,buttons:walk})/4096;
    const motion=motionOf(this.motor.speed);p.x+=motion;p.anim+=p.vx;if(wasGrounded&&walk)p.facing=1;p.grounded=false;
    // ScrollHandler/ChkPOffscr clamps the integer coordinate, preserving its fraction.
    if(Math.floor(p.x)>Math.floor(this.camera)+239){p.x=Math.floor(this.camera)+239+p.x-Math.floor(p.x);this.motor.speed&=255;p.vx=this.motor.speed/4096;}
    if(Math.floor(p.x)<Math.floor(this.camera)){p.x=Math.floor(this.camera)+p.x-Math.floor(p.x);this.motor.speed&=255;p.vx=this.motor.speed/4096;}
    this.wallSpeed=undefined;this.footPushed=false;this.movePlayerY(p.vy,this.height);
    if(!p.grounded)p.vy=this.nativeFallCap(p.vy+this.fallGravity);
    else{this.jumpArc=false;this.bouncing=false;this.runJump=false;this.mediumJump=false;this.landJump='inactive';}
    this.motor.clearContacts();this.movePlayerX(p.x-oldX,this.height,false);this.walkOffStart(wasGrounded);
    const axe=this.axeFootContact();
    if(axe){this.motor.speed=24*256+(this.motor.speed&255);p.vx=this.motor.speed/4096;}
    return {playerX:Math.floor(p.x),axe};
   }});
  this.camera=result.camera;
  // PlayerVictoryWalk calls UpdScrollVar before VictoryMode's slot0 enemy pass.
  if(this.camera!==previousCamera)this.areaControls.advance(this.parserClock.advance(this.camera-previousCamera,false));
  this.updateLocomotionPose(poseGround,poseAbsolute,false,new Set<Button>(poseWalk?['right']:[]));
  if(result.remove>=0){this.victoryErase=result.remove===0?'axe':result.remove===1?'chain':'bridge';const object=this.areaControls.castleGraphics.find(o=>o.erase===result.remove);if(object)this.blockBackground.set(`${object.column},${object.row}`,null);}
  if(this.victoryBoss){const e=this.victoryBoss;e.y=n.boss.y+32;e.vy=n.boss.speed+n.boss.force/256;delete e.graphics;
   if(e.nativeBowser){e.nativeBowser.y=n.boss.y;e.nativeBowser.move={...n.boss};e.nativeBowser.controls=n.controls;e.nativeBowser.feet=n.feet;}
   if(result.fall){e.dead=1;this.emit('sfx_bowser_falls');}
  }
  if(result.kill){n.bossState=0;this.clearVictoryEnemyBank();this.victoryBoss=undefined;this.emit('command_silence');}
  this.castlePictures.step(n.task,this.camera,this.parserClock.blocked,!this.enemies.some(e=>e.active&&e.enemySlot===0));
  if(result.music)this.emit('event_castle_clear');
  if(result.message>=0){this.victoryPending=result.message;if(Number(this.level.id[0])===8&&result.message===3)this.emit('event_victory');}
  this.castleStage=n.task===0?(n.bossState&64?'fall':'bridge'):n.task<2?'fall':n.task===2?'walk':'message';
  if(oldTask!==3&&n.task===3)this.castleArrivalFrame=this.phaseFrame+1;
  if(result.advance){this.nextLevel(true);return;}
  if(Number(this.level.id[0])===8&&n.task===4&&n.endTimer===0)this.phase='ending';
 }
 /** KillAllEnemies / EraseEnemyObject clears slots0–4; movement bytes and slot5 remain. */
 private clearVictoryEnemyBank(){
  for(const [platform,slot]of this.platformSlots)if(slot<5){this.platformMotion.lost.add(platform as PlatformSpec);this.platformSlots.delete(platform);}
  this.firebarSlots?.eraseAll();this.springTimers.clear();
  for(const controller of this.frenzyControllers)if(controller.slot!==undefined&&controller.slot<5){controller.slot=undefined;controller.lost=true;}
  for(const slot of this.specialSlot5.vineSlots)if(slot<5)this.erasedVineSlots.add(slot);
  this.specialSlot5.frenzyBuffer=0;this.flameFrenzy=false;this.mouthFlame=undefined;
  this.popups=this.popups.filter(p=>p.victim?.enemySlot===undefined||p.victim.enemySlot>=5);
  this.enemies=this.enemies.filter(e=>e.enemySlot===5);this.items=this.items.filter(i=>i.kind!=='flame'||i.nativeFlame?.slot===5);
 }
 private updatePlatforms(oldBottom:number,scroll=0){
  const p=this.player;
  for(const platform of this.area.platforms??[]){
   const prior=this.platformContactPosition(platform,this.platformFrame-1,scroll),now=this.platformMotion.collisionPosition(platform,this.platformFrame);
   const box=nativePlatformLanding(Math.floor(p.y),p.vy,p.x,prior,platform.width,nativeSmallPlatform(platform,this.platformMotion.context),p.size>0);
   if(box===undefined){
    const small=nativeSmallPlatform(platform,this.platformMotion.context);
    for(const offset of small?[0,128]:[0]){
     const surface={x:prior.x,y:small?(Math.floor(prior.y)+offset)&255:prior.y};
     if(small&&surface.y<32)continue;
     const side=nativePlatformSide(Math.floor(p.y),p.vy,p.size>0&&!p.duck,p.x,surface,platform.width,p.size>0);
     if(!side)continue;
     const byte=Math.floor(p.vx*16),into=side>0?byte>=0:byte<1;
     this.motor.contact(side,into);
     if(into){this.wallSpeed=p.vx;p.vx=(Math.round(p.vx*4096)&255)/4096;p.x-=side;this.platformEjection-=side;this.wallBackOut=true;}
     break;
    }
    continue;
   }
   if(p.y!==oldBottom)this.landingFraction=p.y-Math.floor(p.y);
   p.y=box?(Math.floor(now.y)+box)&255:now.y;p.vy=0;p.grounded=true;this.bouncing=false;this.jumpArc=false;this.runJump=false;this.mediumJump=false;this.landJump='inactive';p.x+=Math.floor(now.x)-Math.floor(this.platformMotion.collisionPosition(platform,this.platformFrame-1).x);this.platformMotion.contact(platform,this.platformFrame);
   // native lifts carry the rider by their whole-pixel step and leave his sub-pixel alone (1-3 f573, 6-3 f268: a fractional carry put x 0.45 off on the landing row)
  }
 }
 // BalancePlatform's second object tests the first object's cached box. A
 // later first slot has not rebuilt it against this frame's camera yet, so
 // its box retains the previous scroll offset (4-3 v2 row784: right134 vs131).
 private platformContactPosition(platform:PlatformSpec,frame:number,scroll:number){
  const prior=this.platformMotion.collisionPosition(platform,frame),context=this.platformMotion.context,o=nativePlatformObject(platform,context);
  if(o?.kind==='balance'&&o.side===1){
   const partner=this.area.platforms?.find(p=>{const q=nativePlatformObject(p,context);return q?.kind==='balance'&&q.side===-1&&q.pair?.join(',')===o.pair?.join(',');});
   const slot=this.platformSlots.get(platform),driver=partner&&this.platformSlots.get(partner);
   if(slot!==undefined&&driver!==undefined&&slot>driver)return {x:prior.x+scroll,y:prior.y};
  }
  return prior;
 }
 // Native platforms have a solid underside (ProcLPlatCollisions, see src/native-platform-contact.ts): tested after this frame's move and gravity against the
 // platform before its own move; the speed becomes 1 plus the move force (the fraction of the speed after gravity) and that frame's gravity is already spent.
 // From under the left corner the speed byte is lost as at a wall (6-3 f51775, one sample; native PlatformSideCollisions, not modelled further).
 private platformHeadBump(oldX:number,gravity:number,scroll=0){
  const p=this.player,v=p.vy+gravity;if(v>=0)return;
  for(const platform of this.area.platforms??[]){
   const prior=this.platformContactPosition(platform,this.platformFrame-1,scroll);
   if(nativePlatformHeadBump(Math.floor(p.y),p.size>0&&!p.duck,p.x,prior,platform.width,p.size>0)){p.vy=v-Math.floor(v)+1;this.headBumped=true;if(oldX<prior.x&&p.vx>0){this.wallSpeed=p.vx;p.vx=0;}return;}
  }
 }
 platformPosition(platform:NonNullable<Area['platforms']>[number],frame=this.platformFrame){
  return this.platformMotion.artworkPosition(platform,frame);
 }
 /** Small lifts draw before their motion; large platforms draw after it. Collision continues reading the current step. */
 platformPicturePosition(platform:NonNullable<Area['platforms']>[number]){
  return this.platformPosition(platform,this.platformFrame-(nativeSmallPlatform(platform,this.platformMotion.context)?1:0));
 }
 /** Native EnemiesCollision (src/enemy-collision.ts): walkers, shells and Goomba corpses in native slots, boxes from the position before this frame's move. */
 private collisionBits=[0,0,0,0,0];
 private nativeWalkerContacts(stepFrom:Map<Enemy,{x:number,y:number}>){
  const bits=this.collisionBits;
  const kinds=['goomba','koopa','redKoopa','beetle','paratroopa','spiny'],bodies=[],bySlot=new Map<number,Enemy>();
  for(const [index,e] of this.enemies.entries()){
   const slot=e.enemySlot??index,from=stepFrom.get(e);
   const corpse=e.squashed&&e.dead<90; // a flat Goomba still occupies its native slot until its erase (the remake's slot accounting may have let it go)
   if(!from||!e.active||slot>=5||e.slotFreed&&!corpse||!kinds.includes(e.kind)||e.movingShell||e.dead&&!corpse||corpse&&bySlot.has(slot))continue;
   const turns=!e.dead&&!e.shell&&!(e.egg&&e.motion==='falling')&&(e.kind!=='paratroopa'||isGreenParatroopa(e)&&(e.paratroopaMotion??'bounce')==='bounce');
   bodies.push({slot,x:Math.floor(from.x),y:Math.floor(from.y)-24,tall:e.kind!=='goomba'&&e.kind!=='spiny',turns,reacts:true});bySlot.set(slot,e);
  }
  const {before,after}=nativeEnemiesCollision(bodies,Math.floor(this.camera),this.broClock,this.area.theme==='water',bits);
  for(const s of before){const e=bySlot.get(s)!,from=stepFrom.get(e)!;e.x=from.x-(e.x-from.x);e.vx=-e.vx;} // turned before its own step: the step goes the other way
  for(const s of after){const e=bySlot.get(s)!;e.vx=-e.vx;}
 }
 // Area D: native Red Koopas (1-3, 4-3, 5-3, 7-3, both directions) turn when the point under the sprite centre (x+8) is no longer supported.
 private redKoopaLedgeAhead(e:Enemy){return !this.enemySolid(e.x+8,e.y+3);}
 // Green Paratroopa floor contact (GREEN_PARATROOPA_LANDING): too slow a fall does not register yet; a registered sink of 5 px or more
 // that has a solid floor beside it turns the Paratroopa around before it bounces.
 private advanceNativeBowser(e:Enemy){
  if(e.enemySlot===undefined)this.freeNativeSlot();
  const slot=e.enemySlot??0;
  if(!e.nativeBowser){
   const m=e.nativeBowser=nativeBowserState(e.originX,Math.floor(e.y)-32,this.slotYFraction[slot]);
   m.fireCounter=this.flameTimerCounter;m.move.speed=(this.slotYSpeed[slot]<<24)>>24;m.move.force=this.slotVertical[slot].force;
   m.rearSlot=this.freeNativeSlot();
  }
  const m=e.nativeBowser;m.fireCounter=this.flameTimerCounter;
  const action=stepNativeBowser(m,{frame:this.random.frame,byte:this.random.bytes[slot],playerX:Math.floor(this.player.x),world:Number(this.level.id[0]),hard:this.secondaryHardMode,tickTimers:!this.nmiTimersHeld});
  this.flameTimerCounter=m.fireCounter;
  e.x=m.x-(m.direction&1?16:0);e.y=m.y+32;e.nativeDir=m.direction&1?1:-1;e.vx=m.direction&1?1:-1;e.vy=m.move.speed+m.move.force/256;
  // Keep the existing public motor pose fields synchronized; live motion comes from the native bytes above.
  e.bowser={originX:e.originX,anchor:m.x,speed:m.speed,side:m.direction&1?1:-1,legs:0,rightLimit:m.range,frames:e.age,airborne:m.timer===0,pauseIndex:0,nextHop:e.age+m.timer,nextFlame:e.age+m.fireTimer};
  // BowserControl clears the shared request at its own slot, then may queue
  // $15. Only free slots visited after this slot can consume it this frame.
  this.mouthFlame=undefined;
  if(action.flame){this.mouthFlame=e;this.passNativeMouthFlame(slot+1,5);}
  if(action.hammer&&e.bowserHammers!==false)this.spawnNativeHammer(e);
 }
 /** CheckFrenzyBuffer / SpawnFromMouth: a pending request is consumed in slot order. */
 private passNativeMouthFlame(from:number,to:number){
  const e=this.mouthFlame,m=e?.nativeBowser;if(!e||!m||!e.active||e.dead){this.mouthFlame=undefined;return;}
  if(this.flameTimer>1||this.enemyLoadBlocked)return;
  const used=this.busyNativeSlots();let slot=from;while(slot<to&&used.has(slot))slot++;if(slot>=to)return;
  const target=this.random.bytes[slot]&3,y=m.y+8;this.slotSub[slot]=0;this.slotYFraction[slot]=target;
  this.items.push({kind:'flame',x:(m.x&~255)|((m.x-14)&255),y,vx:this.secondaryHardMode?-1.375:-1.25,vy:0,age:0,life:Infinity,nativeFlame:{slot,target,born:this.frame,force:[144,128,112,144][target]<y?-1:1}});
  this.mouthFlame=undefined;this.emit('sfx_bowser_flame');
 }
 // Archived explicitly seeded calibration motors retain their supplied event phases; live spawns use advanceNativeBowser.
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
   if(o?.kind!=='horizontal'&&o?.kind!=='wrap')continue;
   const threshold=nativePlatformSpawnCamera(o),motion=this.platformMotion,crossed=previousCamera<threshold&&this.camera>=threshold;
   if(motion.lost.has(platform)||!crossed&&!motion.waiting.has(platform)&&(this.platformSlots.has(platform)||this.camera<threshold))continue;
   // ProcessEnemyData skips the row whose AreaParserTaskNum is7, even if
   // a platform's threshold was reached and its native slot is available.
   if(this.parserClock.blocked){motion.waiting.add(platform);continue;}
   if(!this.nativeSlotsFull(platform)){if(motion.waiting.has(platform)){motion.create(platform,this.platformFrame);this.busyNativeSlots();}continue;}
   if(o.x-(o.kind==='wrap'?12:0)>=this.camera+256)motion.waiting.add(platform);else{motion.waiting.delete(platform);motion.lost.add(platform);} // like a lone list object: waits while off screen, else is never made
  }
 }
 private nativePlatformSlots(except?:object){
  const context=this.platformMotion.context;
  const generators=this.frenzyControllers.filter(c=>c.slot!==undefined).length; // the Bullet Bill generator object keeps its own slot (native id 23 at 5-3 x 1312 through rows 560-760)
  return generators+(this.area.platforms??[]).filter(platform=>platform!==except&&nativePlatformHoldsSlot(this.platformMotion,platform,context,this.camera,this.platformFrame)).length;
 }
 private nativeSlotsFull(exceptPlatform?:object,columnPass=false){
  let used=new Set(this.specialSlot5.vineSlots.filter(s=>s<5)).size+(exceptPlatform?this.nativePlatformSlots(exceptPlatform):0); // enemy gating does not count platforms yet: counting them lost a 4-2 Piranha the route keeps (wrap-lift slot release unmeasured)
  for(const e of this.enemies)if((e.slotHeld&&!e.active||this.holdsNativeSlot(e)))used++; // for platforms: an object that fell below the screen has freed its slot (route row 43244: the falling id 1 at y 252 is gone)
  if(columnPass)for(const e of this.enemies)if(this.nativeLoadsThisFrame(e))used++; // the enemy loader runs before the area parser builds the pipe column: an enemy it made this frame already holds a slot (6-2 row 292: the x 688 Paratroopa takes the last slot, no Piranha at 744)
  if(exceptPlatform)for(let slot=0;slot<5;slot++)if(this.slotReleaseFrame[slot]===this.frame&&!this.enemies.some(e=>e.active&&!e.slotFreed&&e.enemySlot===slot))used++;
  return used>=5;
 }
 private holdsNativeSlot(e:Enemy){
  const reach=e.kind==='piranha'||e.kind==='hammerBro'?17:73;
  return e.active&&e.x>=this.camera-reach&&(e.squashed?e.dead<90:e.dead<100||e.x<this.camera-48&&e.x-(e.dead-100)/2>=this.camera-73); // A squashed Goomba holds its slot until its native interval-timer erasure.
 }
 /** Native OffscreenBoundsCheck (after the enemy's own step, against this frame's scrolled ScreenLeft): an object whose 16-bit x is below ScreenLeft - 72, minus the
  * borrow left by the id compare (id < 13: one more), or ScreenLeft + 57 - 73 (= -16) for a Hammer Bro / Piranha Plant, is erased. Flying Cheeps and Bullet Bills have their own rules. */
 private nativeLeftBound(e:Enemy){
  const left=Math.floor(this.camera);
  if(e.kind==='bullet'&&e.frenzy&&e.dead>0&&e.dead<100&&!e.slotFreed)return left-73;
  if(e.motion==='flying'||e.dead)return;
  if(e.kind==='piranha'||e.kind==='hammerBro')return (left&255)+57>255?left-271:left-16; // adc #$38 carries out of the low byte without touching the page: then the bound is 271 px back (5-1 row 406: Piranha at 712 kept with camera 728)
  if(['goomba','koopa','redKoopa','beetle','blooper'].includes(e.kind)||e.kind==='cheep'&&e.swim)return left-73;
  if(e.kind==='paratroopa')return left-72; // walkers and Piranhas only here: other kinds keep their own removal
  if(e.kind==='spiny'||e.kind==='lakitu')return left-72; // erased when x < ScreenLeft - 72 on the post-scroll camera (v2 traces 4-1/6-1/8-2: 26 of 26 left removals at x - camera -73..-75, none at -72)
 }
 private eraseOffscreenEnemies(){
  for(const e of this.enemies){
   if(!e.active)continue;const bound=this.nativeLeftBound(e);
   // OffscreenBoundsCheck's left subtraction leaves carry set after camera
   // reaches 73; the following ADC extends ScreenRight by 73 instead of 72.
   const waterRight=(e.bloop||e.nativeSwim)&&Math.floor(e.x)>=Math.floor(this.camera)+(this.camera>=73?328:327);
   if(bound===undefined||Math.floor(e.x)>=bound&&!waterRight)continue;
   if(e.enemySlot!==undefined&&!e.slotFreed){if(e.pir){this.slotYSpeed[e.enemySlot]=e.pir.flag;this.slotYFraction[e.enemySlot]=e.pir.up;}else if(e.redFlight){this.slotYSpeed[e.enemySlot]=e.redFlight.speed&255;this.slotYFraction[e.enemySlot]=e.redFlight.fraction;}
   else if(e.pod){this.slotYSpeed[e.enemySlot]=e.pod.speed&255;this.slotYFraction[e.enemySlot]=e.pod.fraction;}}
   this.eraseEnemy(e);if(e.kind==='bullet')e.goneFrame=this.frame;if(e.enemySlot===undefined||e.slotFreed)continue;e.slotFreed=true;this.slotReleaseFrame[e.enemySlot]=this.frame;
   if(e.nativeSwim||e.bloop){this.waterSlotPositions[e.enemySlot]={x:e.x,y:e.y-24};this.slotSub[e.enemySlot]=Math.round((e.x-Math.floor(e.x))*256)&255;if(e.nativeSwim)this.slotYFrac[e.enemySlot]=e.nativeSwim.fraction;}
   if(Simulation.SUBPIXEL_WALKERS.includes(e.kind)||e.kind==='spiny'||e.kind==='bullet')this.slotSub[e.enemySlot]=e.redFlight?.originalY??(Math.round((e.x-Math.floor(e.x))*256)&255);
  }
 }
 /** Enemy_Y_Speed $A0+s, Enemy_Y_MoveForce $0434+s and the y fraction $0417+s are not cleared when an object is made: a new jumping Paratroopa starts from what the slot's
  * last occupant left (7-1 row 300: speed -1, force 216 left in slot 0; 61 of 61 zero-start spawns of the v2 traces fall their first pixel on the motion row the carried bytes give).
  * Writers modelled: Paratroopa/Podoboo 8.8 state, a walker's fall, Piranha (flag/down/up y share these bytes), ground walkers and Hammer Bros (speed and force 0). Area loads clear them. */
 slotVertical=[0,1,2,3,4].map(()=>({speed:0,force:0,fraction:0}));
 private rememberSlotVertical(){
  for(const e of this.enemies){
   if(!e.active||e.enemySlot===undefined||e.slotFreed)continue;const m=this.slotVertical[e.enemySlot];
   if(e.pir)Object.assign(m,{speed:e.pir.flag,force:e.pir.down,fraction:e.pir.up});
   else if(e.fall&&!e.dead)Object.assign(m,e.fall);
   else if(e.horizontalFlight)Object.assign(m,{speed:e.horizontalFlight.primary,force:0});
   else if(e.redFlight)Object.assign(m,{speed:e.redFlight.speed,force:e.redFlight.force,fraction:e.redFlight.fraction});
   else if(e.pod&&(e.kind==='podoboo'||e.kind==='paratroopa'||e.kind==='bullet'||e.egg||e.kind==='lakitu'&&e.lak?.box===8))Object.assign(m,{speed:e.pod.speed,force:e.pod.force,fraction:e.pod.fraction});
   else if(!e.dead&&['goomba','koopa','redKoopa','beetle','hammerBro'].includes(e.kind)&&e.vy===0){m.speed=0;m.force=0;}
  }
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
   // Enemy_Y_Speed $A0+s and YMF_Dummy $0417+s stay in the slot for its next object (src/firebar-slots.ts): a Podoboo's speed and fraction, a Piranha's
   // PiranhaPlant_MoveFlag (1 while it moves; 4-4 row 328 -> the bar born in slot 0 on row 712 starts at angle byte 1).
   if(e.redFlight){this.slotYSpeed[e.enemySlot]=e.redFlight.speed&255;this.slotYFraction[e.enemySlot]=e.redFlight.fraction;}
   else if(e.pod){this.slotYSpeed[e.enemySlot]=e.pod.speed&255;this.slotYFraction[e.enemySlot]=e.pod.fraction;}
   else if(e.pir){this.slotYSpeed[e.enemySlot]=e.pir.flag;this.slotYFraction[e.enemySlot]=e.pir.up;}
   else if(e.kind==='piranha'){const phase=(e.age+e.phase!)%PIRANHA.periodNativeFrames;this.slotYSpeed[e.enemySlot]=Number(PIRANHA.stages.find(s=>phase>=s.fromPhaseInclusive&&phase<s.toPhaseExclusive)!.velocity!==0);}
   if(!walker&&e.kind!=='bullet')continue; // Bullet Bills also write the slot's horizontal fraction; stationary objects leave it intact
   this.slotSub[e.enemySlot]=e.redFlight?.originalY??(Math.round((x-Math.floor(x))*256)&255);
  }
 }
 private groupParserSlot=5;
 private groupSlotsBefore=[false,false,false,false,false];
 private renderInitialSpringColumns(){
  if(this.springLoadColumns===0)return;
  for(let column=0;column<2;column++){for(const spring of this.area.springs??[])if(spring.nativeColumn===this.parserColumnX)this.createNativeSpring(spring);this.parserColumnX=(this.parserColumnX+16)&65535;}
  this.springLoadColumns--;
 }
 private createNativeSpring(spring:SpringSpec){
  if(this.springSlots.has(spring))return;const used=this.busyNativeSlots();let slot=0;while(slot<5&&used.has(slot))slot++;
  this.springSlots.set(spring,slot);
  if(slot===5){Object.assign(this.specialSlot5,{flag:(this.specialSlot5.flag+1)&255,id:50,x:spring.x,y:spring.y-24});this.items=this.items.filter(i=>!['mushroom','flower','star','1up'].includes(i.kind));}
 }
 private releaseNativeSprings(){
  for(const [spring,slot]of this.springSlots)if(spring.x<Math.floor(this.camera)-72){this.springSlots.delete(spring);if(slot<5)this.slotReleaseFrame[slot]=this.frame;else if(this.specialSlot5.id===50)this.specialSlot5.erase();}
 }
 private advanceNativeAreaParser(scroll:number){
  const task=this.parserClock.advance(scroll,this.parserVramBusy);
  if(task===7||task===3){this.advanceSpecialSlotParser(this.parserColumnX);for(const spring of this.area.springs??[])if(spring.nativeColumn===this.parserColumnX)this.createNativeSpring(spring);}
  this.areaControls.advance(task);
 }
 private primeNativeEntryObjects(){const busy=this.busyNativeSlots();this.groupSlotsBefore=Array.from({length:5},(_,slot)=>busy.has(slot));const slot=this.groupSlotsBefore.indexOf(false);this.groupParserSlot=slot<0?5:slot;this.passNativeObjects();for(const generator of this.area.generators??[])if(generator.kind==='bullet'&&generator.heights){this.frenzyDue=generator;this.passNativeFrenzy();}}
 private passNativeObjects(){
  if(this.parserClock.blocked)return;
  const entries=[...this.enemies.filter(e=>!e.active&&!e.slotLost&&(e.nativeId!==undefined||e.nativeGroup?.index===0)).map(enemy=>({offset:enemy.nativeOffset??enemy.nativeGroup?.offset??0,column:enemy.nativeColumn??enemy.nativeGroup!.column,enemy,controller:undefined as NativeFrenzyController|undefined})),...this.frenzyControllers.filter(c=>c.slot===undefined&&!c.lost).map(controller=>({offset:controller.offset,column:controller.column,enemy:undefined,controller}))].sort((a,b)=>a.offset-b.offset);
  let cursor=this.groupParserSlot;
  for(const entry of entries){
   const {column,enemy:e,controller}=entry;
   if(column<Math.floor(this.camera)+255){if(e){if(e.nativeGroup){for(const m of this.nativeGroupMembers(e)!)if(!m.active)m.slotLost=true;}else e.slotLost=true;}else controller!.lost=true;continue;}
   if(column>((Math.floor(this.camera)+303)&~15))break;
   const busy=this.busyNativeSlots();while(cursor<5&&(this.groupSlotsBefore[cursor]||busy.has(cursor)))cursor++;
   if(cursor>=5)break;this.groupParserSlot=cursor;
   if(controller){
    if(controller.hardOnly&&!this.secondaryHardMode){controller.lost=true;continue;}
    if(controller.id===52){controller.slot=cursor;controller.x=column+this.slotSub[cursor]/256;cursor++;continue;}
    this.specialSlot5.frenzyBuffer=23;
    if(retainNativeFrenzyController(this.spinyTimer,this.enemies.some(e=>e.active&&e.frenzy&&e.dead<100))){controller.slot=cursor;controller.x=column+this.slotSub[cursor]/256;}
    else{controller.lost=true;this.spawnFrenzyBullet(cursor);}
   }else if(e!.nativeGroup)this.passNativeGroups(column);
   else{
    const e=entry.enemy!;
    e.active=true;e.enemySlot=cursor;e.graphicsVisible=false;e.graphicsFacing=-1;e.vx=e.nativeId===16?0:e.nativeId===14?-0.5:this.primaryHardMode?-0.75:-0.5;e.vy=0;
    e.x=column+(e.nativeId===15?0:this.slotSub[cursor]/256);e.y=e.originY;
    const left=this.slotVertical[cursor];
    if(e.nativeId===14)e.pod={...nativeMoveState(e.y),...left};
    else if(e.nativeId===15)e.redFlight=createNativeRedFlight(e.y,left.fraction);
    else if(e.nativeId===16)e.horizontalFlight={x:e.x,y:e.y,primary:0,secondary:0};
    else e.fall={speed:0,force:0,fraction:left.fraction};
    if(e.nativeId===3)e.walkerState=1; // InitRedKoopa starts falling; only state0 avoids ledges.
    if(e.nativeId!==14){left.speed=0;left.force=0;this.slotYSpeed[cursor]=0;}
    if(e.redFlight)this.slotSub[cursor]=e.redFlight.originalY;
   }
   cursor++;
  }
 }
 private passNativeGroups(onlyColumn?:number){
  if(this.groupParserSlot>=5||this.parserClock.blocked)return;
  const reserved=new Set(this.groupSlotsBefore.flatMap((busy,s)=>busy&&s>=this.groupParserSlot?[s]:[])),seen=new Set<number>();
  for(const e of this.enemies){
   const group=e.nativeGroup;if(!group||onlyColumn!==undefined&&group.column!==onlyColumn||e.active||e.slotLost||seen.has(group.column))continue;
   seen.add(group.column);
   const members=this.nativeGroupMembers(e)!;
   if(group.column<Math.floor(this.camera)+255){for(const m of members)if(!m.active)m.slotLost=true;continue;}
   if(group.column>((Math.floor(this.camera)+303)&~15)||this.availableNativeSlot(undefined,reserved)>=5)continue;
   for(const m of members){
    if(m.active||m.slotLost)continue;
    m.active=true;m.x=Math.floor(this.camera)+255+24*m.nativeGroup!.index;this.takeNativeSlot(m,reserved);
    if(m.enemySlot===undefined){m.active=false;m.slotLost=true;continue;}
    m.vx=this.primaryHardMode?-0.75:-0.5;m.vy=0;m.graphicsVisible=m.enemySlot>this.groupParserSlot;m.graphicsFacing=-1;m.graphicsX=m.x;m.graphicsY=m.y;
    if(m.graphicsVisible)this.captureEnemyGraphics(m);
    if(m.enemySlot>this.groupParserSlot){
     m.age=1;m.x+=m.vx;
     if(!this.collisionAt(m.graphicsX+8,m.y)){
      const n={...nativeMoveState(Math.floor(m.y)),fraction:this.slotVertical[m.enemySlot].fraction};nativeImposeGravity(n,0x3d,3);
      m.fall={speed:n.speed,force:n.force,fraction:n.fraction};m.y=n.y;m.vy=n.speed+n.force/256;
     }
    }
   }
  }
 }
 private busyNativeSlots(except?:Enemy){
  const used=new Set(this.enemies.flatMap(o=>o!==except&&o.enemySlot!==undefined&&!o.slotFreed&&o.active?[o.enemySlot]:[]));
  if(except&&(except.kind==='blooper'&&except.stroke||except.kind==='cheep'&&except.swim))for(let slot=0;slot<5;slot++)if(this.slotReleaseFrame[slot]===this.frame)used.add(slot);
  for(const held of this.objectSlots(used))used.add(held); // a measured firebar or a platform holds its native slot (6-4: bars in slots 0, 2, 4, Podoboos in 1, 3)
  return used;
 }
 private availableNativeSlot(except?:Enemy,reserved?:Set<number>){
  const used=this.busyNativeSlots(except);for(const slot of reserved??[])used.add(slot);
  let slot=0;while(used.has(slot))slot++;return slot;
 }
 private takeNativeSlot(e:Enemy,reserved?:Set<number>){
  const slot=this.availableNativeSlot(e,reserved);if(slot>=5)return;
  e.enemySlot=slot;
  if(e.kind==='blooper'&&e.stroke||e.kind==='cheep'&&e.swim){e.x+=this.slotSub[slot]/256;return;}
  if(!Simulation.SUBPIXEL_WALKERS.includes(e.kind)||e.motion==='flying')return;
  const follower=Boolean(this.nativeGroupIndex(e)); // a group follower takes a later slot than the one being processed, so it already steps on its creation frame
  e.x+=this.slotSub[slot]/256+(follower&&!e.nativeGroup?e.vx:0);
 }
 // A Piranha takes a slot when its pipe column is built (5-1 uses the measured task clock; other levels retain their qualified358px lead); a slot-gated list object when it triggers. Without a free slot a Piranha or group member is lost; a lone list object waits while still off screen.
 private nativeSlotDenied(e:Enemy,columnPass=false){
  if(e.slotLost)return true;
  if(e.slotHeld||e.kind!=='piranha'&&!e.nativeSlot)return false;
  const due=e.kind==='piranha'?(this.piranhaColumns?e.x<=this.piranhaColumns.through:e.x<this.camera+358)&&e.x>=this.camera:(e.spawnCamera!==undefined&&!(e.kind==='blooper'&&e.stroke||e.kind==='cheep'&&e.swim)?this.camera>=e.spawnCamera:e.x<this.camera+304)&&e.x>this.camera-32; // behind the activation edge (a checkpoint respawn starts past it) the object is never made: it must not hold a slot
  if(!due)return false;
  if(!this.nativeSlotsFull(undefined,columnPass)){e.slotHeld=true;if(e.autoPhase)e.slotBorn=this.broClock;return false;}
  if(e.nativeSlot==='wait'&&e.x>=this.camera+256)return true;
  e.slotLost=true;return true;
 }
 // A Piranha is made at the rise start (phase 111, hidden) when its pipe column is built, 358 px ahead of the camera, and runs from then on; the remake activates it at 304, so the frames in between (they depend on how fast Mario scrolls) are added to its age. Native births: y rises within 1-2 rows (evidence/piranha-findings-20261111.md).
 private startBornPiranha(e:Enemy){if(Math.abs(this.player.x-e.x)>PIRANHA.proximity.maximumInhibitedIntegerSeparation){e.phase=PIRANHA.stages[2].fromPhaseInclusive;e.age=this.broClock-e.slotBorn!;}}
 /** Delayed ordinary activation uses the loader guard observed on the preceding native birth pass.
  * Groups and post-scroll slot reservation read the current task before UpdScrollVar advances it. */
 private get enemyLoadBlocked(){return this.parserLoaderWasBlocked;}
 // Podoboos and jumping Paratroopas load on the frame whose camera reaches x - 303 (native loader; 5-4 Podoboo x 320 at camera 17, x 480 at 177, 8-2 Paratroopa x 384 at 82):
 // their recorded spawnCamera (the first camera of the measured route past that point) is not used.
 // Kinds the native loader makes by the generic column rule rather than a recorded spawn camera. A Blooper: 25 of 25 native spawns of the 2-2/7-2 v2 traces
 // load when x - camera <= 303 (the recorded spawnCamera of 2-2's first Blooper is one row late).
 private nativeLoadRule(e:Enemy){return e.kind==='podoboo'||e.kind==='cheep'&&Boolean(e.swim)||e.kind==='blooper'&&Boolean(e.stroke)||isGreenParatroopa(e)&&(e.paratroopaMotion??'bounce')==='bounce';}
 /** An inactive enemy that the remake activates on the next frame, i.e. one the native loader makes on this frame (after this frame's scroll). */
 private nativeLoadsThisFrame(e:Enemy){
  return !e.active&&!e.slotLost&&e.kind!=='piranha'&&(e.spawnCamera!==undefined&&!this.nativeLoadRule(e)?this.spawnCameraReached(e):e.x<this.camera+304)&&e.x>this.camera-32&&!this.parserClock.blocked&&(e.spawnFrame===undefined||this.areaFrame+1>=e.spawnFrame);
 }
 /** Ordinary water objects are initialized in the enemy-slot pass after ScrollHandler, before the swimming frenzy sees free slots. Their first movement is next row. */
 private birthNativeWaterEnemies(){
  if(this.waterEnemyStream){this.passNativeWaterStream();return;}
  for(const e of this.enemies){
   if(e.active||!(e.kind==='blooper'&&e.stroke||e.kind==='cheep'&&e.swim)||!this.nativeLoadsThisFrame(e)||e.spawnFrame!==undefined&&this.areaFrame<e.spawnFrame)continue;
   if(this.nativeSlotDenied(e))continue;
   e.active=true;this.takeNativeSlot(e);
   if(e.enemySlot===undefined){e.active=false;if(e.x<this.camera+256)e.slotLost=true;continue;}
   if(e.kind==='blooper')e.bloop=newNativeBlooper();
   else e.nativeSwim={y:Math.floor(e.y)-24,fraction:this.slotYFrac[e.enemySlot],flag:this.random.bytes[e.enemySlot]&16,originY:(Math.floor(e.originY)-24)&255};
  }
 }
 /** TimerControl stops sprite alternation as well as motion. Death initializes $FF; the NMI counts it down. */
 get nativeTimersStopped(){return Boolean(this.powerChange)||this.phase==='dying'&&!this.offscreenPitDeath&&!this.offscreenLavaDeath&&this.phaseFrame<255;}
 enemyPictureTimersStopped(e:Enemy){return enemyPictureTimersStopped(e,this.frame,this.nativeTimersStopped);}
 private captureEnemyGraphics(e:Enemy){e.graphicsFrame=this.frame;e.graphicsTimersStopped=this.nativeTimersStopped;captureEnemyPicture(e);}
 private updateEnemies(oldBottom:number){
  this.broClock++;
  if(this.mouthFlame)this.passNativeMouthFlame(0,this.mouthFlame.enemySlot??0);
  this.releaseNativeSlots();
  if(this.nativeSwimFrenzyArea())this.enemies=this.enemies.filter(e=>e.active||!(e.kind==='cheep'&&e.swim)); // discard legacy generated roster before it can claim checkpoint slots
  this.syncSpecialPowerup();this.nativeFrenzyTurn=undefined;if(!this.nmiTimersHeld&&this.nativeStompTimer)this.nativeStompTimer--;
  let reservedClaim:{flag:number;id:number;buffer:number}|undefined;const previousReserved={flag:this.specialSlot5.flag,id:this.specialSlot5.id,buffer:this.specialSlot5.frenzyBuffer};
  if(this.specialSlot5.frenzyQueue&&!this.parserClock.blocked){const slot=this.freeNativeSlot();this.nativeFrenzyTurn=this.specialSlot5.consumeFrenzy(slot<5?slot:this.specialSlot5.flag?6:5);}
  if(this.nativeFrenzyTurn?.slot===5){reservedClaim={flag:this.specialSlot5.flag,id:this.specialSlot5.id,buffer:this.specialSlot5.frenzyBuffer};Object.assign(this.specialSlot5,{flag:previousReserved.flag,id:previousReserved.id,frenzyBuffer:previousReserved.buffer});}
  const busy=this.busyNativeSlots();this.groupSlotsBefore=Array.from({length:5},(_,s)=>busy.has(s));
  const firstFree=this.groupSlotsBefore.indexOf(false);this.groupParserSlot=firstFree<0?5:firstFree;this.updateNativeWarpZones();
  const p=this.player;
  const frenzy=this.spinyFrenzyBefore();
  {const speedByte=Math.floor(Math.round((this.wallSpeed??p.vx)*4096)/256);if(speedByte!==0)this.marioMotion=Math.sign(speedByte);} // Player_MovingDir changes on a nonzero speed byte, before background wall stops
  this.stompedThisStep=false;
  const stepFrom=new Map<Enemy,{x:number,y:number}>(); // each enemy before this frame's move (native EnemiesCollision boxes)
  const ordered=this.area.theme==='water'?[...this.enemies].sort((a,b)=>(a.enemySlot??5)-(b.enemySlot??5)):this.enemies;
  for(const e of ordered){
   const priorY=e.y,priorX=e.x,priorFraction=e.pod?.fraction??e.fall?.fraction??e.redFlight?.fraction??(e.kind==='bullet'&&e.enemySlot!==undefined?this.slotVertical[e.enemySlot]?.fraction??0:0); // the native touch test reads the enemy before its own move
   let revivedShell=false,stompY=priorY,stompFall=e.fall?{...e.fall}:undefined;
   if(e.active)e.graphicsVisible=true; // this slot reaches its native EnemyGfxHandler
   if(!e.active&&this.area.theme==='water'&&(e.stroke||e.swim)&&Math.floor(e.x)<Math.floor(this.camera)+255){e.slotLost=true;continue;} // native PositionEnemyObj discards columns left of ScreenRight
   if(!e.active&&e.nativeColumn!==undefined&&e.nativeColumn<Math.floor(this.camera)+255){e.slotLost=true;continue;}
   if(!e.active&&e.nativeWaterOffset!==undefined)continue;
   if(!e.active&&(e.nativeGroup||e.nativeId!==undefined))continue; // native group loading runs after this frame's scroll
   if((e.kind!=='bullet'||e.frenzy)&&e.kind!=='bowser'){e.graphicsFacing=e.kind==='bullet'?(e.direction??-1):e.kind==='paratroopa'&&e.nativeId===16?((e.horizontalFlight?.primary??0)&2?1:-1):Math.sign(e.vx);e.graphicsX=e.x;e.graphicsY=e.y;} // RunNormalEnemies draws before this slot's movement and enemy turns
   this.captureEnemyGraphics(e);
   if(!e.active&&this.nativeSlotDenied(e))continue;
   if(!e.active&&e.kind==='piranha'&&this.piranhaColumns){if(!e.slotHeld)continue;e.active=true;this.takeNativeSlot(e);this.startNativePiranha(e);}
   if(!e.active){if((e.spawnCamera!==undefined&&!this.nativeLoadRule(e)?this.spawnCameraReached(e):e.x<this.camera+304)&&e.x>this.camera-32&&!this.enemyLoadBlocked&&(e.spawnFrame===undefined||this.areaFrame>=e.spawnFrame)){if(this.nativeGroupIndex(e)!==undefined){for(const m of this.nativeGroupMembers(e)!)if(!m.active&&!m.slotLost)this.activateNativeGroupMember(m);if(!e.active)continue;}else{e.active=true;e.x+=this.spawnGroupShift(e);this.takeNativeSlot(e);if(e.enemySlot===undefined){e.active=false;if(e.kind==='podoboo')e.waitedForNativeSlot=true;else if(Math.floor(e.x)<Math.floor(this.camera)+255)e.slotLost=true;continue;}}}else continue;if(e.nativeBro)e.nativeLive=true;if((e.kind==='paratroopa'||e.kind==='beetle')&&!e.shell)e.vx=(p.x<e.x?-1:1)*Math.abs(e.vx||0.5);} // measured: native Paratroopas and Beetles (44/44 and 21/21) start walking toward Mario
   if(e.slotBorn!==undefined&&e.age===0)this.startBornPiranha(e);
   stepFrom.set(e,{x:e.x,y:e.y});
   e.age++;
   if(e.bbCheck)continue; // a fresh cannon object waits for the cannon pass (nativeBulletBillCheck)
   if(e.dead){
    if(e.kind==='lakitu'&&e.lak?.box===8&&e.pod){this.moveDefeatedRespawnLakitu(e);continue;}
    if(e.squashed){if(e.dead<90&&++e.dead>(e.squashFrames??goombaSquashRules.durationActiveNativeFrames))this.eraseEnemy(e);continue;}
    if(e.kind==='bullet'&&e.pod){if(e.dead>=100||e.slotFreed)continue;if(e.frenzy&&e.y>=280){this.eraseDefeatedBullet(e);continue;}nativeImposeGravity(e.pod,e.frenzy?0x1c:0x3d,3);e.y=e.pod.y;e.vy=e.pod.speed+e.pod.force/256;if(!e.frenzy&&e.y>=280)this.eraseDefeatedBullet(e);continue;}
    e.dead++;
    if(e.greenShellLaunchFrame!==undefined){
     if(this.frame>e.greenShellLaunchFrame){e.x+=shellLaunchRules.velocityX;e.y+=e.vy;e.vy=Math.min(shellLaunchRules.maxFall,e.vy+shellLaunchRules.gravity);}
     continue;
    }
    if(e.dead>20||e.vy!==0){e.y+=e.vy;e.vy+=0.25;}continue;
   }
   const eraseWalkerAfterMove=NATIVE_FALLERS.includes(e.kind)&&!e.shell&&!e.motion&&e.y>280;
   if(eraseWalkerAfterMove)e.walkerState=0; // EraseEnemyObject clears state before the caller moves horizontally, leaving all vertical bytes intact.
   if(e.kind==='bullet'?this.nativeBulletGone(e):this.nativeLeftBound(e)===undefined&&e.x<this.camera-(e.kind==='lakitu'||e.kind==='spiny'||e.kind==='blooper'||e.kind==='cheep'||e.kind==='podoboo'?73:48)||(e.kind==='spiny'?e.y>=280:e.y>280)&&e.kind!=='podoboo'&&!eraseWalkerAfterMove){this.eraseEnemy(e);if(e.kind==='bullet')e.goneFrame=this.frame;if((e.nativeFlight||e.nativeSwim)&&e.enemySlot!==undefined)this.leaveFlyingCheepSlot(e);continue;}
   const isWater=e.kind==='blooper'||e.kind==='cheep';
   const nativeWaterActor=this.area.theme==='water'&&isWater&&(e.swim||e.stroke);
   // RunNormalEnemies tests injury before its movement; TimerControl set by
   // the hit also holds this slot and every later slot in the native pass.
   if(nativeWaterActor&&!p.star){
    const x=p.x-this.swimPull,y=p.y-this.water.whirlMoved-32;
    if(!p.dead&&!this.enemyContactOff&&!(this.random.frame&1)&&y>=0&&y<0xd0&&nativeWaterEnemyHit({x,y,big:p.size>0,duck:p.duck},{x:priorX,y:priorY-24}))this.hurt();
    if(p.dead||this.powerChange)continue;
   }
   if(e.motion==='flying'){
    if(e.nativeFlight){if(e.age>1){const n=e.pod??=flyingCheepLaunch();e.x+=e.vx;moveFlyingCheep(n);e.y=n.y+24;e.vy=n.speed+n.force/256;}} // the spawn step holds the launch position (src/flying-cheep.ts)
    else{e.x+=e.vx;e.y+=e.vy;e.vy=Math.min(4,e.vy+0.125);}
   }else if(e.pir){this.updateNativePiranha(e);
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
    if(e.kind==='blooper'&&e.stroke)this.updateNativeBlooper(e);
    else if(e.kind==='cheep'&&e.swim){
     if(e.enemySlot===undefined)this.freeNativeSlot();
     const slot=e.enemySlot!,n=e.nativeSwim??={y:Math.floor(e.y)-24,fraction:this.slotYFrac[slot],flag:this.random.prev[slot]&16,originY:(Math.floor(e.originY)-24)&255};
     e.x=moveSwimmingCheep(n,e.x,e.palette==='0f-16-30-27'?11:10,slot);e.y=n.y+24;
    }else{
    const speed=e.kind==='cheep'?SWIMMING_CHEEP_SPEEDS[e.palette??'']:undefined;
    e.x+=speed===undefined?e.vx*(e.kind==='blooper'?0.8:1.5):Math.sign(e.vx)*speed;e.y=e.swim?e.originY+swimBobOffset(e.swim.bob,e.age-1):e.originY+Math.sin(e.age/40)*24;
    if(e.kind==='blooper'&&e.age%120<40){e.x+=Math.sign(p.x-e.x)*0.5;e.y-=0.4;}
    }
   }else if(e.kind==='bullet'){if(!e.nativeShot||e.age>1)e.x+=Math.sign(e.vx)*BULLETS.speed;} // a native shot holds its spawn row
   else if(e.kind==='lakitu'){
    this.updateNativeLakitu(e);
   }
   else if(e.kind==='bowser'&&(e.nativeBowser||!e.bowser)){this.advanceNativeBowser(e);}
   else if(e.kind==='hammerBro'){
    this.updateNativeHammerBro(e);
   }
   else if(e.kind==='paratroopa'&&e.nativeId===16){const n=e.horizontalFlight!;e.vx=advanceNativeHorizontalFlight(n,this.broClock);e.x=n.x;e.y=n.y;e.vy=0;}
   else if(e.kind==='paratroopa'&&(e.paratroopaMotion??(e.palette==='0f-16-30-27'?'vertical':'bounce'))!=='bounce'){
    if((e.paratroopaMotion??'vertical')==='vertical'){
     const n=e.redFlight??=createNativeRedFlight(e.originY,e.enemySlot===undefined?0:this.slotVertical[e.enemySlot].fraction);
     advanceNativeRedFlight(n,this.broClock);e.x=e.originX;e.y=n.y;e.vy=n.speed+n.force/256;
    }else{const offset=(1-Math.cos(e.age/48))*(e.range??48);e.x=e.originX+offset*(e.direction??-1);e.y=e.originY;e.vy=0;}
   }
   else{
    if(e.kind==='bowser'){
     this.advanceBowser(e);
     const facing=p.x<e.x?-1:1;
     const throwsHammers=e.bowserHammers??['6-4','7-4','8-4'].includes(this.level.id),burst=e.age%180;
     if(throwsHammers&&burst>=48&&burst<=108&&burst%12===0)this.items.push({kind:'hammer',x:e.x+8,y:e.y-32,vx:facing*1.5,vy:-4.5,age:0,life:150});
    }
    if(e.shell){
     e.shellAge=e.movingShell?0:(e.shellAge??0)+1;
     e.shellTimer??=this.primaryHardMode?11:16;
    }
    if(!eraseWalkerAfterMove&&e.kind==='redKoopa'&&(e.nativeId===undefined||e.nativeId===3)&&(e.walkerState??0)===0&&!e.shell&&this.redKoopaLedgeAhead(e))e.vx=-e.vx;
    const greenBounce=e.kind==='paratroopa'&&e.palette!=='0f-16-30-27';
    const normalWalker=NATIVE_FALLERS.includes(e.kind)&&(!e.shell||!e.movingShell)&&!e.motion;
    const dx=e.shell?(e.movingShell?Math.sign(e.vx)*shellRules.speedPixelsPerNativeFrame:0):e.vx;
    if(!greenBounce&&!normalWalker){
     if(e.kind==='beetle'){
      // Background collision precedes the move (8-1 Beetle rows 624-625).
      if(this.enemySolid(Math.floor(e.x)+(dx>0?16:0),e.y-wallHeight(e)))e.vx=-e.vx;
      e.x+=dx===0?0:Math.sign(e.vx)*Math.abs(dx);
     }else{
      e.x+=dx;
      if(nativeWalkerWallTurn(e.kind)){if(this.enemySolid(Math.floor(e.x)+(dx>0?16:0),e.y-wallHeight(e)))e.vx=-e.vx;}
      else if(this.enemySolid(e.x+(dx>0?15:1)+wallReach(e,dx),e.y-wallHeight(e))){e.x-=dx;e.vx=-e.vx;}
     }
    }
    if(greenBounce){
     // Native jumping Paratroopa (id 14, RunNormalEnemies: background collision before the move). EnemyJump: with speed byte + 2 >= 3 (falling at 1+ or rising at 3+) and a solid block under
     // its feet, EnemyLanding zeroes the speed, snaps native y to (y & 0xF0) | 8 and sets speed -3; then MoveJ_EnemyVertically (28/256 per frame, cap 3). 8-2 slot 3 rows 83-164: every row.
     // Side collision reads the snapped position before either horizontal or vertical movement.
     // first motion row: the 8.8 speed is the stored vy plus one gravity step (vy holds the speed before this row's gravity; a spawned one is at rest unless a spawnVy was measured)
     const n=e.pod??=(()=>{const left=e.enemySlot!==undefined&&!e.unwingedAir&&e.age<=1?this.slotVertical[e.enemySlot]:undefined;if(left)return {...nativeMoveState(Math.floor(e.y)),...left};const v=Math.round((e.vy+GREEN_PARATROOPA_PHYSICS.gravity)*256);return {...nativeMoveState(Math.floor(e.y)),speed:v>>8,force:v&255,fraction:Math.round((e.y-Math.floor(e.y))*256)&255};})(); // a new one starts from the vertical bytes its slot was left with (slotVertical)
     const step={x:e.x,vx:e.vx,y:n.y,speed:n.speed,force:n.force,fraction:n.fraction};
     advanceNativeGreenParatroopa(step,(x,y)=>Boolean(this.enemyCollisionAt(x,y)));
     Object.assign(n,{y:step.y,speed:step.speed,force:step.force,fraction:step.fraction});
     e.x=step.x;e.vx=step.vx;e.y=n.y;e.vy=n.speed+n.force/256;
    }else if(e.egg&&e.motion==='falling')this.updateSpinyEgg(e);
    else if(normalWalker){
     const n=e.fall??=(e.pod?{speed:e.pod.speed,force:e.pod.force,fraction:e.pod.fraction}:{speed:0,force:0,fraction:e.enemySlot!==undefined?this.slotVertical[e.enemySlot].fraction:0});
     e.walkerState??=(n.speed||n.force||e.unwingedAir?1:0);
     const rawY=(Math.floor(e.y)-24)&255;
     // EnemyToBGCollisionDet precedes MoveNormalEnemy. The feet probe is
     // rawY+24, but LandEnemyProperly tests rawY's low nibble, 8..12.
     if(((rawY+0x3e)&255)>=0x44&&(e.kind!=='spiny'||rawY>=0x25)){
      const ground=this.enemyCollisionAt(Math.floor(e.x)+8,e.y),depth=((rawY&15)-8)&255;let landed=false;
      // Explicit off-grid artwork rectangles retain their actual support height.
      if(ground&&(depth<5||ground.y%16!==0)){
       if(e.shell&&e.walkerState>=3)landed=true;
       if(e.walkerState===2){landed=true;const step={x:e.x,y:e.y,vx:e.vx,...n};landNativeWalker(step,true,p.x);e.y=ground.y%16?ground.y:step.y;n.speed=step.speed;n.force=step.force;e.walkerState=3;e.shellTimer=16;}
       else if(e.walkerState===1){
        landed=true;const step={x:e.x,y:e.y,vx:e.vx,...n};landNativeWalker(step,e.kind==='goomba'||e.kind==='spiny',p.x);
        e.y=ground.y%16?ground.y:step.y;e.vx=step.vx;n.speed=step.speed;n.force=step.force;e.walkerState=0;
        if(e.kind==='spiny')e.vx=this.spinyLandingVx(e.x);
       }
      }else if(!(e.kind==='redKoopa'&&(e.nativeId===undefined||e.nativeId===3)&&e.walkerState===0))e.walkerState=e.shell?2:1;
      if(!landed&&rawY>=0x20&&this.enemySolid(Math.floor(e.x)+(e.vx>0?16:0),e.y-4))e.vx=-e.vx;
     }
     if(e.shell&&e.walkerState>=3&&e.shellTimer===0){e.shell=false;e.walkerState=0;e.shellAge=0;e.shellChain=0;e.direction=(this.random.frame&1)?-1:1;e.vx=e.direction*(this.primaryHardMode?0.75:0.5);revivedShell=true;}
     stompY=e.y;stompFall={...n};
     if(e.walkerState===1||e.walkerState===2){const m={y:Math.floor(e.y),speed:n.speed,force:n.force,fraction:n.fraction,timer:0};nativeImposeGravity(m,0x3d,3);Object.assign(n,{speed:m.speed,force:m.force,fraction:m.fraction});e.y=m.y;}
     if(!revivedShell&&(!e.shell||e.walkerState===2))e.x+=e.vx;e.vy=n.speed+n.force/256;
    }
    else{e.vy=Math.min(greenBounce?GREEN_PARATROOPA_PHYSICS.maxFall:4,e.vy+(greenBounce?GREEN_PARATROOPA_PHYSICS.gravity:e.kind==='bowser'?BOWSER_HOP.gravity:0.25));e.y+=e.vy;}
    const floor=this.enemyCollisionAt(e.x+8,e.y);
    if(!greenBounce&&!(NATIVE_FALLERS.includes(e.kind)&&(!e.shell||!e.movingShell)&&!e.motion)&&!(e.egg&&e.motion==='falling')&&e.vy>=0&&floor){e.y=floor.y;e.vy=greenBounce?GREEN_PARATROOPA_PHYSICS.bounce:e.kind==='paratroopa'?-3:0;if(e.motion==='falling'){e.motion=undefined;if(e.kind==='spiny')e.vx=p.x<e.x?-0.5:0.5;}}
    if(e.kind==='bowser')this.bowserLanded(e,p);
   }
   // EnemyGfxHandler may erase a page2 walker, but RunNormalEnemies still
   // returns through its BG/movement caller. Its final X fraction survives.
   if(eraseWalkerAfterMove){
    this.eraseEnemy(e);e.slotFreed=true;
    if(e.enemySlot!==undefined){const slot=e.enemySlot;this.slotReleaseFrame[slot]=this.frame;this.slotSub[slot]=Math.round((e.x-Math.floor(e.x))*256)&255;if(e.fall)Object.assign(this.slotVertical[slot],e.fall);}
    continue;
   }
   if(e.shell&&e.movingShell)for(const other of this.enemies)if(other!==e&&other.active&&!other.dead&&Math.abs(e.x-other.x)<14&&Math.abs(e.y-other.y)<20){
    const groundedGreenLaunch=e.kind==='koopa'&&e.vx>0&&(e.palette===undefined||e.palette==='0f-1a-30-27')&&other.kind==='goomba'&&(other.palette===undefined||other.palette==='0f-0f-36-17')&&other.vy===0&&this.enemySolid(other.x+8,other.y+1);
    other.dead=1;other.vy=groundedGreenLaunch?shellLaunchRules.initialVelocityY:-3;
    if(groundedGreenLaunch)other.greenShellLaunchFrame=this.frame;
    // Six consecutive victims are observed. Later awards provisionally retain
    // the final measured value; an extra life has not been established.
    this.floateyScore(shellRules.victimScores[Math.min(e.shellChain??0,shellRules.victimScores.length-1)]);e.shellChain=(e.shellChain??0)+1;this.emit('sfx_kick');
   }
   if(p.dead||this.enemyContactOff)continue;
   if(nativeWaterActor){
    if(!p.star)continue;
    const x=p.x-this.swimPull,y=p.y-this.water.whirlMoved-32;
    if(this.random.frame&1||y<0||y>=0xd0)continue;
    if(nativeWaterEnemyHit({x,y,big:p.size>0,duck:p.duck},{x:priorX,y:priorY-24})){
     if(p.star){e.dead=1;e.vy=-4;this.floateyScore(100);this.emit('sfx_kick');}else this.hurt();
    }
    continue; // HandlePECollisions branches directly to InjurePlayer in a water area: no stomp.
   }
   if(Math.floor(p.y)-32<0||Math.floor(p.y)-32>=0xd0)continue; // offscreen fall, with enemies still moving
   if(this.broClock%2!==0)continue; // PlayerEnemyCollision returns at once when FrameCounter $09 (broClock) is odd: no touch, stomp or star kill (25 of 25 native enemy-contact deaths are on even rows; 8-2 row 168)
   if(e.nativeBowser){
    if(nativeBowserHit(e.nativeBowser,p,this.random.frame)){if(p.star){e.dead=1;e.vy=-4;this.floateyScore(200);this.emit('sfx_kick');}else this.hurt();}
    continue;
   }
   if(e.kind==='lakitu'&&e.lak?.box===8){this.contactRespawnLakitu(e,priorX,priorY);continue;}
   const eh=e.kind==='bowser'?32:e.kind==='hammerBro'||e.kind==='piranha'?24:e.kind==='goomba'?10:e.kind==='bullet'?BULLETS.hitHeight:['koopa','redKoopa','paratroopa','beetle','spiny'].includes(e.kind)?8:16;
   const ew=e.kind==='bowser'?32:16;
   if(e.unwingedAir){if(e.vy===0&&e.unwingedAir!==this.frame)delete e.unwingedAir;else continue;} // just unwinged: native state byte 1 until it lands (3-1 21012-21029, 8-2 70096-70104); Mario falls past it
   const stompWindow=this.nativeStompWindow(e,p,priorX,priorY),chkInj=this.nativeChkInjStomp(e,p,priorX,priorY);
   if(!chkInj&&(stompWindow===false||stompWindow===undefined&&!overlap(p.x+3,p.y-this.height+2,10,this.height-3,e.x+2,e.y-eh,ew-4,eh))){if(e.unwingedBounce)delete e.unwingedBounce;delete e.kickOverlap;if((p.vy<=0||e.kind==='spiny')&&!this.bouncing&&!e.shell&&(Math.abs(e.x-p.x)<11||this.koopaSideReach(e.kind,priorX))&&this.nativeTouch(e,priorY,false))this.hurt();continue;} // above the stomp box a rising or standing Mario is still hurt
   if(e.kickOverlap)continue;
   // The newly unwinged Koopa and Mario can still overlap while the stomp
   // bounce separates them. Keep other enemies and later contacts dangerous.
   if(e.unwingedBounce){if(p.vy<0&&oldBottom<=e.y+1)continue;delete e.unwingedBounce;}
   if(p.star){e.dead=1;e.vy=-4;this.floateyScore(100);if(e.kind==='goomba')this.enemyPopup(100,e);this.emit('sfx_kick');continue;}
   const stompable=!['piranha','spiny','podoboo','bowser','blooper'].includes(e.kind);
   if(this.kickRestingShellFromAbove(e,oldBottom))continue;
   if(stompable&&((Math.floor(p.vy)>0||this.stompedThisStep)&&(oldBottom<=e.y+1||stompWindow===true||this.risingParatroopaStomp(e,p))||chkInj)){
    if(chkInj&&!(Math.floor(p.vy)>0||this.stompedThisStep))p.vy=this.stompBounceVy(p.vy,e.kind); // SBnce only stores the speed byte; a rising Mario keeps his jump gravity.
    else{p.vy=this.stompBounceVy(p.vy,e.kind);this.bouncing=true;this.stompBounce();this.landJump='inactive';p.grounded=false;}
    // First Paratroopa contacts award 400; subsequent ordinary +100 is observed.
    // Nonzero-chain Paratroopa scoring remains an unmeasured fallback.
    if(['goomba','koopa','redKoopa','beetle'].includes(e.kind))this.nativeStompTimer=(this.nativeStompTimer+1)&255;
    if(e.kind==='bullet'&&e.frenzy)e.x=priorX;
    const award=e.kind==='bullet'?200:e.kind==='hammerBro'?HAMMER_NATIVE.stompScore:e.kind==='paratroopa'&&this.stompChain===0?stompRules.firstParatroopa:this.stompAward();this.stompedThisStep=true;this.floateyScore(award); // a stomped Hammer Bro: +1000 in all 3 native stomps (3-1, 5-2, 7-1), not a chain step (chain behaviour unmeasured)
    // A Paratroopa stomp shows a popup in the reference; its Koopa offset and lifetime are inferred.
    if(e.kind==='goomba'||e.kind==='koopa'||e.kind==='redKoopa'||e.kind==='paratroopa'||e.kind==='hammerBro'||e.kind==='bullet')this.enemyPopup(award,e);
    this.emit('sfx_stomp');
    if(['koopa','redKoopa','paratroopa','beetle'].includes(e.kind)){
     if(e.kind==='paratroopa'){e.kind=e.palette==='0f-16-30-27'?'redKoopa':'koopa';e.nativeId=e.kind==='redKoopa'?1:0;const unwinged=nativeUnwingedStomp(priorX+(e.redFlight?.originalY??0)/256,priorY,priorFraction,p.x);delete e.redFlight;delete e.horizontalFlight;e.fall={speed:0,force:0,fraction:unwinged.fraction};e.vx=unwinged.vx;e.x=unwinged.x;e.y=unwinged.y;if(e.pod)Object.assign(e.pod,{y:unwinged.y,speed:0,force:0,fraction:unwinged.fraction});e.unwingedBounce=true;e.unwingedAir=this.frame;}
     else if(!e.shell){e.shell=true;e.movingShell=false;e.shellAge=0;e.shellChain=0;e.x=priorX;e.y=stompY;e.fall=stompFall;e.walkerState=4;e.shellTimer=this.primaryHardMode?11:16;if(stompFall)e.vy=stompFall.speed+stompFall.force/256;} // HandleStompedShellE precedes MoveNormalEnemy; state4 holds its pre-movement vertical bytes. Native: a stomped Koopa keeps its position from before this frame's step (all 31 Koopa/Beetle stomps of the 32 v2 model replays; 4-3 row 187: slot 0 stays 409.0)
     else{e.movingShell=!e.movingShell;e.shellAge=0;e.shellChain=0;}
    }else{e.dead=1;e.vy=0;if(e.kind==='bullet'){e.x=e.frenzy?priorX:e.x;e.y=priorY-2;e.vx=0;e.pod={...nativeMoveState(e.y),fraction:priorFraction};if(e.frenzy)nativeImposeGravity(e.pod,0x1c,3);e.y=e.pod.y;e.vy=e.pod.speed+e.pod.force/256;}if(e.kind==='goomba'){e.squashed=true;e.x=priorX;e.squashFrames=this.intervalControl+22;}} // native: a stomped Goomba keeps its x from before this frame's step and is erased when its EnemyIntervalTimer runs out, IntervalTimerControl + 22 frames after the stomp (18 of 18 v2 squashes)
   }else if(e.shell&&p.vy<0&&oldBottom<=e.y+1){continue;}else if(e.shell&&!e.movingShell){e.movingShell=true;e.shellAge=0;e.shellChain=0;e.vx=(p.x<e.x?1:-1)*shellRules.speedPixelsPerNativeFrame;const kick=this.shellKickAward();if(e.kind==='koopa')this.enemyPopup(kick,e);e.x+=Math.sign(e.vx)*4;this.floateyScore(kick);this.emit('sfx_kick');}
   else if(this.nativeTouch(e,priorY,true)&&(!REACH_MEASURED.includes(e.kind)||Math.abs(Math.floor(priorX)-Math.floor(p.x))<=nativeHurtReachX(e.kind)))this.hurt(); // native reach of the measured kinds: integer |enemy x before its move - Mario x| (8-1 row 1356: 12, no touch); a Bullet Bill (5-2 row 94: 11) touches wider
  }
  this.nativeWalkerContacts(stepFrom);
  if(this.specialSlot5.vineCount===1&&this.specialSlot5.frenzyBuffer===0&&!this.parserClock.blocked){const slot=this.freeNativeSlot();if(slot<5){this.erasedVineSlots.delete(slot);this.specialSlot5.addVineSegment(slot);}}
  if(reservedClaim)Object.assign(this.specialSlot5,{flag:reservedClaim.flag,id:reservedClaim.id,frenzyBuffer:reservedClaim.buffer});
  this.specialSlot5.stepVine(this.random.frame,this.camera+this.lakituScroll);
  this.spinyFrenzyAfter(frenzy);
  this.rememberSlotVertical();
 }
 private moveDefeatedRespawnLakitu(e:Enemy){
  const n=e.pod!;if(n.y>=272){e.dead=100;e.active=false;e.slotFreed=true;e.slotLost=true;return;}
  e.dead++;nativeImposeGravity(n,0x3d,3);e.y=n.y;e.vy=n.speed+n.force/256;
 }
 private contactRespawnLakitu(e:Enemy,priorX:number,priorY:number){
  const p=this.player,lak=e.lak!,camera=this.camera+this.lakituScroll,n={collision:Boolean(lak.collision)};
  const nativeY=Math.floor(priorY)-16,playerY=Math.floor(p.y)-32;
  const action=nativeLakituContact(n,{frame:this.broClock,blocked:playerY<0||playerY>=208,player:this.hammerPlayerBox??nativePlayerBox(p.x,p.y,p.size,p.duck,camera),enemy:nativeLakituBox(Math.floor(priorX),nativeY,8,camera),star:Boolean(p.star),injury:Boolean(p.invincible),playerY,enemyY:nativeY&255,playerSpeed:Math.floor(p.vy),stompTimer:this.nativeStompTimer});
  lak.collision=n.collision;if(action==='none')return;
  // PlayerEnemyCollision precedes MoveLakitu; injury freezes its move, a defeat moves only vertically.
  e.x=priorX;if(action==='hurt'){this.hurt();return;}
  const fraction=e.enemySlot===undefined?0:this.slotVertical[e.enemySlot].fraction;
  e.dead=1;e.vx=0;e.pod={y:priorY-2,speed:action==='star'?-3:0,force:0,fraction,timer:0};
  nativeImposeGravity(e.pod,0x3d,3);e.y=e.pod.y;e.vy=e.pod.speed+e.pod.force/256;
  if(action==='star'){this.floateyScore(200);this.emit('sfx_kick');}
  else{p.vy=-3+(p.vy-Math.floor(p.vy));p.grounded=false;this.floateyScore(800);this.emit('sfx_stomp');}
 }
 // Koopa-shaped enemies touch 1 px wider than the overlap box: native integer |enemy x before its move - Mario x| <= 11 (evidence/contact3-findings-20261111.md)
 private koopaSideReach(kind:string,x:number){return nativeHurtReachX(kind)>10&&Math.abs(Math.floor(x)-Math.floor(this.player.x))<=nativeHurtReachX(kind);}
 // Piranha rectangles read Mario before a floor snap (controlled 5-1 landing: native y129 box bottom161, final y128). Other enemies retain their measured contact pose.
 private nativeTouch(e:{kind:string},y:number,unmeasured:boolean){const p=this.player,feet=e.kind==='piranha'&&p.size===0?this.piranhaTouchFeetY??p.y:p.y;return nativeHurtHeight(e.kind,Math.floor(y)-24-(Math.floor(feet)-32),p.size>0,unmeasured);}
 // Native stomp reaches down to 8 px below the feet of a (rising) Paratroopa for a falling Mario with speed byte >= 1 (3-1 row 21010: Mario feet 183, Paratroopa feet 175).
 /** Native ChkForPlayerInjury/ChkInj: with Player_Y_Speed <= 0 an object of id >= 7 (Bloober) is still stomped when Mario's y + 12 is above its y (7-1 row 359: Mario rising at y 140, Paratroopa at 161).
  * Contact is the native box test (inclusive edges, enemy box before its move): Mario x+3..x+13, y+20..y+32 small or x+2..x+14, y+8..y+32 big; a winged Koopa x+2..x+14, y+9..y+21 (RAM $04AC/$04B0). */
 private nativeChkInjStomp(e:Enemy,p:Player,priorX:number,priorY:number){
  if(Math.floor(p.vy)>0||e.kind!=='paratroopa'||e.shell)return false;
  const my=Math.floor(p.y)-32,ny=Math.floor(priorY)-24,mx=Math.floor(p.x),ex=Math.floor(priorX),small=p.size===0||p.duck;
  if(my+12>=ny)return false;
  return mx+(small?3:2)<=ex+14&&ex+2<=mx+(small?13:14)&&my+(small?20:8)<=ny+21&&ny+9<=my+32;
 }
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
  const gap=priorY-p.y;if(gap<-8)return undefined;
  if(Math.abs(Math.floor(priorX)-Math.floor(p.x))>(koopaKind?11:10))return false;
  return gap<=(koopaKind?15:10);
 }
 /** GrowThePowerUp still runs while TimerControl stops ordinary enemy movement. */
 private emergeFrozenNativePowerups(){
  for(const i of this.items)if(i.life>0&&i.nativePowerState!==undefined&&i.nativePowerState<128)this.updateNativePowerup(i);
  this.syncSpecialPowerup();
 }
 /** PowerUpObjHandler owns enemy slot 5: emergence uses FrameCounter & 3, and erasing/collecting keeps its vertical bytes for the flag. */
 private updateNativePowerup(i:Item){
  const state=i.nativePowerState!;
  if(state<128){
   const next=nativePowerupEmergence(state,i.y-8,this.random.frame);i.y=next.y+8;i.nativePowerState=next.state;i.emerging=next.emerging;return;
  }
  if(i.kind==='flower')return;
  const n={...this.nativePowerSlot,y:i.y-8,timer:0};
  if(i.kind==='star'||(state&64))nativeImposeGravity(n,i.kind==='star'?28:61,3);
  i.x+=i.vx;
  if(((n.y+0x3e)&255)>=0x44){
   const floor=this.collisionAt(i.x+8,n.y+24),depth=(Math.floor(n.y)&15)-8;
   const landed=i.kind==='star'?((n.speed+2)&255)>=3:depth>=0&&depth<5;
   if(floor&&landed){n.y=(Math.floor(n.y)&0xf0)|8;n.speed=i.kind==='star'?-3:0;n.force=0;i.nativePowerState=state&~64;}
   else if(i.kind!=='star')i.nativePowerState=state|64;
   if(n.y>=32&&this.isSolid(i.x+(i.vx>0?16:0),n.y+20))i.vx=-i.vx;
  }
  Object.assign(this.nativePowerSlot,{speed:n.speed,force:n.force,fraction:n.fraction});i.y=n.y+8;i.vy=n.speed+n.force/256;
 }
 private nativePowerupCollision(i:Item){
  const p=this.player,camera=this.camera+this.lakituScroll;
  return this.phase==='play'&&!this.powerChange&&!this.enemyContactOff&&nativePowerupContact(Math.floor(i.x),Math.floor(i.y)-8,camera,this.random.frame,Math.floor(p.y)-32,this.hammerPlayerBox??nativePlayerBox(p.x,p.y,p.size,p.duck,camera));
 }
 private updateItems(){
  const p=this.player;
  this.advanceNativeBlockPictures();
  // Native MiscObjectsCore visits shared hammer/jumping-coin slots from 8 down to 0.
  const misc=this.items.filter(i=>i.life>0&&(i.nativeHammer||i.nativeCoin)).sort((a,b)=>(b.nativeHammer??b.nativeCoin)!.slot-(a.nativeHammer??a.nativeCoin)!.slot);
  for(const i of misc){i.age++;i.life--;if(i.nativeHammer)this.moveNativeHammer(i);else this.moveNativeCoin(i);}
  for(const i of this.items){
   if(i.nativeHammer||i.nativeCoin||i.nativeFlame?.born===this.frame)continue;
   i.age++;i.life--;
   if(i.nativePowerState!==undefined){this.updateNativePowerup(i);if(i.nativePowerState<6)continue;}else{
   if(i.emerging&&i.emerging>0){i.y-=POWERUPS.powerupEmergenceNativeFrames.pixelsPerNativeFrame;i.emerging--;continue;}
   i.x+=i.vx;
   if(i.nativeFlame){const target=[144,128,112,144][i.nativeFlame.target];if(i.y!==target)i.y+=i.nativeFlame.force;}
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
   }
   if(i.kind==='hammer'||i.kind==='flame'){
    // Supplied descriptors give a 24x8 flame and alternating 8x16/16x8
    // hammer assemblies inside the rotating 16px cell.
    const horizontal=i.kind==='hammer'&&Math.floor(i.age/4)%2===1;
    const x=i.x+(i.kind==='hammer'&&!horizontal?4:0),y=i.y+(horizontal?4:0);
    if(i.nativeFlame?nativeFlameHit(i,p,this.random.frame):overlap(p.x+3,p.y-this.height+2,10,this.height-4,x,y,i.kind==='flame'?24:horizontal?16:8,i.kind==='flame'||horizontal?8:16))this.hurt();
   }else if(!p.dead&&!this.enemyContactOff&&['mushroom','flower','star','1up'].includes(i.kind)&&(i.nativePowerState!==undefined?this.nativePowerupCollision(i):overlap(p.x+2,p.y-this.height,12-6,this.height,i.x,i.y,16,16))){
    this.collectItem(i);
   }
  }
  this.items=this.items.filter(i=>i.life>0&&i.y<288&&i.x>=this.camera-(i.nativeFlame?73:i.nativePowerState===undefined?32:72)&&(i.nativePowerState===undefined||i.x<this.camera+328));
  this.syncSpecialPowerup();
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
     i.life=0;if(e.kind==='bowser'&&--e.hp>0)break;e.dead=1;e.vy=-3;const award=e.kind==='bowser'?5000:e.kind==='koopa'?200:100;this.floateyScore(award);if(e.kind==='goomba'||e.kind==='koopa')this.enemyPopup(award,e);this.emit('sfx_kick');break;
    }
 }
 private collectItem(i:Item){
  const p=this.player;
    i.life=0;
    if(i.kind==='1up'){this.lives++;this.awardPopup('1up',i.x,i.y-popupRules.itemTopYOffset);this.emit('sfx_1up');}
    else if(i.kind==='star'){p.star=NATIVE_STAR_PICKUP;if(i.nativePowerState!==undefined)this.floateyScore(POWERUPS.starCollectionScore.value);else this.score+=POWERUPS.starCollectionScore.value;this.awardPopup(POWERUPS.starCollectionScore.value,i.x,i.y-popupRules.itemTopYOffset);this.emit(this.time<=100?'music_star_hurry':'music_star');}
    else{const size=i.kind==='flower'?2:Math.max(1,p.size) as 1|2;if(size!==p.size){this.powerChange={from:p.size,to:size,remaining:nativeTransformRows(i.kind==='flower'?'fire':'grow'),kind:i.kind==='flower'?'fire':'grow'};this.powerupStateZero=true;this.transformPreviousAB=this.nativePlayerAB;p.climbing=false;this.climbingVine=undefined;}if(i.nativePowerState!==undefined)this.floateyScore(1000);else this.score+=1000;this.awardPopup(1000,i.x,i.y-popupRules.itemTopYOffset);this.emit('sfx_powerup');}
 }
 hurt(){const p=this.player;if(p.invincible||p.star||this.powerChange||this.phase!=='play')return;this.powerupStateZero=false;this.stompChain=0;if(p.size){this.powerChange={from:p.size,to:0,remaining:nativeTransformRows('shrink'),kind:'shrink'};p.invincible=POWERUPS.postShrinkInvulnerabilityNativeFrames.value;this.emit('sfx_pipe');}else this.die();}
 die(offscreenLava=false,offscreenPit=false){if(this.phase!=='play')return;this.powerupStateZero=false;this.loseLife=false;this.offscreenLavaDeath=offscreenLava;this.offscreenPitDeath=offscreenPit;this.offscreenDeathRows=this.offscreenFallRows();this.stompChain=0;this.firebarDeathFrame=this.areaFrame;this.deathMove={y:Math.floor(this.player.y),fraction:this.swimActive?this.water.frac:Math.floor((this.player.grounded?this.landingFraction:this.player.y-Math.floor(this.player.y))*256),speed:-4,force:this.player.grounded?0:Math.floor((this.player.vy-Math.floor(this.player.vy))*256),timer:0};this.phase='dying';this.phaseFrame=0;this.player.dead=true;if(!offscreenLava&&!offscreenPit)this.player.vx=0;/* the launch replaces the speed byte only: a mid-air fraction stays (native rows reach -3 up to 6 rows sooner) */if(!offscreenLava&&!offscreenPit)this.player.vy=deathRules.launchVelocity+(this.player.grounded?0:this.player.vy-Math.floor(this.player.vy));if(!this.pitMusic||!offscreenLava&&!offscreenPit)this.emit('event_death');}
 // Native death/lives-screen flow (evidence/lifeflow-findings-20261111.md): the 21-row interval clock is frozen on n+2 rows per death (the second death row to the row after the engine change, and the first lives-screen row); the screen timer is set 6 rows into the screen, counts clock ticks and ends 19 rows after its last tick.
 /* Native pit/lava falls keep the whole level running (engine stays 8 until the fall ends): 118 of 119 non-inert slots moved during 260-row falls; arc deaths freeze them after the first row. */
 private updateWaterEntryEnemies(){
  if(this.area.theme!=='water')return;
  // Entrance_GameTimerSetup already enters GameEngine on its setup row;
  // PlayerEnemyCollision is disabled until engine 8 resumes control.
  this.enemyContactOff=true;this.updateEnemies(this.player.y);if(this.waterEnemyStream)this.passNativeWaterStream();else this.updateSwimGenerator();this.enemyContactOff=false;
 }
 private updateBubbles(tickTimer=true,beforeWhirlpool=true){
  if(this.area.theme!=='water')return;
  const p=this.player,pre=beforeWhirlpool&&this.swimActive;
  const player={x:p.x-(pre?this.swimPull:0),y:(Math.floor(p.y-(pre?this.water.whirlMoved:0))-32)&255,facing:p.facing===1?1:2};
  if(!this.bubblesInitialized){this.bubbleState.entrance(player);this.bubblesInitialized=true;tickTimer=false;}
  this.bubbleState.step(player,this.random.bytes,tickTimer);
 }
 private updateWorldInPitFall(){if(!this.offscreenPitDeath&&!this.offscreenLavaDeath)return;this.platformFrame++;this.updateGenerators();this.updateEnemies(this.player.y);this.updateItems();}
 private lifeClockFreeze(){const pit=this.offscreenLavaDeath||this.offscreenPitDeath;if(this.phase==='dying'&&!pit&&this.phaseFrame>=2||this.phase==='intro'&&this.lifeIntro?.fromDeath&&(this.phaseFrame===4||!pit&&this.phaseFrame<=2))this.lifeFrozen++;}
 // Native row after any full screen: the clock is 19 rows past its last tick, whatever the previous level did (reg 0x77f == 1 on 8 of 8 control rows read).
 private lifeClockAtControl(){this.lifeFrozen=this.lifeRow-1-LIFE_FLOW.controlPhase;}
 /** Puts this clock on a native IntervalTimerControl ($077F) value: the row on which $077F wraps to 20 (the interval timers, ScreenTimer $07A0 among them, tick) is clock phase
  * clockTickPhase, so phase = (clockTickPhase + 20 - $077F) mod 21 (1-1 v2: the death row 786 has $077F 8, ScreenTimer ticks 1004..1130, engine 8 on 1149 with $077F 1). */
 alignLifeClock(control:number){this.lifeFrozen=this.lifeRow-1-((LIFE_FLOW.clockTickPhase+20-control)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod;}
 // Native pit deaths keep falling, unseen and with no launch, down to page 6: 245-249 / 259-260 rows after passing native y 240, set by the last jump's fall force (run .5625 -> 4.0 px/row, walk .4375 -> 4.22, medium .375 -> 4.19; 94 samples). Water sinks at its own speed.
 private offscreenFallRows(){let y=this.player.y,v=this.player.vy,n=0;if(this.area.theme==='water')return Math.ceil((LIFE_FLOW.pitEndFeetY-y)/Math.max(1,v))-1;for(;y<LIFE_FLOW.pitEndFeetY;n++){y+=v;v+=this.lastJumpFallForce;if(v>=4.5)v=4;}return n-1;}
 // ScreenRoutines loads ScreenTimer on row 9 after PlayerLoseLife (DisplayIntermediate), or row 8 for DisplayTimeUp.
 // Engine 7 starts 18 rows after the final tick; a grounded entry reaches engine 8 one row later.
 private lifeIntroDone(){
  const li=this.lifeIntro!,p=this.phaseFrame;
  if(!li.end&&p>li.set&&((this.lifeRow-1-this.lifeFrozen)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod===LIFE_FLOW.clockTickPhase&&++li.seen>=li.ticks)li.end=p+LIFE_FLOW.screenTail-(this.entryFalling&&this.area.entryFall?.native?1:0);
  return li.end>0&&p>=li.end;
 }
 // Game over: 20 clock ticks after row 9 of the screen, title 2 rows after the last (7 of 7 native game overs; the game-over death's own freeze is not counted).
 private gameoverEndFrame(){
  let ticks=0;
  for(let p=LIFE_FLOW.gameoverSet+1;;p++)if(((this.lifeRow+p-1-this.lifeFrozen)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod===LIFE_FLOW.clockTickPhase&&++ticks>=LIFE_FLOW.gameoverTicks)return p+LIFE_FLOW.gameoverTail;
 }
 private startPlayAfterIntro(){if(this.deathLoad)this.screenTimer=this.deathLoad.state.timer;this.deathLoad=undefined;if(this.area.theme==='water'&&!this.player.grounded){this.playerAnim.fresh=false;this.playerAnim.setSpeed(0);}this.intervalControl=(LIFE_FLOW.clockTickPhase+20-LIFE_FLOW.controlPhase)%LIFE_FLOW.clockPeriod;this.broClock=this.phaseFrame-(this.lifeIntro!.fromDeath?3:2)-2;this.random.frame=(this.broClock+2)&255;/* FrameCounter $09 itself (cleared on that load row) *//* native load row: 2 rows into a title intro, 3 into a death's; its frame counter runs through the lives screen, so the screen length decides the parity. A remake step shows the native row two earlier (input queue) */this.lifeIntro=undefined;this.phase='play';this.freshA=true;this.controlGrace=Math.min(CONTROL_GRACE_ROWS,this.inputs.length);this.phaseFrame=0;this.introFromGameover=false;this.primeNativeReadyEnemies();if(this.phase==='play')this.consumeGameTimer(!this.entryControlLocked&&!this.area.autoWalk);this.emit(this.areaMusic());}
 private primeNativeReadyEnemies(){if(!this.entryFalling&&this.enemies.some(e=>e.active&&(e.nativeId!==undefined||e.frenzy))){this.broClock=(this.random.frame-1)&255;this.updateEnemies(this.player.y);}else this.primeEntryPodoboos();}
 private primeEntryPodoboos(){
  // InitializeGame already loads the in-range Podoboo on engine7. On the first engine8 row it takes its first MoveJ gravity step.
  for(const e of this.enemies)if(e.kind==='podoboo'&&!e.active&&e.x>this.camera-32&&e.x<this.camera+304){
   e.active=true;this.takeNativeSlot(e);if(e.enemySlot===undefined){e.active=false;continue;}
   e.age=1;this.updateNativePodoboo(e);
  }
 }
 private respawn(){
  this.vineProgress.clear();this.climbingVine=undefined;
  this.lives--;this.slots[this.currentPlayer]={level:this.levelIndex,lives:this.lives,score:this.score,coins:this.coins,size:0,checkpoint:this.checkpoint,checkpointArea:this.activatedCheckpointArea};
  if(this.lives<=0){this.lifeFrozen-=Math.max(0,this.phaseFrame-1);this.gameoverEnd=this.gameoverEndFrame();this.phase='gameover';this.phaseFrame=0;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.emit('event_game_over');return;}
  if(this.twoPlayer&&this.slots[1-this.currentPlayer].lives>0){
   this.currentPlayer=1-this.currentPlayer;const s=this.slots[this.currentPlayer];this.levelIndex=s.level;this.lives=s.lives;this.score=s.score;this.coins=s.coins;this.checkpoint=s.checkpoint;this.activatedCheckpointArea=s.checkpointArea;
  }
  const target=this.level.areas.find(a=>a.id===(this.checkpoint?(this.activatedCheckpointArea??this.level.main):(this.level.respawnArea??this.level.main)))!,checkpoint=this.checkpoint?target.checkpoint:undefined;
  // Native PlayerLoseLife/ContinueGame keeps the HUD timer digits ($07F8) through the lives screen; the area's time is loaded with the level on the engine-7 row (1-1 v2: 368 until 1147, 400 from 1149).
  this.fetchGameTimer=true;this.player.size=0;this.deathLoad={state:{...nativeLevelLoad(),engine:0,disable:1,columns:255,timer:this.screenTimer,timeUp:this.timeUpDeath},dispatch:true,area:target.id,spawn:checkpoint?.spawn,camera:checkpoint?.camera};this.phase='intro';this.phaseFrame=0;this.introLength=TRANSITIONS.introFrames;this.lifeIntro=newLifeIntro(this.timeUpDeath,true);this.timeUpDeath=false;
 }
 private finishGameover(){
  if(!this.twoPlayer||this.slots[1-this.currentPlayer].lives<=0){this.restartToTitle();return;}
  this.currentPlayer=1-this.currentPlayer;const s=this.slots[this.currentPlayer];this.levelIndex=s.level;this.lives=s.lives;this.score=s.score;this.coins=s.coins;this.checkpoint=s.checkpoint;this.activatedCheckpointArea=s.checkpointArea;
  const target=this.level.areas.find(a=>a.id===(this.checkpoint?(this.activatedCheckpointArea??this.level.main):(this.level.respawnArea??this.level.main)))!,checkpoint=this.checkpoint?target.checkpoint:undefined;
  this.player.size=0;this.loadArea(target.id,checkpoint?.spawn,checkpoint?.camera,false,true);this.phase='intro';this.phaseFrame=0;this.gameoverClosingFrame=-1;this.gameoverSkipDelay=0;this.introFromGameover=true;this.introLength=TRANSITIONS.introFrames;
 }
 private updateDeathLoad(){
  const load=this.deathLoad!;if(load.dispatch){load.dispatch=false;return;}
  const n=load.state;if(n.task===3&&n.engine===7)return;
  if(!(n.task===0&&n.screen===0))this.gameTimerStep(false);
  const tick=((this.lifeRow-1-this.lifeFrozen)%LIFE_FLOW.clockPeriod+LIFE_FLOW.clockPeriod)%LIFE_FLOW.clockPeriod===LIFE_FLOW.clockTickPhase;
  const result=stepNativeLevelLoad(n,tick);
  if(result.camera){this.camera=0;this.player.x=Math.floor(this.player.x);this.player.y=Math.floor(this.player.y);this.player.vx=Math.floor(this.player.vx*16)/16;this.player.vy=Math.floor(this.player.vy);}
  if(result.clear){
   const time=this.time;this.loadArea(load.area,load.spawn,load.camera,false,true);this.time=time;load.player={...this.player};
   this.timerFrames=24;this.player.x=0;this.player.y=-224;this.player.vx=0;this.player.vy=0;this.player.grounded=false;
  }
  if(result.preload&&load.player){Object.assign(this.player,load.player);this.initializeGameTimer();this.timerFrames=24;}
 }
 private updateLevelLoad(){
  const n=this.levelLoad!,render=n.task===1&&n.screen===8,hold=n.task===0&&n.screen===0;
  if(!hold){this.gameTimerStep(false);this.tickIntervalTimers();}else this.lifeFrozen++;
  const result=stepNativeLevelLoad(n,!hold&&this.intervalControl===20);if(render)this.renderInitialSpringColumns();
  if(result.camera)this.camera=0;
  if(result.clear){
   const time=this.time;this.loadArea(this.level.main,undefined,undefined,true);this.time=time;this.areaControls.column-=24;this.springSlots.clear();this.springLoadColumns=12;
   this.timerFrames=24;this.player.x=0;this.player.y=32;this.player.vx=0;this.player.vy=0;this.random.frame=0;
  }
  if(result.preload){
   const [x,y]=this.area.spawn;this.player.x=x;this.player.y=y;this.player.grounded=this.isSolid(x+8,y);
   this.initializeGameTimer();this.timerFrames=24;this.phase='play';this.playerAnim.fresh=true;this.primeNativeEntryObjects();
  }
  if(result.ready){
   this.screenTimer=n.timer;this.consumeGameTimer(true);this.phase='play';this.phaseFrame=0;this.broClock=this.random.frame-2;
   this.freshA=true;this.controlGrace=Math.min(CONTROL_GRACE_ROWS,this.inputs.length);this.levelLoad=undefined;
   this.primeNativeReadyEnemies();this.emit(this.areaMusic());
  }
 }
 private nextLevel(victory=false){
  if(this.levelIndex+1>=this.levels.length){
   if(this.level.id==='8-4'){this.phase='ending';this.phaseFrame=0;this.emit('event_victory');}
   else {this.phase='castle';this.phaseFrame=180;}
   return;
  }
  this.levelIndex++;this.fetchGameTimer=true;if(victory){this.checkpoint=false;this.activatedCheckpointArea=undefined;this.phase='intro';this.phaseFrame=0;this.levelLoad=nativeLevelLoad();this.alignLifeClock(this.intervalControl);return;}this.checkpoint=false;this.activatedCheckpointArea=undefined;this.loadArea(this.level.main,undefined,undefined,true);this.timerFrames=24;this.phase='intro';this.phaseFrame=0;this.introLength=TRANSITIONS.levelIntroFrames;
 }
}
