/** EnemyLanding/ProcEnemyDirection for ordinary falling walkers (state1).
 * A Koopa or Beetle faces Mario on landing; a Goomba keeps its direction.
 * The background pass snaps native sprite y to (y&$F0)|8 and clears only
 * speed/force, preserving the slot's fractional position. The facing test
 * compares whole pixels: level with Mario's pixel it turns left (smb-fast
 * d35255ce 2-1 row 10208: Koopa 2394.0, Mario 2394.94, slot 1 X speed 8 -> $F8). */
export type NativeWalkerLanding={x:number;y:number;vx:number;speed:number;force:number;fraction:number};
export function landNativeWalker(n:NativeWalkerLanding,goomba:boolean,marioX:number){
 if(!goomba)n.vx=(Math.floor(n.x)>=Math.floor(marioX)?-1:1)*Math.abs(n.vx);
 n.y=((Math.floor(n.y)-24)&~15|8)+24;n.speed=0;n.force=0;
}
