/** Native Lakitu (id 17) and its Spiny eggs (id 18), ported from the SMB engine routines (docs/NATIVE_ROLES.md, Lakitu section).
 * MoveLakitu / PlayerLakituDiff: each frame (after Mario's move and the scroll) the speed comes from the low byte of Lakitu x - Mario x (pre-step integer x),
 * LakituMoveDirection $A0+s (0 left, 1 right), LakituMoveSpeed $58+s, Player_X_Speed $57 and ScrollAmount $0775. Replayed on native RAM of the 4-1, 6-1 and
 * 8-2 v2 traces: 3255 of 3255 normal-play Lakitu rows give the native speed and direction bytes (tests/native-lakitu.test.ts).
 * LakituAndSpinyHandler / CreateSpiny: an egg is made in the first free slot when FrenzyEnemyTimer $078F reads 0 (it is then set to 128) while
 * EnemyFrenzyBuffer $06CB holds a Spiny (set by a Lakitu stepping in its normal state), Mario's y $CE >= 0x2C and Lakitu is in its normal state. */
export type LakituBytes={dir:number;speed:number}; // $A0+s, $58+s (signed byte as stored)
const DIFF_ADJ=[0x15,0x30,0x40]; // LakituDiffAdj
const s8=(v:number)=>((v&255)^128)-128;

/** One MoveLakitu step; returns the signed speed byte (1/16 px per frame). `fleeing`: Lakitu state is non-zero (EndFrenzy). */
export function lakituStep(n:LakituBytes,lakituX:number,marioX:number,marioSpeedByte:number,scrollAmount:number,fleeing:boolean){
 if(fleeing){n.dir=0;n.speed=0x10;}
 else{
  const diff=lakituX-marioX,toward=diff<0?1:0; // PlayerEnemyDiff: Y = 1 when Lakitu is left of Mario
  let a=(diff<0?-diff:diff)&255,early=false; // two's complement of the low byte only
  if(a>=0x3c){
   a=0x3c;
   if(toward!==n.dir){
    if(n.dir!==0){n.speed=(n.speed-1)&255;if(n.speed!==0)early=true;} // decelerate before turning back left
    if(!early)n.dir=toward;
   }
  }
  if(!early){
   a=(a&0x3c)>>2;let o=0;const v=marioSpeedByte&255;
   if(v&&scrollAmount){o=1;if(v>=0x19&&scrollAmount>=2)o=2;if(n.dir===0)o=0;} // ChkEmySpd: Enemy_Y_Speed is LakituMoveDirection
   n.speed=(DIFF_ADJ[o]-(a+1))&255;
  }
 }
 if(!(n.dir&1))n.speed=(-n.speed)&255;
 return s8(n.speed);
}
export const SPINY_EGG={timer:0x80,minMarioY:0x2c,aboveLakitu:8,speed:-3,down:0x20,max:3,walk:0.5}; // CreateSpiny / MoveD_EnemyVertically (state 5) / ProcEnemyDirection
