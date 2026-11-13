/** Raw Goomba aliases at HandleEToBGCollision's temporary $23 metatile.
 * That path calls SetStun twice, through KillEnemyAboveBlock and again after
 * GiveOEPoints. Both DEC pairs affect only Enemy_Y_Position, never its page. */
export interface NativeGoombaBlockState {state:number;y:number;speed:number;force:number;fraction:number;xSpeed:number;direction:number}
export function nativeGoombaBlockStun(n:NativeGoombaBlockState,enemyX:number,marioX:number){
 n.state=(n.state&0x10)|0x22;n.y=(n.y-4)&255;n.speed=-3;
 n.direction=((enemyX-marioX)&0x8000)?2:1;n.xSpeed=n.direction===1?0x10:0xf0;
 // Two SetupFloateyNumber calls overwrite the same control1, not two awards.
 return 100;
}
