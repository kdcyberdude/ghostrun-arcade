import type {PlatformSpec} from './types.js';
import {nativeBalanceStep,nativeDropStep,nativeWrapState,type PlatformVerticalState} from './native-platform-motor.js';
import waterEntryRules from '../data/water-entry-rules.json';
import fiveTwoWaterEntryRules from '../data/water-entry-5-2-rules.json';
import eightFourPlatformRules from '../data/eight-four-platform-rules.json';
import fiveThreeHorizontal from '../data/five-three-horizontal-platform.json';
import nativePlatformMotion from '../data/native-platform-motion.json';

export type PlatformMotionModel='native-horizontal'|'native-lift'|'native-wrap'|'native-balance'|'native-drop'|'observed-lift'|'camera-lift'|'camera-horizontal'|'camera-lava'|'contact-fall'|'contact-cloud'|'water-descender'|'unmeasured';
export interface NativePlatformObject {kind:'horizontal'|'lift'|'wrap'|'balance'|'drop';nativeId?:number;spec:[number,number];x:number;y:number;direction?:'up'|'down';phase?:number;pair?:[number,number];side?:1|-1;spawnCamera:number}

/** Native platform objects (data/native-platform-motion.json, made from the reference RAM per frame; see
 * evidence/moving-platform-phase-findings-20261109.md) are created when the scroll position reaches spawnCamera and run
 * from that frame on: horizontal ones start at their right end and repeat a 240-frame cycle, lifts start at one end of a
 * 384-frame cycle. The clock is therefore the object's own age, never the level timeline. Balance platforms hang in
 * counterweighted pairs: they stay put until a rider stands on one of them, then the pair accelerates (see `pulley`). */
export function nativePlatformObject(platform:PlatformSpec,context:PlatformMotionContext):NativePlatformObject|undefined {
 const list=(nativePlatformMotion.objects as unknown as Record<string,NativePlatformObject[]>)[`${context.levelId}/${context.areaId}`];
 return list?.find(o=>o.spec[0]===platform.x&&o.spec[1]===platform.y)??eightFourLapObject(list,platform,context);
}
/** Only native objects43/44 have two vertically repeated collision surfaces;
 * objects38/39 are large lifts with one surface, even though both kinds wrap. */
export function nativeSmallPlatform(platform:PlatformSpec,context:PlatformMotionContext){
 const id=nativePlatformObject(platform,context)?.nativeId;return id===43||id===44;
}
/** Native id37 is parsed at object X−303, before its first motion frame. */
export const nativePlatformSpawnCamera=(object:NativePlatformObject)=>object.kind==='lift'?object.x-303:object.kind==='wrap'?object.x-315:object.spawnCamera;
/** 8-4 main repeats columns 32-95 every 1024 px: a lap copy of the id 40 lift is the same native object one lap right (native 1120 -> 2144). */
function eightFourLapObject(list:NativePlatformObject[]|undefined,platform:PlatformSpec,context:PlatformMotionContext):NativePlatformObject|undefined {
 if(context.levelId!=='8-4'||context.areaId!=='main'||platform.x<1024)return undefined;
 const lap=1024*Math.floor((platform.x-512)/1024),o=list?.find(o=>o.spec[0]===platform.x-lap&&o.spec[1]===platform.y);
 return o&&{...o,spec:[platform.x,platform.y],x:o.x+lap,spawnCamera:o.spawnCamera+lap};
}
/** Wrapping lift (native ids 38/39 large, 43/44 castle): 15/16 px per frame, 15 pixel steps then one idle step in every 16 frames (`phase` is
 * the object's hidden position in that cycle), y wraps modulo 256, x is fixed. Up lifts subtract, down lifts add. */
