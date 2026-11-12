/** PlayerEnemyCollision and BoundBoxCtrlData control 8: a Bowser flame's contact box is x+6..10,y+4..8,
 * independent of its 24x8 artwork. Checks run on even FrameCounter rows after CheckPlayerVertical.
 * Native 2-4 v2 rows 668..670: no contact, odd-row skip, then death. */
export function nativeFlameHit(flame:{x:number;y:number},player:{x:number;y:number;size:number;duck:boolean},counter:number){
 const y=Math.floor(player.y)-32;
 if(counter&1||y<0||y>=0xd0)return false;
 const x=Math.floor(player.x),fx=Math.floor(flame.x),fy=Math.floor(flame.y),small=player.size===0;
 return x+(small?3:2)<=fx+10&&fx+6<=x+(small?13:14)&&y+(small||player.duck?20:8)<=fy+8&&fy+4<=y+32;
}
