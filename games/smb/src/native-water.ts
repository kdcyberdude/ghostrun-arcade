/** Swimming motor recovered from read-only native water captures (tools/fidelity-lab/water-probe.mjs and
 * native-water-score.ts; evidence/water-motor-findings-20261109.md). All values are integers in the native units:
 * vertical speed byte S (signed), force F (1/256 of a speed step) and position fraction D (1/256 px); the player moves
 * S + carry whole pixels per pass. Roles of the measured bytes are inferred empirically from their behaviour, never from
 * game code or ROM data.
 *
 * Per frame, in this order (the numbers below are measured, not assumed):
 *  1. The swim timer counts down one per frame. A stroke is a fresh A press and is honoured while the timer is still
 *     running or the player is not rising (S >= 0). It sets S, F, D, the rising force VF and the falling force VD
 *     (class B inside a whirlpool zone), the timer to 32; above native y 20 the speed is 0.
 *  2. Without a stroke the gravity is VD unless the player is rising with A held (then VF); above native y 20 it is 24.
 *  3. One gravity pass: D += F; y += S + carry; F += gravity; S += carry; S capped at 4 (then F >= 128 clears F).
 *  4. Inside a whirlpool zone a second pass with gravity 16 and speed cap 1 runs (before or after the first pass depending
 *     on the capture phase) and every second frame x moves one pixel toward the zone centre.
 * Horizontal speed uses the ground motor (src/native-motor.ts) with cap byte 16 on the water floor and 24 while swimming;
 * swimming never decelerates without input. B has no effect. */
import {NativeMotor,type Direction} from './native-motor.js';

export const FLOOR_CAP=16,SWIM_CAP=24;
export const SURFACE_Y=20,SURFACE_GRAVITY=24,STROKE_TIMER=32,WHIRL_GRAVITY=16,FALL_CAP=4,WHIRL_CAP=1;
/** A: ordinary stroke (speed -2, half force); B: stroke inside a whirlpool zone (speed -1, no force). */
const STROKE={a:{speed:-2,force:128,rise:13,fall:10},b:{speed:-1,force:0,rise:4,fall:9}};
/** Native y (counted across screen pages, 0 at the top of the map) from which the controller no longer acts: no stroke, no horizontal step (2-2 pit branch probe: y 207 still strokes and steps, y 209 neither; the bracket allows 208 or 209, the map ends at 208). */
export const NO_INPUT_Y=208;
/** A swimmer below the map dies only when native y reaches screen page 6 (model row: y 255 page 5 alive, y 1 page 6 dying, 430 rows after leaving the screen). */
export const SWIM_DEATH_Y=1280;
/** Feet of a swimmer that is not rising, this many pixels inside a tile, block a sideways move; shallower they land on it (native rows: lands at depth 0..3, blocked from 5; depth 4 was not observed). */
export const SWIM_WALL_DEPTH=5;
export interface WhirlpoolZone{left:number;length:number}
/** The zone containing native x (left <= x <= left + length), if any. */
export const whirlpoolAt=(zones:readonly WhirlpoolZone[]|undefined,x:number)=>zones?.find(z=>x>=z.left&&x<=z.left+z.length);
/** Pixels the whirlpool pulls the player toward the zone centre on this frame (every second frame). Tested where the move lands, the centre
 * column itself pulls right (free-play PPU rows of 2-2/7-2, landing x = left + length/2: 314 of 314 pulls +1, one column further 0 of 327);
 * tested where it starts (slice-clocked route rows, `fromStart`) the boundary stays one column left (the route fits it: 2-2 82 vs 94 events). */
export const whirlpoolPull=(zone:WhirlpoolZone|undefined,x:number,frame:number,fromStart=false)=>!zone||frame%2?0:x<zone.left+zone.length/2+(fromStart?0:1)?1:-1;