export function nativeWrapY(object:NativePlatformObject,age:number,fraction?:number){
 if(fraction!==undefined)return nativeWrapState(object.y,age,fraction,object.direction==='up').y;
 const rules=nativePlatformMotion.wrap,steps=Math.floor((object.phase!+rules.stepsPerPeriod*Math.max(0,age))/rules.period);
 return (((object.y+(object.direction==='up'?-steps:steps))%rules.span)+rules.span)%rules.span;
}
/** Native YMovingPlatform (object id 37, the 'lift' kind; SMB disassembly YMovingPlatform/MovePlatformDown/MovePlatformUp/ImposeGravity, checked on every
 * row of every id-37 object in the 32 v2 traces): from the spawn y0 the platform keeps an 8.8 speed (byte $A0+x, force $434+x, fraction $417+x).
 * Top = y0 (y0 < 128) or 256 - y0, centre = y0 + 64 or y0 - 64. Each frame after the spawn frame: at rest (speed and force 0) the fraction is cleared
 * and, while y < top, y steps +1 on frames with FrameCounter & 7 == 0 and nothing else; otherwise ImposeGravity moves y by the speed plus the carry
 * of fraction + force, adds 5/256 (cap 3 once the force reaches 128) and, at or below the centre (y >= centre), takes 10/256 back (cap -3 below 128).
 * `counter` is FrameCounter ($09) on the spawn frame. Returns y at `age` frames after the spawn (age 0: y0). */
const liftTracks=new Map<string,number[]>();
const liftStates=new Map<string,PlatformVerticalState[]>();
export function nativeLiftY(y0:number,age:number,counter=0){
 const key=`${y0},${counter&7}`;let track=liftTracks.get(key);
 if(!track){track=[y0];liftTracks.set(key,track);liftStates.set(key,[{y:y0,speed:0,force:0,fraction:0}]);}
 const state=(track as number[]&{s?:{y:number;speed:number;force:number;fraction:number}}).s??={y:y0,speed:0,force:0,fraction:0};
 const top=y0<128?y0:256-y0,centre=(y0+(y0<128?64:192))&255;
 while(track.length<=age){
  const n=state,a=track.length;
  if(n.speed===0&&n.force===0){n.fraction=0;if(n.y<top){if(((counter+a)&7)===0)n.y++;track.push(n.y);liftStates.get(key)!.push({...n});continue;}}
  const up=n.y>=centre;
  const f=n.fraction+n.force;n.fraction=f&255;n.y=(n.y+n.speed+(f>>8))&255;
  const v=n.force+5;n.force=v&255;n.speed+=v>>8;
  if(n.speed>=3&&n.force>=128){n.speed=3;n.force=0;}
  if(up){const w=n.force-10;n.force=w&255;if(w<0)n.speed--;if(n.speed<-3&&n.force<128){n.speed=-3;n.force=255;}}
  track.push(n.y);liftStates.get(key)!.push({...n});
 }
 return track[Math.max(0,age)];
}
/** The native lift writes these bytes back into its enemy slot; its successor
 * keeps the fraction (4-3: lift slot1 leaves206 for the next balance pair). */
export function nativeLiftState(y0:number,age:number,counter=0,fraction=0):PlatformVerticalState{
 nativeLiftY(y0,age,counter);const state=liftStates.get(`${y0},${counter&7}`)![Math.max(0,age)];return age===0?{...state,fraction}:state;
}
/** Native XMovingPlatform (object id 40, the 'horizontal' kind; SMB disassembly XMoveCntr_Platform/MoveWithXMCntrs/MoveObjectHorizontally, checked on
 * every row of every id-40 object in the 32 v2 traces): a primary counter ($A0+x) and a secondary counter ($58+x, maximum 14) both start at 0. On frames
 * with FrameCounter & 3 == 0 the secondary counts up to 14 (then the primary steps) while the primary is even, down to 0 (then the primary steps) while
 * it is odd. Every frame the platform moves by the secondary counter as an x speed (x.4 fixed point: whole pixels = speed >> 4, sub-pixel $401+x += speed << 4),
 * leftwards while primary bit 1 is clear. The sub-pixel starts at whatever the slot's previous object left there (`sub`); `counter` is FrameCounter on the
 * spawn frame. Returns the 8.8 x at `age` frames after the spawn (age 0: x0 + sub/256). */
