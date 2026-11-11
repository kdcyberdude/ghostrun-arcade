import type {PlatformSpec} from './types.js';
import waterEntryRules from '../data/water-entry-rules.json';
import fiveTwoWaterEntryRules from '../data/water-entry-5-2-rules.json';
import eightFourPlatformRules from '../data/eight-four-platform-rules.json';
import fiveThreeHorizontal from '../data/five-three-horizontal-platform.json';
import nativePlatformMotion from '../data/native-platform-motion.json';

export type PlatformMotionModel='native-horizontal'|'native-lift'|'native-wrap'|'native-balance'|'native-drop'|'observed-lift'|'camera-lift'|'camera-horizontal'|'camera-lava'|'contact-fall'|'contact-cloud'|'water-descender'|'unmeasured';
export interface NativePlatformObject {kind:'horizontal'|'lift'|'wrap'|'balance'|'drop';spec:[number,number];x:number;y:number;direction?:'up'|'down';phase?:number;pair?:[number,number];side?:1|-1;spawnCamera:number}

/** Native platform objects (data/native-platform-motion.json, made from the reference RAM per frame; see
 * evidence/moving-platform-phase-findings-20261109.md) are created when the scroll position reaches spawnCamera and run
 * from that frame on: horizontal ones start at their right end and repeat a 240-frame cycle, lifts start at one end of a
 * 384-frame cycle. The clock is therefore the object's own age, never the level timeline. Balance platforms hang in
 * counterweighted pairs: they stay put until a rider stands on one of them, then the pair accelerates (see `pulley`). */
export function nativePlatformObject(platform:PlatformSpec,context:PlatformMotionContext):NativePlatformObject|undefined {
 const list=(nativePlatformMotion.objects as unknown as Record<string,NativePlatformObject[]>)[`${context.levelId}/${context.areaId}`];
 return list?.find(o=>o.spec[0]===platform.x&&o.spec[1]===platform.y)??eightFourLapObject(list,platform,context);
}
/** 8-4 main repeats columns 32-95 every 1024 px: a lap copy of the id 40 lift is the same native object one lap right (native 1120 -> 2144). */
function eightFourLapObject(list:NativePlatformObject[]|undefined,platform:PlatformSpec,context:PlatformMotionContext):NativePlatformObject|undefined {
 if(context.levelId!=='8-4'||context.areaId!=='main'||platform.x<1024)return undefined;
 const lap=1024*Math.floor((platform.x-512)/1024),o=list?.find(o=>o.spec[0]===platform.x-lap&&o.spec[1]===platform.y);
 return o&&{...o,spec:[platform.x,platform.y],x:o.x+lap,spawnCamera:o.spawnCamera+lap};
}
const tableAt=(table:readonly number[],t:number)=>{
 const n=table.length,k=((t%n)+n)%n,a=Math.floor(k);
 return table[a]+(table[(a+1)%n]-table[a])*(k-a);
};
/** Wrapping lift (native ids 38/39 large, 43/44 castle): 15/16 px per frame, 15 pixel steps then one idle step in every 16 frames (`phase` is
 * the object's hidden position in that cycle), y wraps modulo 256, x is fixed. Up lifts subtract, down lifts add. */
export function nativeWrapY(object:NativePlatformObject,age:number){
 const rules=nativePlatformMotion.wrap,steps=Math.floor((object.phase!+rules.stepsPerPeriod*Math.max(0,age))/rules.period);
 return (((object.y+(object.direction==='up'?-steps:steps))%rules.span)+rules.span)%rules.span;
}
/** Collision-surface position of a native object that has existed for `age` frames (balance: `age` is the pair offset). */
export function nativeObjectPosition(object:NativePlatformObject,age:number):PlatformPosition {
 if(object.kind==='wrap')return {x:object.x,y:nativeWrapY(object,age)};
 if(object.kind==='balance'||object.kind==='drop')return {x:object.x,y:Math.round(object.y+object.side!*age)};
 if(object.kind==='horizontal')return {x:object.x-tableAt(nativePlatformMotion.horizontal.drop,age-nativePlatformMotion.horizontal.phase),y:object.y};
 const cycle=nativePlatformMotion.lift.drop,drop=cycle[((age%cycle.length)+cycle.length)%cycle.length];
 return {x:object.x,y:object.direction==='up'?object.y-(drop+(age>0?1:0)):object.y+drop};
}
/** Horizontal support window of a platform for a player at x (collision x of the sprite): natively a player stands on it from 13 px before its
 * left edge to 2 px past its right edge (landings from dx -13/-14, last supported frames at dx width+1..+3 on 3-3, 4-2, 5-4 and 6-3 platforms
 * of both 32 and 48 px; tools/platform-compare.ts, docs/NATIVE_ROLES.md). The earlier window (x+12 > left, x+3 < right) ended 6 px early on the right. */
export const platformSupportsX=(playerX:number,platformX:number,width:number)=>playerX+14>platformX&&playerX-2<platformX+width;
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

