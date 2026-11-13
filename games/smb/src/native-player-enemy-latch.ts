/** PlayerEnemyCollision/HandlePECollisions: state1 is contactable. Only state
 * bit5 suppresses this dispatcher; d0 is a contact latch, cleared by a separated
 * eligible even-frame box test. Odd/offscreen/other-engine rows preserve it. */
import {nativeBoxesOverlap,nativeMiscOffscreen,type NativeBox} from './native-misc.js';
export function nativePlayerEnemyLatch(n:{bits:number},i:{frame:number;engine:number;playerY:number;state:number;offscreen:boolean;player:NativeBox;enemy:NativeBox|undefined;star:boolean}):'skip'|'separate'|'held'|'contact'|'star'{
 if(i.frame&1||i.engine!==8||i.playerY<0||i.playerY>=208||i.offscreen||i.state&32)return 'skip';
 // PlayerCollisionCore keeps X=player and Y=enemy; wrapped intervals make operand order significant.
 if(!i.enemy||!nativeBoxesOverlap(i.enemy,i.player)){n.bits&=254;return 'separate';}
 if(i.star)return 'star';
 if(n.bits&1)return 'held';n.bits|=1;return 'contact';
}

/** GetEnemyBoundBox: Goomba uses x+3..13/y+14..20; normal tall enemies use x+2..14/y+9..21. Raw anchor precedes EnemyMovementSubs. */
export function nativeNormalEnemyBox(x:number,y:number,camera:number,offset=0,small=false):NativeBox|undefined{
 const relative=x-camera;if(nativeMiscOffscreen(x,y,camera)&(relative>0?0x48:0x44))return;
 let left=(relative+(small?3:2))&255,right=(relative+(small?13:14))&255;
 if(((x-offset)&65535)>=((camera-offset+128)&65535)){if(right<128){if(left<128)left=255;right=255;}}
 else if(left>=160){if(right>=128)right=0;left=0;}
 return [left,(y+(small?14:9))&255,right,(y+(small?20:21))&255];
}

/** ChkForPlayerInjury/ChkInj after the box/latch accepts a normal enemy. */
export function nativeNormalContactStomps(id:number,playerY:number,enemyY:number,speed:number,stompTimer:number){
 return speed>0||stompTimer!==0||id>=7&&((playerY+12)&255)<(enemyY&255);
}
