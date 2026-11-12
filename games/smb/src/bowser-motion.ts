import rules from '../data/bowser-native-rules.json';

/** Native Bowser (object id 45) motion rules, measured on the recorded route and on branching probes (numbers and evidence in
 * data/bowser-native-rules.json). Native Bowser is two 16 px objects: the primary one (the anchor `x`) is the half that leads his facing, so the 32 px body's
 * left edge is the anchor when he faces left and anchor-16 when he faces right. The anchor steps by `speed` px every 4th frame. Several native choices are
 * random (the right limit, hop pauses, fire intervals): the values are the ones seen on the recorded route / the free probe, not fixed native constants.
 * A first right limit of 34 (1-4, 2-4, 3-4, 5-4) or 18 (4-4, 6-4, 7-4, 8-4) was recorded; a 5-4 jitter probe gave both for the same level. */
export interface BowserMotor{
 originX:number;anchor:number;speed:number;side:-1|1;legs:number;rightLimit:number;
 frames:number;airborne:boolean;pauseIndex:number;nextHop:number;nextFlame:number;
}
export function createBowserMotor(originX:number,levelId:string):BowserMotor{
 const {motion,hop,flame}=rules;
 return {originX,anchor:originX,speed:motion.spawnSpeed,side:-1,legs:0,rightLimit:motion.firstRightLimit.shortLevels.includes(levelId)?motion.firstRightLimit.short:motion.firstRightLimit.long,
  frames:0,airborne:false,pauseIndex:0,nextHop:hop.firstFrames,nextFlame:flame.firstFrames};
}
/** Native anchor at spawn (the compiled level data holds a screenshot-grid guess; the compile pipeline's guards pin that data, so it is corrected here). */
export function nativeBowserSpawnX(levelId:string,x:number){
 const spawn=(rules.spawn as Record<string,{compiled:number;native:number}|undefined>)[levelId];
 return spawn&&x===spawn.compiled?spawn.native:x;
}
/** Body left edge for the collision/render box: the anchor leads the facing. */
export function bowserBodyX(m:BowserMotor){return m.side<0?m.anchor:m.anchor-16;}
/** One native frame of horizontal motion (a step every 4th frame, then the limit checks). Facing right he walks on to the chase limit and stops. */
export function advanceBowserX(m:BowserMotor){
 const {motion}=rules;m.frames++;
 if(m.frames%motion.tickFrames!==0)return;
 if(m.side>0){if(m.anchor-m.originX<motion.chaseLimit)m.anchor+=m.speed;return;}
 m.anchor+=m.speed;
 const offset=m.anchor-m.originX;
 if(m.speed>0&&offset>=m.rightLimit){m.speed=motion.leftSpeed;m.legs++;}
 else if(m.speed<0&&offset<=(m.legs<=1?motion.firstLeftLimit:motion.laterLeftLimit)){m.speed=motion.rightSpeed;m.rightLimit=motion.laterRightLimit;m.legs++;}
}
/** He turns to face Mario on landing from a hop; turning right sends him chasing (speed 2, no more hops or fire: 5-4 free probe, 345 frames; the recorded route in
 * every castle). Turning back left from the chase is not measured: the remake re-checks every frame of the chase and resumes the leftward walk and the hops. */
export function bowserFaceMario(m:BowserMotor,playerX:number,levelId:string){
 const side:-1|1=playerX>m.anchor?1:-1;
 if(side===m.side)return;
 m.side=side;
 if(side>0)m.speed=rules.motion.chaseSpeed;else{m.speed=rules.motion.leftSpeed;m.nextHop=m.frames+bowserHopPause(m,levelId);}
}
/** Frames to wait on the ground after a landing: the first pause was 47 (1-4) or 15 (5-4) natively, later ones 47, 63, 63, 46 on the free 5-4 run (all random natively). */
export function bowserHopPause(m:BowserMotor,levelId:string){
 const {firstPause,laterPauses}=rules.hop,first=m.pauseIndex++===0;
 return first?(firstPause as Record<string,number>)[levelId]??firstPause.default:laterPauses[(m.pauseIndex-2)%laterPauses.length];
}
export const BOWSER_HOP={vy:rules.hop.vy,gravity:rules.hop.gravity};
export const bowserFlameSpeed=(levelId:string)=>Number(levelId.split('-')[0])>=5?rules.flame.speedWorldsFiveUp:rules.flame.speedEarlier;
/** Fire is due only while he faces left: first `firstFrames` after he appears, then every `period` frames. */
export function bowserFlameDue(m:BowserMotor){
 if(m.side>0||m.frames<m.nextFlame)return false;
 m.nextFlame=m.frames+rules.flame.period;return true;
}
export const BOWSER_FLAME_OFFSET_X=rules.flame.offsetX;