/** Native object slot a created native platform holds: its spawn was reached and it is still within 73 px left of the camera (walker removal edge, not measured for platforms). */
export function nativePlatformHoldsSlot(motion:PlatformMotion,platform:PlatformSpec,context:PlatformMotionContext,camera:number,frame:number){
 const o=nativePlatformObject(platform,context);
 return !!o&&!motion.lost.has(platform)&&!motion.waiting.has(platform)&&camera>=o.spawnCamera&&motion.collisionPosition(platform,frame).x+platform.width>=camera-73;
}
/** Querying positions never advances simulation. */
export class PlatformMotion {
 private activated=new Map<PlatformSpec,number>();
 private fiveThreeLiftStart:number|undefined;
 private eightFourLavaStart:number|undefined;
 private fiveThreeHorizontalStart:number|undefined;
 private cameraLog:Array<[number,number]>=[];
 private nativeStart=new Map<PlatformSpec,number>();
 /** Native objects never created: their spawn point passed while all five object slots were busy (evidence/platslot-findings-20261111.md). */
 lost=new Set<PlatformSpec>();
 /** Spawn point passed with all slots busy while the object was still off screen: made on the first frame a slot is free (`create`). */
 waiting=new Set<PlatformSpec>();
 create(platform:PlatformSpec,frame:number){this.waiting.delete(platform);this.nativeStart.set(platform,frame);}
 private pulleys=new Map<string,{start:number;d:number[];v:number;load:Record<string,number>;rules:typeof nativePlatformMotion.pulley}>();
 constructor(public context:PlatformMotionContext){}
 reset(context=this.context){this.context=context;this.activated.clear();this.fiveThreeLiftStart=undefined;this.eightFourLavaStart=undefined;this.fiveThreeHorizontalStart=undefined;this.cameraLog=[];this.nativeStart.clear();this.pulleys.clear();this.lost.clear();this.waiting.clear();}
 // Frames since the native object was created: the first logged frame whose camera had reached its spawn camera.
 private nativeAge(platform:PlatformSpec,object:NativePlatformObject,frame:number){
  let start=this.nativeStart.get(platform);
  const last=this.cameraLog[this.cameraLog.length-1];
  if(start===undefined&&!this.waiting.has(platform)&&last&&last[1]>=object.spawnCamera){start=this.cameraLog.find(([,camera])=>camera>=object.spawnCamera)![0];this.nativeStart.set(platform,start);}
  return start===undefined?0:Math.max(0,frame-start);
 }
 // Fitted to two approaches and conditionally checked on a third; the exact
 // native activation frame is unknown and a one-frame shift can fail 2px.
 advance(frame:number,camera:number){
  this.cameraLog.push([frame,camera]);
  this.advancePulleys(frame);
  if(this.context.levelId==='5-3'&&this.context.areaId==='main'&&this.fiveThreeHorizontalStart===undefined&&camera>=fiveThreeHorizontal.cameraThreshold)this.fiveThreeHorizontalStart=frame;
  if(this.context.levelId==='8-4'&&this.context.areaId==='main'&&this.eightFourLavaStart===undefined&&camera>=eightFourPlatformRules.cameraThreshold)this.eightFourLavaStart=frame;
  if(this.context.levelId==='5-3'&&this.context.areaId==='main'&&this.fiveThreeLiftStart===undefined&&camera>=624)this.fiveThreeLiftStart=frame;
 }
 // A rider on one side of a balance pair accelerates that side down and its partner up (0.02 px/frame^2, fitted to every ride of
 // the recorded route within 1 px); with nobody on either side the pair slows to a stop. The effect shows on the next frame.
 private advancePulleys(frame:number){
  for(const pulley of this.pulleys.values()){
   const rules=pulley.rules,load=(pulley.load['1']===frame?1:0)-(pulley.load['-1']===frame?1:0);
   pulley.v=load!==0?Math.max(-rules.speedCap,Math.min(rules.speedCap,pulley.v+load*rules.accel)):pulley.v>0?Math.max(0,pulley.v-rules.release):Math.min(0,pulley.v+rules.release);
   let d=pulley.d[pulley.d.length-1]+pulley.v;
   if(Math.abs(d)>=rules.travelCap){d=Math.sign(d)*rules.travelCap;pulley.v=0;}
   pulley.d.push(d);
  }
 }
 contact(platform:PlatformSpec,frame:number){
  const model=platformMotionModel(platform,this.context);
  if(model==='native-balance'||model==='native-drop'){
   const object=nativePlatformObject(platform,this.context)!,key=object.pair!.join(',');
   let pulley=this.pulleys.get(key);if(!pulley){pulley={start:frame,d:[0],v:0,load:{},rules:model==='native-drop'?nativePlatformMotion.drop:nativePlatformMotion.pulley};this.pulleys.set(key,pulley);}
   pulley.load[String(object.side)]=frame;
  }
  if((model==='contact-fall'||model==='contact-cloud')&&!this.activated.has(platform))this.activated.set(platform,frame);
 }
 artworkPosition(platform:PlatformSpec,frame:number):PlatformPosition {
  if(this.lost.has(platform)||this.waiting.has(platform))return {x:-4096,y:4096};
  const model=platformMotionModel(platform,this.context);
  if(model==='native-horizontal'||model==='native-lift'||model==='native-wrap'){
   const object=nativePlatformObject(platform,this.context)!,position=nativeObjectPosition(object,this.nativeAge(platform,object,frame));
   return {x:position.x,y:position.y+1};
  }
  if(model==='native-balance'||model==='native-drop'){
   const object=nativePlatformObject(platform,this.context)!,pulley=this.pulleys.get(object.pair!.join(','));
   const offset=!pulley||frame<=pulley.start?0:pulley.d[Math.min(frame-pulley.start,pulley.d.length-1)];
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