export interface WaterStep{dy:number;stroke:boolean}
export class NativeWater{
 readonly motor=new NativeMotor();
 /** Vertical speed byte (signed). */
 speed=0;
 /** Vertical force, 0..255. */
 force=0;
 /** Position fraction, 0..255. */
 frac=0;
 rise=40;fall=40;timer=0;
 /** The whirlpool flag as seen by the previous frame (selects the stroke class). */
 whirl=false;
 /** Capture phase of the reference frames: when set, the second (whirlpool) pass is observed before the ordinary pass and
  * the pull falls on the other frame parity (measured: 2-2 and the 8-4 water room are captured that way, 7-2 is not). */
 whirlFirst=false;
 /** Capture phase of slice-clocked reference rows: the row boundary falls between the move and the pull, so the observed pull direction follows where the move starts. Real frames (PPU-clocked rows, the game) use where it lands. */
 pullFromStart=false;
 constructor(){this.motor.cap=SWIM_CAP;}
 /** Fresh level state at the water entry spawn (native y 0, nothing applied yet). */
 reset(){this.speed=0;this.force=0;this.frac=0;this.rise=40;this.fall=40;this.timer=0;this.whirl=false;this.moving=0;this.lastDirection=0;this.motor.reset();this.motor.cap=SWIM_CAP;}
 /** The state before this frame's trailing whirlpool pass, which contact with a floor or ceiling must precede. */
 private beforeWhirl?:{speed:number;force:number;frac:number;moved:number};
 /** Pixels this frame's trailing whirlpool pass moved. */
 get whirlMoved(){return this.beforeWhirl?.moved??0;}
 /** A landing or any support under the feet clears the vertical speed and force; the fraction is kept. */
 land(){this.contact(()=>{this.speed=0;this.force=0;});}
 /** A head bump turns the player around at speed 1 (the force is kept). Returns how many more pixels the whirlpool pass moves after it. */
 bump(){return this.contact(()=>{this.speed=1;});}
 /** Contact happens between the ordinary pass and a trailing whirlpool pass: undo that pass, apply the contact, redo the pass. */
 private contact(apply:()=>void){
  const before=this.beforeWhirl;this.beforeWhirl=undefined;
  if(!before){apply();return 0;}
  this.speed=before.speed;this.force=before.force;this.frac=before.frac;apply();return this.pass(WHIRL_GRAVITY,WHIRL_CAP)-before.moved;
 }
 /** One gravity pass; returns the whole pixels moved. */
 private pass(gravity:number,cap:number):number{
  const sum=this.frac+this.force;this.frac=sum&255;
  const moved=this.speed+(sum>>8);
  const force=this.force+gravity;this.force=force&255;this.speed+=force>>8;
  if(this.speed>=cap&&this.force>=128){this.speed=cap;this.force=0;}
  return moved;
 }
 /** Whether an A press this frame starts a stroke (the timer is decremented first, as in `vertical`). Pure. */
 canStroke(a:boolean,aPrev:boolean,grounded:boolean):boolean{return a&&!aPrev&&(this.timer>1||this.speed>=0||grounded);}
 /** Advance the vertical state one frame. `y` is the native y (feet minus 32) before the move; `grounded` is whether
  * the player stands on something; `inZone` whether the whirlpool zone contains the player at the start of the frame. */
 vertical(a:boolean,aPrev:boolean,y:number,grounded:boolean,inZone:boolean):WaterStep{
  if(this.timer>0)this.timer--;
  this.beforeWhirl=undefined;
  const stroke=a&&!aPrev&&(this.timer>0||this.speed>=0||grounded);
  let dy=0;
  // The whirlpool pass that runs first sees the state from before the stroke.
  if(inZone&&this.whirlFirst)dy+=this.pass(WHIRL_GRAVITY,WHIRL_CAP);
  // Standing frames skip the ordinary pass (support found afterwards clears the state again, see land()).
  if(!grounded||stroke){
   if(stroke){
    const s=this.whirl?STROKE.b:STROKE.a;
    this.speed=y<SURFACE_Y?0:s.speed;this.force=s.force;this.frac=0;this.rise=s.rise;this.fall=s.fall;this.timer=STROKE_TIMER;
   }else if(this.speed>=0||!a)this.rise=this.fall;
   dy+=this.pass(y<SURFACE_Y?SURFACE_GRAVITY:this.rise,FALL_CAP);
  }
  if(inZone&&!this.whirlFirst){const before={speed:this.speed,force:this.force,frac:this.frac,moved:0};before.moved=this.pass(WHIRL_GRAVITY,WHIRL_CAP);this.beforeWhirl=before;dy+=before.moved;}
  this.whirl=inZone;
  return {dy,stroke};
 }
 /** A blocked step keeps only the fraction of the speed that step produced; a press along the motion (or none) also pauses
  * acceleration for that one frame, a brake against the wall does not. */
 wall(produced:number,pressedAlong=true):number{
  const m=this.motor;
  if(pressedAlong){m.friction=0;m.skid=false;m.turned=true;m.freeze=1;}
  return m.speed=((produced%256)+256)%256;
 }
 /** Last pressed direction; it persists at rest. A press along it takes the plain step from rest, any other press the doubled one. */
 moving:Direction=0;
 /** The direction pressed on the previous swimming frame (0 = none). */
 lastDirection:Direction=0;
 /** Horizontal speed (1/4096 px) after this frame's input: floor frames use the floor cap and coast (B brakes below byte 11);
  * swimming frames keep their speed when no direction is held. */
 horizontal(direction:Direction,grounded:boolean,down=false,b=false):number{
  const m=this.motor;m.cap=grounded?FLOOR_CAP:SWIM_CAP;
  const released=this.lastDirection!==0&&direction===0&&down;this.lastDirection=direction;
  if(grounded&&down)return direction===0&&m.speed>0&&m.speed<256?m.speed=0:m.groundDown(direction,true);
  // Holding B stops a coasting player below speed byte 11, in the water as on the ground. Down does the same only on the frame the direction is released
  // (2-2/7-2 free-play rows: 32 of 35 release frames with Down below byte 11 stop; 0 of 6 later Down frames with no direction do).
  if(!direction){m.tickFreeze();return grounded?m.groundCoast(b):(b||released)&&m.speed!==0&&Math.abs(m.speed)<2816?m.speed=0:m.speed;}
  const along=direction===this.moving,first=this.moving===0;this.moving=direction;
  // From exact rest the first step ever is doubled, later ones plain whatever the last direction was; a press against a
  // sub-byte positive speed takes the doubled step.
  if(m.speed===0){if(m.freeze>0){m.tickFreeze();return 0;}m.friction=0;m.skid=false;m.turned=false;return m.speed=direction*(first?304:152);}
  // A wall restart drops a stationary residue on reversal; it survives neutral frames (native7-2 wall branches).
  if(!along&&m.speed>0&&m.speed<256&&direction<0){
   if(m.turned){m.tickFreeze();m.speed=0;return m.groundPress(direction,false);}
   return m.speed-=304;
  }
  return m.groundPress(direction as 1|-1,false);
 }
}
