/** Horizontal player speed on land, kept as the native bytes and stepped in the native order:
 * X_Physics (class, caps and friction adder), GetPlayerAnimSpeed (RunningSpeed, the low-speed skid stop), the ground
 * facing update, ImposeFriction (one 16-bit add or subtract, clamp of the speed byte only), then Player_MovingDir.
 * Bytes: speed = Player_X_Speed $57 * 256 + Player_X_MoveForce $0705; absolute = Player_XSpeedAbsolute $0700 (only
 * ImposeFriction writes it, so it keeps the pre-contact value after a wall stop and is what the jump class reads);
 * facing $33, moving $45 (1 right, -1 left), runningTimer $0783, runningSpeed $0703; the blocked sides are the cleared
 * Player_CollisionBits $0490 of the previous frame's side contacts. Checked row by row against the native RAM traces
 * (tests/native-player-motor.test.ts). Water keeps its own motor (native-water.ts). */
export type Direction=-1|0|1;
/** MaxRightXSpdData (MaxLeftXSpdData is its negation); FrictionData. */
const MAX_SPEED=[0x28,0x18,0x10],FRICTION=[0xe4,0x98,0xd0];
const RUN_CLASS=0x19,RUN_SPEED_SET=0x1c,FAST_FRICTION_ABS=0x21,SKID_STOP_BELOW=0x0b,RUNNING_TIMER=0x0a;
const s8=(v:number)=>((v&255)^128)-128;

export type MotorFrame={
 /** Left/right held this frame (raw controller bits). */
 direction:Direction;
 /** Player_State was 0 (on the ground) when the frame started. */
 ground:boolean;
 /** A jump starts this frame (PlayerPhysicsSub sets Player_State to 1 before X_Physics). */
 jump:boolean;
 b:boolean;down:boolean;
 /** Any of B, Select, Start, Up, Down, Left, Right held (SavedJoypadBits & $7f). */
 buttons:boolean;
 /** Right speed cap override (GameEngineSubroutine 7, the pipe intro walk: $0c). */
 capRight?:number;
};

export class PlayerMotor{
 speed=0;absolute=0;facing:-1|1=1;
 /** 0 after a load until the first motion (native $45 = 0). */
 moving:-1|0|1=1;runningTimer=0;runningSpeed=0;
 blockedRight=false;blockedLeft=false;
 /** Defaults describe a steady state at `speed`: facing and moving along the speed byte (moving 0 at rest), absolute = |speed byte|. */
 reset(speed=0,facing:-1|1=speed<0?-1:1,moving:-1|0|1=Math.sign(s8(Math.floor(speed/256))) as -1|0|1,absolute=Math.abs(s8(Math.floor(speed/256)))){
  this.speed=speed;this.facing=facing;this.moving=moving;this.absolute=absolute;this.runningTimer=0;this.runningSpeed=0;this.blockedRight=this.blockedLeft=false;
 }
 /** Frame timers count down in the NMI, before the frame's game logic. */
 tickTimers(){if(this.runningTimer>0)this.runningTimer--;}
 step(f:MotorFrame):number{
  this.tickTimers();
  // SaveJoyp: Down on the ground drops a left/right press.
  const lr:Direction=f.down&&f.ground?0:f.direction;
  const ground=f.ground&&!f.jump;
  // X_Physics
  let y=0,fr=0;
  const walk=()=>{y=1;fr=this.runningSpeed!==0||this.absolute>=FAST_FRICTION_ABS?2:1;};
  if(!ground){if(this.absolute<RUN_CLASS)walk();}
  else if(lr===this.moving&&f.b)this.runningTimer=RUNNING_TIMER;
  else if(!(lr===this.moving&&this.runningTimer>0))walk();
  const maxRight=f.capRight??MAX_SPEED[y],maxLeft=-MAX_SPEED[y];
  const adder=FRICTION[fr]*(this.facing!==this.moving?2:1);
  if(ground){
   // GetPlayerAnimSpeed
   if(this.absolute>=RUN_SPEED_SET)this.runningSpeed=this.absolute;
   else if(f.buttons){
    if(f.direction===this.moving)this.runningSpeed=0;
    else if(this.absolute<SKID_STOP_BELOW){this.moving=this.facing;this.speed=0;}
   }
   if(lr!==0)this.facing=lr;
   this.imposeFriction(lr,adder,maxLeft,maxRight);
  }else if(lr!==0)this.imposeFriction(lr,adder,maxLeft,maxRight);
  const byte=s8(Math.floor(this.speed/256));if(byte!==0)this.moving=byte>0?1:-1;
  return this.speed;
 }
 /** ImposeFriction with the left/right bits masked by the collision bits. */
 private imposeFriction(lr:Direction,adder:number,maxLeft:number,maxRight:number){
  const a=lr>0&&this.blockedRight||lr<0&&this.blockedLeft?0:lr;
  let byte=s8(Math.floor(this.speed/256));
  if(a===0&&byte===0){this.absolute=0;return;}
  const add=a>0||a===0&&byte<0;
  const next=this.speed+(add?adder:-adder);
  byte=s8(Math.floor(next/256));const fraction=next&255;
  if(add){if(((byte-maxRight)&0x80)===0){this.speed=maxRight*256+fraction;this.absolute=maxRight&255;return;}}
  else if(((byte-maxLeft)&0x80)!==0)byte=maxLeft;
  this.speed=byte*256+fraction;this.absolute=Math.abs(byte);
 }
 /** ImpedePlayerMove: a side contact clears that side's collision bit and, when moving into it, zeroes the speed byte (the fraction stays). */
 contact(side:1|-1,intoWall:boolean){
  if(side>0)this.blockedRight=true;else this.blockedLeft=true;
  if(intoWall)this.speed&=255;
 }
 /** PlayerBGCollision restores every collision bit at the start of its checks. */
 clearContacts(){this.blockedRight=this.blockedLeft=false;}
}
