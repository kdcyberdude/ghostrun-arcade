/** Mario's animation frame as the native game keeps it: PlayerAnimCtrl $070D (frame 0..2), PlayerAnimTimer $0781 (a frame timer, counted
 * down in the NMI before the frame's logic) and PlayerAnimTimerSet $070C (its reload, written by GetPlayerAnimSpeed on ground frames).
 * An area load clears all three (InitializeMemory). ProcessPlayerAction, run once per frame after the movement, either keeps the frame
 * (falling), clears it (standing, skidding, jumping, crouching, still on a vine) or animates it: the cell shown is the frame before the
 * advance, which happens when the timer has run out (timer = reload, frame + 1, wrapping at 3, or 2 on a vine).
 * Checked frame by frame against PlayerGfxOffset $06D5 in the native traces (tools/harness/native-pose.ts, tests/native-pose.test.ts). */
export const ANIM_TIMER_SET=[2,4,7] as const;
export class PlayerAnim{
 ctrl=0;timer=0;timerSet=0;
 /** Set by an area load, which also clears Player_State: the first frame of play then runs OnGroundStateSub (GetPlayerAnimSpeed), even
  * when Mario is already falling into the area (1-2/2-2/4-2/7-2 pipe intros: $070C 0 -> 7 on the row after the load). */
 fresh=true;
 reset(ctrl=0,timer=0,timerSet=0,fresh=true){this.ctrl=ctrl;this.timer=timer;this.timerSet=timerSet;this.fresh=fresh;}
 /** NMI frame timer. */
 tick(){if(this.timer>0)this.timer--;}
 /** GetPlayerAnimSpeed: the reload from Player_XSpeedAbsolute $0700 before this frame's friction (run 0x1c+, walk 0x0e+, slow). */
 setSpeed(absolute:number){this.timerSet=ANIM_TIMER_SET[absolute>=0x1c?0:absolute>=0x0e?1:2];}
 /** PlayerPhysicsSub climbing: #8, halved for stationary/downward speed, retained for upward speed. */
 setClimb(speed:number){this.timerSet=speed<0?8:4;}
 /** NonAnimatedActs. */
 still(){this.ctrl=0;return 0;}
 /** GetCurrentAnimOffset without the advance. */
 hold(){return this.ctrl;}
 /** AnimationControl: returns the frame shown on this row. */
 animate(extent:number){
  const shown=this.ctrl;
  if(this.timer===0){this.timer=this.timerSet;this.ctrl=this.ctrl+1<extent?this.ctrl+1:0;}
  return shown;
 }
}
