/** Native enemy-to-enemy contact (EnemiesCollision), as read from the v2 RAM traces (black-box, by correlation):
 * - it runs only on frames whose FrameCounter $09 is odd, and never in a water area;
 * - each object's box is taken from its position before its own move, relative to the camera (RAM $04AC + 4 + 4*slot): Koopa-shaped ids 0-3, 14, 15
 *   x+2..x+14, y+9..y+21; Goomba and Spiny x+3..x+13, y+14..y+20 (y = native sprite top); clamped to the screen 0..255, and an object whose integer
 *   x - camera is below -7 or above 255 takes no part (EnemyOffscrBitsMasked $03D8 nonzero: 61,000+ trace rows, no exception);
 * - boxes touch with inclusive edges;
 * - slot j is compared with every lower slot i; a touching pair reacts once (the lower slot keeps a bit for the higher one in Enemy_CollisionBits $0491,
 *   set on contact and cleared on the first odd frame without it), and both turn: the higher slot before its own move this frame, the lower one after it
 *   (2-1 v2 rows 250-251: the Koopa in slot 2 touches the shell in slot 1 on even row 250, turns on odd row 251 and steps +0.5 that row). */
export type CollisionBody={slot:number,x:number,y:number,tall:boolean,turns:boolean,reacts:boolean};
export const ENEMY_BOX={tall:{left:2,top:9,right:14,bottom:21},small:{left:3,top:14,right:13,bottom:20}};

function box(b:CollisionBody,camera:number){
 const rx=b.x-camera;if(rx<-7||rx>255)return undefined;
 const o=b.tall?ENEMY_BOX.tall:ENEMY_BOX.small;
 return {l:Math.min(255,Math.max(0,rx+o.left)),r:Math.min(255,Math.max(0,rx+o.right)),t:b.y+o.top,b:b.y+o.bottom};
}

/** SprObjectCollisionCore uses inclusive, screen-clamped cached boxes. */
export function nativeEnemyBoxesTouch(a:CollisionBody,b:CollisionBody,camera:number){
 const aa=box(a,camera),bb=box(b,camera);return Boolean(aa&&bb&&aa.l<=bb.r&&bb.l<=aa.r&&aa.t<=bb.b&&bb.t<=aa.b);
}

/** One EnemiesCollision pass. bits[slot] is the native collision byte of each slot (updated in place); returns the slots turned before
 * their move (as the higher slot of a pair) and after it (as the lower slot), each listed once per turn. */
export function nativeEnemiesCollision(bodies:CollisionBody[],camera:number,frameCounter:number,water:boolean,bits:number[]){
 const before:number[]=[],after:number[]=[];
 if(frameCounter%2===0||water)return {before,after};
 const bySlot=new Map(bodies.map(b=>[b.slot,b]));
 for(let j=0;j<5;j++){
  const second=bySlot.get(j),bj=second&&box(second,camera);if(!second||!bj)continue;
  for(let i=j-1;i>=0;i--){
   const first=bySlot.get(i),bi=first&&box(first,camera);if(!first||!bi)continue;
   const mask=0x80>>j;
   if(!(bi.l<=bj.r&&bj.l<=bi.r&&bi.t<=bj.b&&bj.t<=bi.b)){bits[i]&=~mask;continue;}
   if(bits[i]&mask)continue;
   bits[i]|=mask;
   if(!first.reacts||!second.reacts)continue;
   if(second.turns)before.push(j);if(first.turns)after.push(i);
  }
 }
 return {before,after};
}

/** Stomped id 14 becomes id 0 before its normal move: reset vertical speed/force,
 * retain the slot's fraction and pre-step y, and take one half-pixel step away
 * from Mario. Equal integer x chooses right (8-4 v2 row 10277). */
export function nativeUnwingedStomp(x:number,y:number,fraction:number,marioX:number){
 return {x:x+(Math.floor(marioX)<=Math.floor(x)?0.5:-0.5),y,fraction,speed:0,force:0,vx:Math.floor(marioX)<=Math.floor(x)?0.5:-0.5};
}
