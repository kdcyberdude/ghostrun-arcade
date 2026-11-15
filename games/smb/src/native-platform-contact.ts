/** Native player-to-platform landing (SMB disassembly RunLargePlatform / RunSmallPlatform, LargePlatformCollision, SmallPlatformCollision,
 * ProcLPlatCollisions, PositionPlayerOnVPlat; tests/native-platform-contact.test.ts checks it on the v2 traces).
 * Order inside a frame: Mario has already moved (PlayerCtrlRoutine). Each platform object then tests the player box against its own box
 * BEFORE it moves this frame, moves, and puts a rider on its new top (Player_Y_Position = top - 32, speed and move force 0, the y sub-pixel
 * $416 untouched), carrying him by its whole-pixel x step. A landing needs:
 *  - Player_Y_Speed >= 0 (ChkForTopCollision),
 *  - feet (Player_Y_Position + 32) 0..5 px below the box top (BoundingBox_DR_YPos - platform UL_YPos < 6, unsigned),
 *  - Player_Y_Position < $D0 on screen page 1 (CheckPlayerVertical),
 *  - inclusive horizontal overlap of the native player and platform boxes.
 * Small platforms (castle/sky elevators, ids 43/44: the 'wrap' kind) have a second box 128 px below the first (mod 256); a box whose top is
 * above y 32 is skipped. The rider is put on the box he landed on (PlayerPosSPlatData: +128 or +0).
 * `feet` is the integer feet row (remake p.y floor), `prior` the platform's collision position before this frame's move.
 * Returns the box offset (0 or 128) or undefined for no landing. */
import {platformSupportsX,type PlatformPosition} from './platform-motion.js';

/** SPBBox and DrawLargePlatform read the castle/SecondaryHardMode flags. */
export const nativeLargePlatformWidth=(id:number|undefined,castle:boolean,hard:boolean,fallback:number)=>id!==undefined&&id>=36&&id<=42?(castle||hard?32:48):fallback;

export function nativePlatformLanding(feet:number,vy:number,x:number,prior:PlatformPosition,width:number,small:boolean,wide=false):number|undefined{
 if(vy<0)return undefined;
 const y=feet-32;if(y<0||y>=0xd0)return undefined;
 if(!platformSupportsX(x,prior.x,width,wide))return undefined;
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
 * (the move force stays). In feet terms: feet - top 34..37 big, 22..25 small (mod 256). */
export function nativePlatformHeadBump(feet:number,big:boolean,x:number,prior:PlatformPosition,width:number,wide=big,bottom=13):boolean{
 if(!platformSupportsX(x,prior.x,width,wide))return false;
 const d=(Math.floor(prior.y)+bottom-(feet-32+(big?8:20)))&255; // 8-bit box bytes: above the screen top (Player_Y_HighPos 0) Mario still bumps (981b9c61 2-4 row 19613: Mario y 229, lift 244 + 6 - (229 + 20) = 1, speed -> 1)
 return d<4;
}

/** Native PlayerBGCollision runs only while Player_Y_HighPos is 1 and Player_Y_Position ($CE) < $CF: a Mario lower on the screen (or above it)
 * has no head, foot or side contact with the background at all (4-2 v2 rows 632-636: native passes a wall at y 215 falling into a pit). `feet` is the remake p.y. */
export function nativeBackgroundSkipped(feet:number):boolean{const y=Math.floor(feet)-32;return y<0||y>=0xcf;}

/** ProcLPlatCollisions / PlatformSideCollisions after top/underside handling:
 * inclusive native boxes, then a left penetration below8 or right penetration
 * below9 (the latter SBC follows CLC, hence the extra pixel). */
export function nativePlatformSide(feet:number,vy:number,big:boolean,x:number,prior:PlatformPosition,width:number,wide=big,bottom=13):1|-1|0{
 const y=feet-32;if(y<0||y>=0xd0)return 0;
 const left=Math.floor(x)+(wide?2:3),right=Math.floor(x)+(wide?14:13),top=feet-32+(big?8:20);
 const pl=Math.floor(prior.x),pr=pl+width,pt=Math.floor(prior.y);
 if(right<pl||left>pr||feet<pt||top>pt+bottom)return 0;
 if(vy>=0&&feet-pt>=0&&feet-pt<6)return 0;
 if(right-pl<8)return 1;
 if(pr-left-1>=0&&pr-left-1<9)return -1;
 return 0;
}
