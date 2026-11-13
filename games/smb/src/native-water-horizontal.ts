/** Native water X_Physics / GetPlayerAnimSpeed / ImposeFriction, before
 * ScrollHandler and PlayerBGCollision can clear the horizontal speed byte.
 * Direction and collision fields use the original RAM bit values. */
export interface WaterHorizontalState {
 speed:number;facing:number;moving:number;absolute:number;collision:number;running:number;grounded:boolean;
}
/** Buttons use the harness NES pad encoding (A=1, B=2, Up=16, Down=32, Left=64, Right=128).
 * PlayerCtrlRoutine has already disabled input outside the playable vertical page.
 * `stroke` is PlayerPhysicsSub's accepted fresh-A decision, before X_Physics. */
export function nativeWaterHorizontal(s:WaterHorizontalState,buttons:number,stroke=false){
 const rawLR=(buttons&128?1:0)|(buttons&64?2:0),lr=s.grounded&&(buttons&32)&&rawLR?0:rawLR;
 const grounded=s.grounded&&!stroke,run=!grounded&&s.absolute>=25,cap=run?40:grounded?16:24;
 const friction=(run?228:s.running||s.absolute>=33?208:152)*(s.facing!==s.moving?2:1);
 let {speed,facing,moving,absolute,running}=s;
 if(absolute>=28)running=absolute;
 else if(buttons&254){
  if(rawLR===moving)running=0;
  else if(absolute<11){moving=facing;speed=0;}
 }
 if(lr)facing=lr;
 if(grounded||lr){
  const masked=lr&s.collision,byte=Math.floor(speed/256);
  if(masked||byte){
   const direction=masked?(masked&1?1:-1):byte>0?-1:1;
   speed+=direction*friction;
   const fraction=speed&255,nextByte=Math.floor(speed/256);
   speed=(direction>0?Math.min(cap,nextByte):Math.max(-cap,nextByte))*256+fraction;
  }
  absolute=Math.abs(Math.floor(speed/256));
 }
 const byte=Math.floor(speed/256);if(byte)moving=byte>0?1:2;
 return {speed,facing,moving,absolute,running,friction};
}