const horizontalTracks=new Map<string,number[]>();
export function nativeHorizontalX(x0:number,age:number,counter=0,sub=0){
 const key=`${x0},${sub},${counter&3}`;let track=horizontalTracks.get(key);
 if(!track){track=[x0*256+sub];horizontalTracks.set(key,track);}
 const state=(track as number[]&{s?:{x:number;sub:number;primary:number;secondary:number}}).s??={x:x0,sub,primary:0,secondary:0};
 while(track.length<=age){
  const n=state;
  if(((counter+track.length)&3)===0){
   if(n.primary&1){if(n.secondary===0)n.primary=(n.primary+1)&255;else n.secondary--;}
   else if(n.secondary===14)n.primary=(n.primary+1)&255;else n.secondary++;
  }
  const speed=n.primary&2?n.secondary:(-n.secondary)&255,whole=(speed>>4)>=8?(speed>>4)-16:speed>>4,f=n.sub+((speed<<4)&255);
  n.sub=f&255;n.x+=whole+(f>>8);track.push(n.x*256+n.sub);
 }
 return track[Math.max(0,age)]/256;
}
/** Collision-surface position of a native object that has existed for `age` frames (balance: `age` is the pair offset; lift and horizontal: `counter` is
 * FrameCounter at its spawn; horizontal: `sub` the sub-pixel its slot held). */
export function nativeObjectPosition(object:NativePlatformObject,age:number,counter=0,sub=0,fraction?:number):PlatformPosition {
 if(object.kind==='wrap')return {x:object.x,y:nativeWrapY(object,age,fraction)};
 // balance: the partner keeps a sub-pixel y and shows its floor; the rider's side mirrors that integer, so both move by ceil(|offset|) (4-3 v2 row 383: partner 125.98 -> 125, rider 78 -> 79)
 if(object.kind==='balance')return {x:object.x,y:object.y+object.side!*Math.sign(age)*Math.ceil(Math.abs(age)-1e-9)};
 if(object.kind==='drop')return {x:object.x,y:Math.round(object.y+object.side!*age)};
 if(object.kind==='horizontal')return {x:nativeHorizontalX(object.x,age,counter,sub),y:object.y};
 return {x:object.x,y:nativeLiftY(object.y,age,counter)};
}
/** Native inclusive horizontal bounding boxes (BoundBoxCtrlData): small Mario
 * uses x+3..x+13; big and crouching Mario use x+2..x+14. */
export const platformSupportsX=(playerX:number,platformX:number,width:number,wide=false)=>Math.floor(playerX)+(wide?14:13)>=Math.floor(platformX)&&Math.floor(playerX)+(wide?2:3)<=Math.floor(platformX)+width;
export interface PlatformPosition {x:number;y:number}
export interface PlatformMotionContext {levelId:string;areaId:string;liftPhaseAtFrameZero?:number}

// Genuine unmounted1-3 images, native5513..6280: two oscillations.
// The two passes differ slightly, so a repeated384-frame single cycle fails the
// 2px later-cycle tolerance. Resampling this767-frame trace over766 frames agrees
// with the later mounted cycle within0.26px. Interpolation/period are empirical
// inferences; neither the native acceleration rule nor load phase is recovered.
export const LIFT_TRAJECTORY_PERIOD=766;
const LIFT_RECORDED_SPAN=767;
export const LIFT_TRAJECTORY:ReadonlyArray<readonly[number,number]>=[
 [0,228],[8,227],[15,226],[23,224],[31,221],[38,217],[46,211],[53,205],
 [61,196],[68,188],[76,178],[83,167],[91,155],[98,144],[106,133],[113,124],
 [121,116],[128,109],[136,103],[143,98],[151,94],[158,92],[166,90],[173,90],
 [181,91],[188,92],[196,93],[203,94],[211,95],[218,96],[226,97],[233,98],
 [241,100],[248,103],[256,107],[263,113],[271,119],[278,127],[286,136],[293,145],
 [301,157],[308,168],[316,179],[324,190],[331,198],[339,206],[346,212],[354,218],
 [361,221],[369,225],[376,227],[384,228],[391,227],[399,226],[406,224],[414,220],
 [421,216],[429,210],[436,204],[444,195],[451,187],[459,176],[466,166],[474,153],
 [481,142],[489,132],[496,123],[504,115],[511,108],[519,102],[526,98],[534,94],
 [541,91],[549,90],[556,90],[564,91],[571,92],[579,93],[586,94],[594,95],
 [601,96],[609,97],[616,97],[624,99],[632,103],[639,107],[647,113],[654,119],
 [662,127],[669,135],[677,145],[684,155],[692,168],[699,178],[707,188],[714,197],
 [722,205],[729,211],[737,217],[744,221],[752,224],[759,227],[767,228],
];
// First visible1-3 viewport is native4958,555 frames before the bottom anchor.
// This is an inferred scene epoch, not a measured camera-load activation rule.
export const LIFT_PHASE_AT_FIRST_VISIBLE=211;
export const PLATFORM_MOTION_LIMITATIONS=[
 '1-3 lift interpolation and scene epoch are inferred; camera-load activation and exact fixed-point acceleration remain unresolved.',
 '5-3 lift camera threshold, phase and reuse of the 1-3 curve are inferred; native activation, collision and re-entry remain unmeasured.',
 '5-3 horizontal platform period is empirical; camera activation, phase on a delayed approach, native contact and re-entry remain unmeasured.',
 '8-4 opening platform camera epoch and offscreen hold are inferred; one-frame changes can exceed 2px, and native reset/contact timing remains unresolved.',
 '3-3 falling speed is measured while occupied; persistence after jumping away is inferred.',
 'Pulley acceleration, velocity cap, release damping and rope snap remain uncalibrated; other platforms retain the explicitly unmeasured fallback.',
 '2-1 cloud far endpoint and despawn behavior remain unobserved.',
 '3-1 and6-2 sky clouds independently show contact atfeet160/art161 and right1px/native movement continuing after departure; exact activation frame and underside behavior remain unresolved.',
 '6-2 water platform speed fits26 exact poses;256px wrap and phases at room load remain inferred from a later visible sample.',
 '5-2 water platforms are independently observed48px assemblies;15/16 speed fits the source poses, but room-load phase and256px wrap remain inferred.',
] as const;

