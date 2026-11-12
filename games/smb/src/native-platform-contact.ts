/** Native player-to-platform landing (SMB disassembly RunLargePlatform / RunSmallPlatform, LargePlatformCollision, SmallPlatformCollision,
 * ProcLPlatCollisions, PositionPlayerOnVPlat; tests/native-platform-contact.test.ts checks it on the v2 traces).
 * Order inside a frame: Mario has already moved (PlayerCtrlRoutine). Each platform object then tests the player box against its own box
 * BEFORE it moves this frame, moves, and puts a rider on its new top (Player_Y_Position = top - 32, speed and move force 0, the y sub-pixel
 * $416 untouched), carrying him by its whole-pixel x step. A landing needs:
 *  - Player_Y_Speed >= 0 (ChkForTopCollision),
 *  - feet (Player_Y_Position + 32) 0..5 px below the box top (BoundingBox_DR_YPos - platform UL_YPos < 6, unsigned),
 *  - Player_Y_Position < $D0 on screen page 1 (CheckPlayerVertical),
 *  - horizontal overlap (platformSupportsX, measured).
 * Small platforms (castle/sky elevators, ids 43/44: the 'wrap' kind) have a second box 128 px below the first (mod 256); a box whose top is
 * above y 32 is skipped. The rider is put on the box he landed on (PlayerPosSPlatData: +128 or +0).
 * `feet` is the integer feet row (remake p.y floor), `prior` the platform's collision position before this frame's move.
 * Returns the box offset (0 or 128) or undefined for no landing. */
import {platformSupportsX,type PlatformPosition} from './platform-motion.js';

export function nativePlatformLanding(feet:number,vy:number,x:number,prior:PlatformPosition,width:number,small:boolean):number|undefined{
 if(vy<0)return undefined;
 const y=feet-32;if(y<0||y>=0xd0)return undefined;
 if(!platformSupportsX(x,prior.x,width))return undefined;
 for(const offset of small?[0,128]:[0]){
  const top=small?(Math.floor(prior.y)+offset)&255:Math.floor(prior.y);
  if(small&&top<32)continue;
  const d=feet-top;
  if(d>=0&&d<6)return offset;
 }
 return undefined;
}

/** Native head bump on a platform's underside (ProcLPlatCollisions): with the boxes overlapping and Player_Y_Speed < 0 after this frame's gravity,
 * platform bottom (top + 13, BoundBoxCtrlData rows 5/6) minus player box top (y + 8 big, y + 20 small or crouching) 0..3 sets the speed to 1
 * (the move force stays). In feet terms: feet - top 34..37 big, 22..25 small. */
export function nativePlatformHeadBump(feet:number,big:boolean,x:number,prior:PlatformPosition,width:number):boolean{
 if(!platformSupportsX(x,prior.x,width))return false;
 const d=Math.floor(prior.y)+13-(feet-32+(big?8:20));
 return d>=0&&d<4;
}

/** Native PlayerBGCollision runs only while Player_Y_HighPos is 1 and Player_Y_Position ($CE) < $CF: a Mario lower on the screen (or above it)
 * has no head, foot or side contact with the background at all (4-2 v2 rows 632-636: native passes a wall at y 215 falling into a pit). `feet` is the remake p.y. */
export function nativeBackgroundSkipped(feet:number):boolean{const y=Math.floor(feet)-32;return y<0||y>=0xcf;}
