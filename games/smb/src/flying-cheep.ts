/** Native leaping Cheep Cheep (object id 20) vertical motion, checked on every flying frame of the 32 v2 traces (tests/flying-cheep.test.ts).
 * State: native y (RAM $CF+s, page $B6+s above 256), speed byte $A0+s, move force $0434+s, fraction $0417+s. The launch is y 248, speed -5, force 0.
 * Each frame after the spawn row: ImposeGravity with 13/256 and cap 5; then, with q = the new force >> 4, the force grows by 16 (no carry into the speed)
 * when the low y byte is within 7 px of FLY_CHEEP_BUMP_Y[q] (signed byte distance). The 16 targets are the only ones consistent with all 6940 native
 * flying-fish frames (448 bumps); they are the bytes the native code reads there (PRandomSubtracter and the bytes after it). */
import {nativeImposeGravity,type NativeMoveState} from './simulation.js';

export const FLY_CHEEP_GRAVITY=13,FLY_CHEEP_MAX=5,FLY_CHEEP_BUMP=16;
export const FLY_CHEEP_BUMP_Y=[248,160,112,189,0,32,32,32,0,0,181,30,41,32,240,3];
/** Launch state at native y 248 (remake feet y 272). */
export const flyingCheepLaunch=():NativeMoveState=>({y:248,speed:-5,force:0,fraction:0,timer:0});
/** Whether a fish with this force (after gravity) and low y byte gets the 16/256 bump. */
export function flyingCheepBumps(force:number,y:number){
 let d=(y-FLY_CHEEP_BUMP_Y[force>>4])&255;if(d&128)d=256-d;return d<8;
}
export function moveFlyingCheep(n:NativeMoveState){
 nativeImposeGravity(n,FLY_CHEEP_GRAVITY,FLY_CHEEP_MAX);
 if(flyingCheepBumps(n.force,n.y&255))n.force=(n.force+FLY_CHEEP_BUMP)&255;
}
