/** Horizontal player speed motor recovered from retained read-only reference measurements.
 *
 * Speed is an integer in 1/4096 px per frame (signed speed byte * 256 + sub-byte fraction); the player
 * advances by the speed byte only (byte/16 px). Rules come from tools/fidelity-lab/native-motor-rows.py
 * and evidence/world11-skid-physics-findings-20261109.md, never from game code or ROM data. The roles of
 * the measured values are tentative (evidence/fidelity-ground-physics-audit.json); this module is scored
 * frame by frame by tools/fidelity-lab/native-motor-score.ts before it is wired into the simulation.
 */
export type Direction=-1|0|1;
const BRAKE_STOP_BYTE=10,DOWN_FAST=27*256;
const WALK_CAP=24,RUN_CAP=40,RUN_CLASS_BYTE=25,FAST_BYTE=29;
/** Ground wall contacts below this speed byte leave the next jump at the walk class (native rows: a contact at byte 25-28 then a jump steps 152; from byte 29 on the jump is the 208-step jump). */
const WALLRUN_BYTE=FAST_BYTE;
/** Airborne step below byte 25 of a jump taken at byte >= 29, out of a fast-step deceleration, or inside the pause of a run-speed wall contact
 * (native route rows: the step stays 208 and the cap stays the walk cap until landing; there is no speed at which it recovers). */
const SKID_GRACE_BYTE=11;
const DROP_ACCEL=208,WALK_OFF_FRAMES=3;
const WALK_ACCEL=152,RUN_ACCEL=228,REST_ACCEL=304,FAST_OVER_ACCEL=208;
const FRICTION=152,FAST_FRICTION=208;
/** Speed magnitudes (1/4096 px) above which a deceleration starts at the fast step (first frame) and keeps the
 * fast step for the rest of the deceleration (latch). Bracketed by retained skid onsets; the left-moving first-frame
 * threshold lies between 6916 and 7144 and the right-moving latch threshold between 7144 and 7220. */
const FIRST_FAST=[{right:FAST_BYTE*256,left:7040}][0],LATCH_FAST={right:28*256,left:6840};
/** Largest speed byte for a ground frame: the run cap while B (or the run grace) is active, else the walk cap. */
export const groundCapByte=(running:boolean)=>running?RUN_CAP:WALK_CAP;
export const byteOf=(speed:number)=>Math.floor(speed/256);
/** Horizontal distance for one frame at `speed` (byte/16 px). */
export const motionOf=(speed:number)=>byteOf(speed)/16;

