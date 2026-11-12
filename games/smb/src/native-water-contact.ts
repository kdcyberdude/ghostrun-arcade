/** Native BoundBoxCtrlData: small Mario [3,20,13,32], big [2,8,14,32],
 * Blooper/swimming Cheep control9 [3,14,13,20]. PlayerCollisionCore includes touching edges.
 * Coordinates are native pixels sampled before the trailing ProcessWhirlpools pass. */
export function nativeWaterEnemyHit(player:{x:number;y:number;big:boolean;duck?:boolean},enemy:{x:number;y:number}){
 const px=Math.floor(player.x),py=Math.floor(player.y),ex=Math.floor(enemy.x),ey=Math.floor(enemy.y);
 return px+(player.big?2:3)<=ex+13&&ex+3<=px+(player.big?14:13)&&py+(player.big&&!player.duck?8:20)<=ey+20&&ey+14<=py+32;
}