export function measuredLiftArtworkY(frame:number,phase=0):number {
 const at=((frame+phase)%LIFT_TRAJECTORY_PERIOD+LIFT_TRAJECTORY_PERIOD)%LIFT_TRAJECTORY_PERIOD*LIFT_RECORDED_SPAN/LIFT_TRAJECTORY_PERIOD;
 const next=LIFT_TRAJECTORY.findIndex(([time])=>time>at);
 const [a,y]=LIFT_TRAJECTORY[next-1],[b,z]=LIFT_TRAJECTORY[next];
 return y+(z-y)*(at-a)/(b-a);
}

export function platformMotionModel(platform:PlatformSpec,context:PlatformMotionContext):PlatformMotionModel {
 const native=nativePlatformObject(platform,context);
 if(native)return native.kind==='horizontal'?'native-horizontal':native.kind==='balance'?'native-balance':native.kind==='drop'?'native-drop':native.kind==='wrap'?'native-wrap':'native-lift';
 if(context.levelId==='5-3'&&context.areaId==='main'&&platform.x===1346&&platform.y===129&&platform.width===32)return 'camera-horizontal';
 if(context.levelId==='8-4'&&context.areaId==='main'&&platform.x===918&&platform.y===209&&platform.width===32)return 'camera-lava';
 if(context.levelId==='5-3'&&context.areaId==='main'&&platform.x===880&&platform.width===32)return 'camera-lift';
 if(context.levelId==='5-2'&&context.areaId==='optional-water'&&platform.width===48&&[364,460].includes(platform.x))return 'water-descender';
 if(context.levelId==='6-2'&&context.areaId==='optional-water'&&platform.width===32&&[364,460].includes(platform.x))return 'water-descender';
 if(context.levelId==='6-2'&&context.areaId==='6-2-vine-sky'&&platform.width===32&&platform.x===256)return 'contact-cloud';
 if(platform.width!==48)return 'unmeasured';
 if(context.levelId==='1-3'&&context.areaId==='main'&&Math.abs(platform.x-880)<=2)return 'observed-lift';
 if(context.levelId==='3-3'&&context.areaId==='main'&&Math.abs(platform.x-960)<=2)return 'contact-fall';
 if((context.levelId==='2-1'&&context.areaId==='sky-coins'||context.levelId==='3-1'&&context.areaId==='3-1-vine-sky'||context.levelId==='5-2'&&context.areaId==='5-2-vine-sky')&&Math.abs(platform.x-256)<=2)return 'contact-cloud';
 return 'unmeasured';
}

