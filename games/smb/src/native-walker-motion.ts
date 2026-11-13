/** EnemyLanding/ProcEnemyDirection for ordinary falling walkers (state1).
 * A Koopa or Beetle faces Mario on landing; a Goomba keeps its direction.
 * The background pass snaps native sprite y to (y&$F0)|8 and clears only
 * speed/force, preserving the slot's fractional position. */
export type NativeWalkerLanding={x:number;y:number;vx:number;speed:number;force:number;fraction:number};
export function landNativeWalker(n:NativeWalkerLanding,goomba:boolean,marioX:number){
 if(!goomba)n.vx=(n.x>=marioX?-1:1)*Math.abs(n.vx);
 n.y=((Math.floor(n.y)-24)&~15|8)+24;n.speed=0;n.force=0;
}