export class NativeMotor{
 speed=0;
 /** Direction Mario faces for the motor: set by a ground press after that frame's step, never in the air; 0 until the first ground press after a load. */
 facing:-1|0|1=0;
 /** Direction of motion: follows the speed byte, unchanged while the byte is 0; 0 until the first motion after a load, which counts as facing the other way. */
 moving:-1|0|1=0;
 /** Steps double while facing and motion disagree (no motion yet counts as disagreeing). */
 private get disagree(){return this.moving===0||(this.facing!==0&&this.facing!==this.moving);}
 private track(){const b=byteOf(this.speed);if(b>0)this.moving=1;else if(b<0)this.moving=-1;}
 /** Deceleration step latched when a deceleration begins. */
 friction=0;
 /** An opposite press doubles later accelerations and decelerations until a ground same-direction step uses it. */
 skid=false;
 /** Set by a turnaround; keeps the first sub-byte acceleration at the walk step. */
 turned=false;
 /** Air acceleration class chosen at takeoff from the speed byte. */
 airRun=false;
 /** Speed byte cap that replaces the ground cap for every press (water: 16 on the floor, 24 while swimming). */
 cap?:number;
 /** Frames the run acceleration persists after B is released (fitted; see simulation.ts history). */
 runGrace=0;
 /** The first acceleration after a turnaround repeats the friction step the skid used (walking presses only). */
 turnStep=WALK_ACCEL;
 turnPending=false;
 /** The frame after a restart from a sub-walk speed also takes the walk step, whatever B says. */
 startup=false;
 private startupPending=false;
 /** After a run-to-walk drop the next walk step repeats the 208 step once. */
 private dropPending=false;
 /** Frames of held-direction acceleration still suppressed after a wall contact. */
  freeze=0;
 /** The 208 class of this jump, set at takeoff (native rows: byte >= 29 always, byte <= 26 never, 27-28 only out of a brake): below byte 25 the step is 208 and the cap the walk cap. */
 airDrop=false;
 /** A ground press right after a wall contact accelerates from the kept fraction; the sub-walk-step restart does not apply. */
 private afterWall=false;
 /** Consecutive ground frames before the current air frame: a walk-off after a real stay on the ground must not inherit the drop state of an earlier jump. */
 private groundFrames=0;
 /** A ground wall contact at a run-class speed latches until the contact pause ends: a jump taken inside the pause is the 208-step, walk-cap jump (native route rows: takeoff on or right after the contact row). */
 private wallRun=false;
 /** A ground frame with a direction press since the last air frame (the drop class of the last jump survives ground stays without one). */
 private groundPressed=false;
 /** The last informative ground step was a fast (208) friction step, a turnaround out of one included: the next jump is the 208 class even after the
  * friction latch is gone (a B stop, a turnaround, a stand). Any ground acceleration clears it (native r3+r4 jumps below byte 25: 181 of 186 such takeoffs step 208). */
 private fastClass=false;
 /** Braking in a run-class jump taken below byte 29 (no 208 class): the landing row brakes by its own speed. */
 private runLanding=false;
 /** Class of the jump about to start, read before the takeoff frame's own step: byte >= 29, fast-step deceleration, or the pending 208 run-to-walk clamp is a 208 jump (undefined: no takeoff press, `takeoff()` reads the current state). */
 private jumpFast?:boolean;
 /** Read before `takeoff()` clears it: the jump about to start follows a run-speed ground wall contact (the vertical jump class stays the run class). */
 get wallRunLatched(){return this.wallRun;}
 /** Overrides the ground speed-byte cap: the automatic pipe walk accelerates like a walk press but stops at byte 12. */
 capByte?:number;
 /** `facing`: an area load faces right (native: a jump from rest at a level start keeps the doubled 304 air step against the motion, r3+r4 rows). */
 reset(speed=0,facing:-1|0|1=0){this.facing=facing;this.moving=0;this.speed=speed;this.friction=0;this.skid=false;this.turned=false;this.airRun=false;this.runGrace=0;this.freeze=0;this.airDrop=false;this.wallRun=false;this.afterWall=false;this.turnStep=WALK_ACCEL;this.turnPending=false;this.startup=false;this.startupPending=false;this.dropPending=false;this.fastClass=false;this.runLanding=false;}
 /** A blocked step keeps only the fraction of the speed that step produced and pauses acceleration for the next frame.
  * The caller re-arms the pause (`freeze=1`) on every later frame in which the player is still backed out of the wall:
  * native frames with a side contact (a hold of the contact timer) leave the along-motion acceleration paused, so a deep
  * high-speed contact pauses several frames and a ground contact one, whatever buttons are held. Opposite presses and
  * neutral frames are not delayed by the pause. */
 hitWall(produced:number,pressedAlong=true,airHold=0,airborne=false):number{
  this.speed=produced;this.track();
  // Braking into a wall (an opposite press) keeps its friction and skid; only presses along the motion restart.
  if(!pressedAlong)return this.speed=((produced%256)+256)%256;
  // A walled run-class jump has lost its run speed byte: from here it is the 208-step, walk-cap jump until it lands.
  if(!airborne&&Math.abs(byteOf(produced))>=WALLRUN_BYTE)this.wallRun=true;
  this.friction=0;this.skid=false;this.turned=true;this.turnPending=false;this.afterWall=true;this.freeze=Math.max(1,airHold);
  return this.speed=((produced%256)+256)%256;
 }
 /** A frame without a direction press (or with presses ignored) lets the wall pause elapse. */
 tickFreeze():void{if(this.freeze>0)this.freeze--;}
 /** Advance the run latch for this frame and return whether the run acceleration applies. */
 updateRun(direction:Direction,runPressed:boolean):boolean{
  const refresh=runPressed&&direction!==0;
  if(refresh)this.runGrace=this.skidGrace(direction)?0:9;
  const running=runPressed||this.runGrace>0;
  if(!refresh&&this.runGrace>0)this.runGrace--;
  return running;
 }
 /** B held with a press against the motion (a skid) at byte >= SKID_GRACE_BYTE leaves no run grace behind: after the B release the turnaround steps 152.
  * Below it the grace survives (native 5-3 route rows 43240-43251). */
 private skidGrace(direction:Direction):boolean{return direction*this.speed<0&&Math.abs(byteOf(this.speed))>=SKID_GRACE_BYTE;}
 /** One ground frame with a direction held. Returns the new speed. */
 groundPress(direction:1|-1,running:boolean,jumpPress=false):number{
  this.track();this.jumpFast=jumpPress?this.friction===FAST_FRICTION||this.fastClass||this.dropPending||Math.abs(byteOf(this.speed))>=FAST_BYTE:undefined;
  // The takeoff frame already steps like the air (hundreds of native model rows): an opposite press never turns around here, whatever the speed byte.
  if(jumpPress&&direction*Math.sign(this.speed)<0){const big=Math.abs(byteOf(this.speed))>=RUN_CLASS_BYTE;if(this.freeze>0)this.freeze--;this.friction=0;this.skid=false;this.turned=false;this.turnPending=false;return this.speed+=direction*(big?RUN_ACCEL:this.jumpFast?DROP_ACCEL:WALK_ACCEL)*(this.disagree?2:1);}
  const low=Math.abs(byteOf(this.speed))<=BRAKE_STOP_BYTE;const out=this.groundPressStep(direction,running,jumpPress);if(!jumpPress){this.facing=direction;if(low)this.moving=direction;}return out;
 }
 private groundPressStep(direction:1|-1,running:boolean,jumpPress:boolean):number{
  this.groundFrames++;if(!jumpPress){this.groundPressed=true;this.fastClass=false;}
  // The takeoff frame runs only when the speed is already in the run class (byte >= 25); the cap follows the speed reached.
  this.startupPending=this.startup;this.startup=false;
  const speed=this.speed,sign=Math.sign(speed),maxByte=this.cap??this.capByte??(jumpPress?(Math.abs(byteOf(speed))>WALK_CAP?RUN_CAP:WALK_CAP):groundCapByte(running));
  if(jumpPress)running=running&&Math.abs(byteOf(speed))>=RUN_CLASS_BYTE;
  if(this.freeze>0){this.freeze--;if(direction*sign>=0)return speed;}
  this.wallRun=false;
  const restartAllowed=!this.afterWall;if(!restartAllowed)this.turned=false;this.afterWall=false;
  if(sign===0){this.friction=0;this.skid=false;this.turned=false;return this.speed=direction*this.restStep(direction,running);}
  // A positive speed below the walk step restarts at that step (retained low-speed startups).
  if(direction>0&&sign>0&&speed<WALK_ACCEL&&!jumpPress&&restartAllowed&&this.cap===undefined){this.startup=true;return this.speed=WALK_ACCEL;}
  // A positive speed below one byte has no direction yet: an opposite press adds the plain step and may cross zero.
  if(direction*sign<0){
   if(!(sign>0&&byteOf(speed)===0))return this.decelerate(direction);
   // A skid in progress keeps subtracting its (doubled) step through the sub-byte range.
   if(this.skid&&this.friction!==0){
    const step=this.friction*2,next=speed-step;
    if(next<0){this.fastClass=this.friction===FAST_FRICTION;this.turnStep=this.friction;this.turnPending=true;this.friction=0;this.skid=false;this.turned=true;}else this.skid=true;
    return this.speed=next;
   }
   // A fresh opposite press on a stationary positive sub-byte residue (72, 104, 140, 156, 204 -> -152 in native 2-1 f11155, f11005, 1-?, 6-? rows) drops the residue and steps the walk step.
   if(!jumpPress&&this.cap===undefined){this.friction=0;this.skid=false;this.turned=false;return this.speed=direction*WALK_ACCEL;}
  }
  return this.speed=this.accelerate(direction,running,maxByte,true,(jumpPress&&this.jumpFast||this.dropLanding(jumpPress))&&!running?DROP_ACCEL:undefined);
 }
 /** The landing row of a 208-class jump still steps 208 for a press along the motion without B (native r3+r4 landing rows below the
  * walk cap after a 208-class air spell: about 146 of 155 step 208, doubled 416 or clamp at the cap; after a 152-class spell 152). */
 private dropLanding(jumpPress:boolean):boolean{return !jumpPress&&this.airDrop&&this.groundFrames===1;}
 /** First step from exactly 0: the run/walk step while the last motion was along the press, the walk step when Mario already faces the press's opposite (a turnaround from rest), else the doubled walk step. */
 private restStep(direction:1|-1,running:boolean):number{
  if(this.moving===direction)return running?RUN_ACCEL:WALK_ACCEL;
  return this.facing===-direction&&this.moving===-direction?WALK_ACCEL:REST_ACCEL;
 }
 /** One ground frame with no direction held (coasting). Holding B stops the player outright below byte 11 (retained captures). */
 groundCoast(bHeld=false):number{
  this.groundFrames++;
  this.startup=false;this.afterWall=false;
  if(bHeld&&this.speed!==0&&Math.abs(this.speed)<(BRAKE_STOP_BYTE+1)*256){this.friction=0;this.skid=false;return this.speed=0;}
  this.coastAgainstFacing=this.downFacingDoubles(Math.sign(this.speed));const next=this.decelerate(0);this.coastAgainstFacing=false;return next;
 }
 /** A neutral coast (no Down) while facing against the motion doubles the latched friction step (native r3+r4 coast rows: 304 for 152 and
  * 416 for 208 in about 250 rows, facing set by the last ground press). Not applied to Down coasts. */
 private coastAgainstFacing=false;
 /** One ground frame with Down held (direction input is ignored). A small player stops outright below byte 11 unless
  * pressing along the motion; otherwise Down coasts like a neutral frame (retained Down captures). */
 groundDown(direction:Direction,smallStop:boolean):number{
  this.groundFrames++;
  this.startup=false;this.afterWall=false;if(direction!==0){this.wallRun=false;this.groundPressed=true;}
  const speed=this.speed,sign=Math.sign(speed);
  if(sign===0){this.downRest();return speed;}
  const raw=byteOf(speed);
  if(smallStop&&direction*sign<=0&&!(sign>0&&raw===0)&&raw>=-BRAKE_STOP_BYTE&&raw<=BRAKE_STOP_BYTE){this.friction=0;this.skid=false;return this.speed=0;}
  // Pressing along the motion while Down is held re-evaluates the step every frame (fast step from byte 27).
  if(direction*sign>0){this.friction=Math.abs(speed)>=DOWN_FAST?FAST_FRICTION:FRICTION;this.skid=this.downFacingDoubles(sign);const next=this.decelerate(0);this.skid=false;this.fastClass=false;return next;}
  return this.decelerate(0);
 }
 /** Pressing along the motion with Down held doubles the step while Mario faces the other way (Down never turns him; native
  * explore rows: a Down+Right landing after an air turn while facing left steps 304 per frame, 3672 -> 3368 -> 3064). */
 private downFacingDoubles(sign:number):boolean{
  return this.facing!==0&&this.facing!==sign;
 }
 /** Down held at rest lines the motion direction up with the facing, so the next press from 0 takes the plain walk/run step
  * instead of the doubled rest step 304 (native explore rows, first press after a Down spell at rest). */
 private downRest():void{
  if(this.facing!==0)this.moving=this.facing;
 }
 private accelerate(direction:1|-1,running:boolean,maxByte:number,ground:boolean,airBase?:number):number{
  const speed=this.speed,raw=byteOf(speed),over=speed>0?raw>maxByte:raw<-maxByte;
  const base=airBase??(running?RUN_ACCEL:WALK_ACCEL);
  const pending=ground&&this.turnPending;if(ground)this.turnPending=false;
  const startup=ground&&this.startupPending;
  // The repeated 208 step is a walk step: a B press right after the drop takes the run step (native r3+r4 rows after a walk-cap clamp: B steps 228, 177 of 184).
  const dropStep=ground&&this.dropPending&&!over&&!running;if(ground)this.dropPending=false;
  const add=startup&&!over?WALK_ACCEL:dropStep?FAST_OVER_ACCEL:pending&&!running&&!over?this.turnStep:over?(Math.abs(raw)>=FAST_BYTE?FAST_OVER_ACCEL:WALK_ACCEL):this.turned&&Math.abs(raw)<1?(airBase??WALK_ACCEL):base*(this.skid||(ground&&direction===this.moving&&this.disagree)?2:1);
  this.friction=0;if(ground)this.skid=false;
  let next=speed+direction*add;const nextRaw=byteOf(next),fraction=((next%256)+256)%256;
  // Only a pre-clamp byte in the fast class arms the repeated208 step (native raw25..27 clamps resume152; raw28 crossing29 resumes208).
  if(over&&ground&&this.cap===undefined&&Math.abs(nextRaw)>=FAST_BYTE)this.dropPending=true;
  if(direction>0&&nextRaw>maxByte)next=maxByte*256+fraction;
  else if(direction<0&&nextRaw<-maxByte)next=-maxByte*256+fraction;
  if(Math.abs(byteOf(next))>=1)this.turned=false;
  return next;
 }
 /** A neutral deceleration after the landing of a 208-class jump, before any ground direction press, brakes at the fast step whatever the speed
  * (native r3+r4 first coast steps below byte 28 after a 208-class air spell: 49 of 53 at 208 or doubled 416; after a 152-class spell none). */
 private dropFriction(direction:Direction):boolean{return direction===0&&this.airDrop&&!this.groundPressed;}
 /** Landing brake of a run-class jump taken below byte 29 (native r3+r4, 20 of 20 landings with an opposite press): 152 up to byte 31, 208 from
  * byte 33 on; the following rows latch the friction from the speed like a fresh ground deceleration (152 -> 304 below byte 28, 152 -> 416 above). */
 private runLandingStep(speed:number):number{
  const step=Math.abs(byteOf(speed))>=32?FAST_FRICTION:FRICTION;
  this.friction=Math.abs(speed)>=(speed>0?LATCH_FAST.right:LATCH_FAST.left)?FAST_FRICTION:FRICTION;
  return step;
 }
 private decelerate(direction:Direction):number{
  const speed=this.speed,sign=Math.sign(speed);
  if(sign===0)return speed;
  const raw=byteOf(speed),relative=direction*sign;
  if(sign>0&&raw===0&&relative>=0)return speed;
  let step:number,doubled=false;
  if(this.friction===0){
   const magnitude=Math.abs(speed),first=sign>0?FIRST_FAST.right:FIRST_FAST.left,latch=sign>0?LATCH_FAST.right:LATCH_FAST.left;
   const drop=this.dropFriction(direction);this.friction=drop||magnitude>=latch?FAST_FRICTION:FRICTION;step=drop||magnitude>=first?FAST_FRICTION:FRICTION;doubled=this.coastAgainstFacing;if(doubled)step*=2;
  }else{doubled=this.skid||(relative<0&&this.disagree)||this.coastAgainstFacing;step=(this.runLanding?this.runLandingStep(speed):this.friction)*(doubled?2:1);}
  this.runLanding=false;
  const decrement=step;this.fastClass=(doubled?step/2:step)===FAST_FRICTION;
  if(relative<0){
   if(Math.abs(raw)<=10){
    this.turnStep=this.friction||FRICTION;this.turnPending=true;this.friction=0;this.skid=false;this.turned=true;
    return this.speed=-sign*decrement;
   }
   this.skid=true;
  }
  return this.speed=speed-sign*decrement;
 }
 /** Classify the jump from the speed after the takeoff frame's ground step. */
 takeoff():void{const b=Math.abs(byteOf(this.speed));this.airRun=b>=RUN_CLASS_BYTE;this.airDrop=(this.wallRun&&!this.airRun)||(this.airDrop&&(this.groundFrames<=1||!this.groundPressed))||(this.jumpFast??(b>=FAST_BYTE||this.friction===FAST_FRICTION||this.fastClass||this.dropPending));this.jumpFast=undefined;this.fastClass=false;this.wallRun=false;this.groundFrames=0;}
 /** One airborne frame. Returns the new speed. */
 air(direction:Direction,bHeld=false):number{
  this.startup=false;this.afterWall=false;this.groundPressed=false;
  if(this.groundFrames>0){
   // Two supported motor steps already promote a run-speed walk-off (native1-4/7-4); short slower landings retain their prior air class.
   if(this.groundFrames>=WALK_OFF_FRAMES||this.groundFrames===2&&Math.abs(byteOf(this.speed))>=RUN_CLASS_BYTE)this.takeoff();
   this.groundFrames=0;
  }
  if(direction===0){if(this.freeze>0)this.freeze--;return this.speed;}
  if(this.freeze>0){this.freeze--;if(direction*Math.sign(this.speed)>=0)return this.speed;}
  this.track();
  const speed=this.speed,sign=Math.sign(speed);
  const opposite=direction*sign<0;
  // In a run-class jump the speed byte picks the step and cap (tens of thousands of native rows: byte >= 25 steps 228 up to byte 40, B or not; below it 152 or 208, never 228). A walk-class jump stays capped at byte 24.
  const run=this.airRun&&Math.abs(byteOf(speed))>=RUN_CLASS_BYTE,maxByte=run?RUN_CAP:WALK_CAP;
  const base=run?RUN_ACCEL:this.airDrop?DROP_ACCEL:WALK_ACCEL;
  const add=base*(this.disagree?2:1);
  this.skid=false;this.turned=false;
  // Braking at the moment of landing goes on at the air class: 152 stays 152, the run and drop classes brake at 208.
  if(opposite)this.friction=base===WALK_ACCEL?FRICTION:FAST_FRICTION;
  this.runLanding=opposite&&base===RUN_ACCEL&&!this.airDrop;
  const next=opposite?speed+direction*add:this.accelerate(direction,run,maxByte,false,add);
  return this.speed=next;
 }
}