/** Native OffscreenBoundsCheck erases platform ids >= 13 when their integer x is below ScreenLeft - 72, regardless of platform width (all v2 removal events). */
export function nativePlatformHoldsSlot(motion:PlatformMotion,platform:PlatformSpec,context:PlatformMotionContext,camera:number,frame:number){
 const o=nativePlatformObject(platform,context);
 return !!o&&!motion.lost.has(platform)&&!motion.waiting.has(platform)&&camera>=nativePlatformSpawnCamera(o)&&Math.floor(motion.collisionPosition(platform,frame).x)>=camera-72;
}
/** Querying positions never advances simulation. */
export class PlatformMotion {
 private activated=new Map<PlatformSpec,number>();
 private fiveThreeLiftStart:number|undefined;
 private eightFourLavaStart:number|undefined;
 private fiveThreeHorizontalStart:number|undefined;
 private cameraLog:Array<[number,number,number]>=[];
 private nativeStart=new Map<PlatformSpec,number>();
 /** Native objects never created: their spawn point passed while all five object slots were busy (evidence/platslot-findings-20261111.md). */
 lost=new Set<PlatformSpec>();
 /** Spawn point passed with all slots busy while the object was still off screen: made on the first frame a slot is free (`create`). */
 waiting=new Set<PlatformSpec>();
 create(platform:PlatformSpec,frame:number){this.waiting.delete(platform);this.nativeStart.set(platform,frame);}
 private pulleys=new Map<string,{start:number;d:number[];load:Record<string,number>;driver:NativePlatformObject;motor:PlatformVerticalState}>();
 private startFraction=new Map<PlatformSpec,number>();
 slotFraction(platform:PlatformSpec,fraction:number){if(!this.startFraction.has(platform))this.startFraction.set(platform,fraction);}
 /** $0401+s is x fraction for id40 and YPlatformTopYPos for id37.
  * The next slot occupant inherits the byte written on the final motion row. */
 slotXByte(platform:PlatformSpec,frame:number){
  const o=nativePlatformObject(platform,this.context);if(!o)return;
  if(o.kind==='lift')return o.y<128?o.y:256-o.y;
  if(o.kind==='horizontal'){const x=this.collisionPosition(platform,frame).x;return Math.round((x-Math.floor(x))*256)&255;}
 }
 verticalState(platform:PlatformSpec,frame:number){
  const o=nativePlatformObject(platform,this.context);if(!o)return;
  if(o.kind==='wrap')return nativeWrapState(o.y,this.nativeAge(platform,o,frame),this.startFraction.get(platform)??0,o.direction==='up');
  if(o.kind==='lift')return nativeLiftState(o.y,this.nativeAge(platform,o,frame),this.nativeCounter(platform),this.startFraction.get(platform)??0);
  if(!o.pair)return;const p=this.pulleys.get(o.pair.join(','));return p?.driver===o?p.motor:undefined;
 }
 constructor(public context:PlatformMotionContext){}
 reset(context=this.context){this.context=context;this.activated.clear();this.fiveThreeLiftStart=undefined;this.eightFourLavaStart=undefined;this.fiveThreeHorizontalStart=undefined;this.cameraLog=[];this.nativeStart.clear();this.startCounter.clear();this.startSub.clear();this.startFraction.clear();this.pulleys.clear();this.lost.clear();this.waiting.clear();}
 // Frames since the native object was created: the first logged frame whose camera had reached its spawn camera.
 private nativeAge(platform:PlatformSpec,object:NativePlatformObject,frame:number){
  let start=this.nativeStart.get(platform);
  const last=this.cameraLog[this.cameraLog.length-1];
  if(start===undefined&&!this.waiting.has(platform)&&last&&last[1]>=nativePlatformSpawnCamera(object)){start=this.cameraLog.find(([,camera])=>camera>=nativePlatformSpawnCamera(object))![0];this.nativeStart.set(platform,start);}
  return start===undefined?0:Math.max(0,frame-start);
 }
 /** FrameCounter ($09) on the frame the native object was created (0 when not logged). */
 private nativeCounter(platform:PlatformSpec){
  const start=this.nativeStart.get(platform);if(start===undefined)return 0;
  const known=this.startCounter.get(platform);if(known&&known[0]===start)return known[1];
  const at=this.cameraLog.find(([frame])=>frame>=start);if(!at)return 0;
  const counter=(at[2]-(at[0]-start))&255;this.startCounter.set(platform,[start,counter]);return counter;
 }
 private startCounter=new Map<PlatformSpec,[number,number]>();
 /** Sub-pixel byte the native object found in its enemy slot when it was created (XMovingPlatform keeps it; the simulation reports it via `slotSub`). */
 private startSub=new Map<PlatformSpec,number>();
 slotSub(platform:PlatformSpec,sub:number){if(!this.startSub.has(platform))this.startSub.set(platform,sub);}
 // Fitted to two approaches and conditionally checked on a third; the exact
 // native activation frame is unknown and a one-frame shift can fail 2px.
 advance(frame:number,camera:number,counter=0){
  this.cameraLog.push([frame,camera,counter]);
  this.advancePulleys(frame);
  if(this.context.levelId==='5-3'&&this.context.areaId==='main'&&this.fiveThreeHorizontalStart===undefined&&camera>=fiveThreeHorizontal.cameraThreshold)this.fiveThreeHorizontalStart=frame;
  if(this.context.levelId==='8-4'&&this.context.areaId==='main'&&this.eightFourLavaStart===undefined&&camera>=eightFourPlatformRules.cameraThreshold)this.eightFourLavaStart=frame;
  if(this.context.levelId==='5-3'&&this.context.areaId==='main'&&this.fiveThreeLiftStart===undefined&&camera>=624)this.fiveThreeLiftStart=frame;
 }
 // The second balance object owns ImposeGravity; its partner mirrors integer
 // movement. Drop platforms apply 127/256 gravity only while ridden. Both keep
 // the slot's fraction and integrate position before changing speed.
 private advancePulleys(frame:number){
  for(const pulley of this.pulleys.values()){
   const {driver,motor}=pulley;
   const load=(pulley.load['1']===frame?1:0)-(pulley.load['-1']===frame?1:0);
   if(driver.kind==='drop')nativeDropStep(motor,load!==0);
   else nativeBalanceStep(motor,-load);
   pulley.d.push((motor.y-driver.y)*driver.side!);
  }
 }
 contact(platform:PlatformSpec,frame:number){
  const model=platformMotionModel(platform,this.context);
  if(model==='native-balance'||model==='native-drop'){
   const object=nativePlatformObject(platform,this.context)!,key=object.pair!.join(',');
   let pulley=this.pulleys.get(key);
   if(!pulley){
    const partners=(this.context.levelId+'/'+this.context.areaId),list=(nativePlatformMotion.objects as unknown as Record<string,NativePlatformObject[]>)[partners];
    const driver=model==='native-drop'?object:list?.find(o=>o.kind==='balance'&&o.pair?.join(',')===key&&o.side===-1);
    if(!driver)return;
    const spec=[...this.startFraction.keys()].find(p=>p.x===driver.spec[0]&&p.y===driver.spec[1]);
    pulley={start:frame,d:[0],load:{},driver,motor:{y:driver.y,speed:0,force:0,fraction:spec?this.startFraction.get(spec)!:0}};
    this.pulleys.set(key,pulley);
   }
   pulley.load[String(object.side)]=frame;
  }
  if((model==='contact-fall'||model==='contact-cloud')&&!this.activated.has(platform))this.activated.set(platform,frame);
 }
 artworkPosition(platform:PlatformSpec,frame:number):PlatformPosition {
  if(this.lost.has(platform)||this.waiting.has(platform))return {x:-4096,y:4096};
  const model=platformMotionModel(platform,this.context);
  if(model==='native-horizontal'||model==='native-lift'||model==='native-wrap'){
   const object=nativePlatformObject(platform,this.context)!,position=nativeObjectPosition(object,this.nativeAge(platform,object,frame),this.nativeCounter(platform),this.startSub.get(platform)??0,this.startFraction.get(platform)??0);
   return {x:position.x,y:position.y+1};
  }
  if(model==='native-balance'||model==='native-drop'){
   const object=nativePlatformObject(platform,this.context)!,pulley=this.pulleys.get(object.pair!.join(','));
   let offset=0;
   if(pulley&&frame>=pulley.start){
    const index=frame-pulley.start+1;
    if(index<pulley.d.length)offset=pulley.d[index];
    else{
     // Collision asks for this frame's surface before advance stores it. The
     // position step uses the previous speed/force; acceleration follows it.
     const next={...pulley.motor};
     const load=(pulley.load['1']===frame-1?1:0)-(pulley.load['-1']===frame-1?1:0);
     if(pulley.driver.kind==='drop')nativeDropStep(next,load!==0);else nativeBalanceStep(next,-load);
     offset=(next.y-pulley.driver.y)*pulley.driver.side!;
    }
   }
   return {x:object.x,y:nativeObjectPosition(object,offset).y+1};
  }
  if(model==='water-descender'){
   if(this.context.levelId==='5-2'){
    const phase=fiveTwoWaterEntryRules.platformLoadPhase[platform.x===364?0:1];
    return {x:platform.x,y:(phase+frame*0.9375)%256};
   }
   // Candidate fits every complete pose in optional-water-actors.json exactly
   // after raster rounding. No retained pose establishes the offscreen wrap or
   // room-load epoch. The inferred pipe load is78frames before source6613;
   // exact phase and wrapping still require independent observation.
   const phase=(platform.x===364?252.6875:212.75)-waterEntryRules.platformEpochOffsetFrames*0.9375;
   return {x:platform.x,y:(phase+frame*0.9375)%256};
  }
  if(model==='observed-lift')return {x:platform.x,y:measuredLiftArtworkY(frame,this.context.liftPhaseAtFrameZero??LIFT_PHASE_AT_FIRST_VISIBLE)};
  if(model==='camera-lift'&&this.fiveThreeLiftStart!==undefined)return {x:platform.x,y:measuredLiftArtworkY(frame-this.fiveThreeLiftStart,240)};
  if(model==='camera-horizontal'){
   // Inferred offscreen hold avoids exposing the unrelated sine before activation.
   // The native pre-activation position and exact activation epoch are unobserved.
   const elapsed=this.fiveThreeHorizontalStart===undefined?0:Math.max(0,frame-this.fiveThreeHorizontalStart);
   const age=elapsed-fiveThreeHorizontal.cycleOffsetAfterTrigger;
   const t=(age%fiveThreeHorizontal.period+fiveThreeHorizontal.period)%fiveThreeHorizontal.period;
   const samples=fiveThreeHorizontal.samples,next=samples.findIndex(([at])=>at>t);
   const [a,x]=samples[next-1],[b,z]=samples[next];
   return {x:platform.x+x+(z-x)*(t-a)/(b-a),y:platform.y};
  }
  if(model==='camera-lava'){
   // The pre-activation hold and camera epoch are inferred from source images.
   const elapsed=this.eightFourLavaStart===undefined?0:frame-this.eightFourLavaStart;
   const t=elapsed-eightFourPlatformRules.phaseOffset,w=2*Math.PI*t/eightFourPlatformRules.period;
   const [c0,c1,c2,c3,c4]=eightFourPlatformRules.coefficients;
   // A copy in a later lap of the 8-4 main loop (1024 px period) moves the same way, one lap further right.
   const lap=1024*Math.round((platform.x-c0)/1024);
   return {x:lap+c0+c1*Math.cos(w)+c2*Math.sin(w)+c3*Math.cos(3*w)+c4*Math.sin(3*w),y:platform.y};
  }
  if(model==='contact-fall'||model==='contact-cloud'){
   const began=this.activated.get(platform),elapsed=began===undefined?0:Math.max(0,frame-began);
   return model==='contact-fall'?{x:platform.x,y:97+elapsed*2.25}:{x:256+elapsed,y:161};
  }
  // Preserve existing approximation only for platforms with no measured rule.
  // In particular a balance label does not establish actual pulley behavior.
  const delta=Math.sin(frame*platform.speed/Math.max(1,platform.range))*platform.range;
  return {x:platform.x+(platform.axis==='x'?delta:0),y:platform.y+(platform.axis==='y'||platform.axis==='balance'?delta:platform.axis==='fall'?((frame*platform.speed)%240):0)};
 }
 collisionPosition(platform:PlatformSpec,frame:number):PlatformPosition {
  const artwork=this.artworkPosition(platform,frame);return {x:artwork.x,y:artwork.y-1};
 }
}
