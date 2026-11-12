/** Source BoundBoxCtrlData, GetEnemyBoundBox and PlayerEnemyCollision for Lakitu. */
import {nativeBoxesOverlap,nativeMiscOffscreen,type NativeBox} from './native-misc';
export function nativeLakituBox(x:number,y:number,control:3|8,camera:number):NativeBox|undefined{
 const relative=x-camera,mask=relative>0?0x44:0x48;
 if(nativeMiscOffscreen(x,y,camera)&mask)return undefined;
 const [left,top,right,bottom]=control===8?[6,4,10,8]:[2,9,14,21];let l=(relative+left)&255,r=(relative+right)&255;
 if(x>=camera+128){if(r<128){if(l<128)l=255;r=255;}}
 else if(l>=160){if(r>=128)r=0;l=0;}
 return [l,(y+top)&255,r,(y+bottom)&255];
}
export function nativeLakituContact(n:{collision:boolean},i:{frame:number;blocked:boolean;player:NativeBox;enemy:NativeBox|undefined;star:boolean;injury:boolean;playerY:number;enemyY:number;playerSpeed:number;stompTimer:number}):'none'|'hurt'|'stomp'|'star'{
 if(i.frame&1||i.blocked)return 'none';
 if(!i.enemy||!nativeBoxesOverlap(i.player,i.enemy)){n.collision=false;return 'none';}
 if(i.star)return 'star';
 if(n.collision)return 'none';n.collision=true;
 if(i.playerSpeed>0||((i.playerY+12)&255)<i.enemyY||i.stompTimer)return 'stomp';
 return i.injury?'none':'hurt';
}
