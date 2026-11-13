import {nativeLakituBox} from './lakitu-contact.js';
import {nativeBoxesOverlap,type NativeBox} from './native-misc.js';

/** GrowThePowerUp precedes the TimerControl gate in PowerUpObjHandler.
 * Y is the native enemy byte, rather than the item's picture Y (+8). */
export function nativePowerupEmergence(state:number,y:number,frame:number){
 if((frame&3)===0){y=(y-1)&255;state=state>=17?128:state+1;}
 return {state,y,emerging:state<128?(18-state)*4-(frame&3):0};
}

/** SetupPowerUp selects BoundBoxCtrlData3, shared with normal Lakitu.
 * PlayerEnemyCollision is even-frame only and CheckPlayerVertical rejects
 * native player Y outside the screen or at/below $D0. */
export function nativePowerupContact(x:number,y:number,camera:number,frame:number,playerY:number,player:NativeBox){
 if(frame&1||playerY<0||playerY>=208)return false;
 const box=nativeLakituBox(x,y,3,camera);return Boolean(box&&nativeBoxesOverlap(player,box));
}
