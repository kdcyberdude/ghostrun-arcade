import {nativeBoxesOverlap,nativeMiscOffscreen,type NativeBox} from './native-misc';
/** Native ProcHammerBro / HammerBroBGColl. State is the enemy slot's RAM bytes, not a recorded jump/throw schedule.
 * Source: https://github.com/MrWint/smb-dis/blob/master/smbdis.asm */
export interface HammerBroState {collision?:boolean;state:number;jumpTimer:number;throwTimer:number;frameTimer:number;interval:number;speed:number;force:number;fraction:number;y:number}
export interface HammerBroInputs {x:number;marioX:number;frame:number;random1:number;random2:number;hard:boolean;supported:boolean;sideBlocked:boolean;onScreen:boolean;spawnHammer:()=>boolean;tickTimer?:boolean;afterBackground?:()=>boolean}
export function hammerBroStep(n:HammerBroState,i:HammerBroInputs){
 let steps=1;
 const gravity=()=>{const fraction=n.fraction+n.force;n.fraction=fraction&255;n.y+=n.speed+(fraction>>8);const force=n.force+0x3d;n.force=force&255;n.speed+=force>>8;if(n.speed>=3&&n.force>=0x80){n.speed=3;n.force=0;}};
 if(i.tickTimer!==false&&n.frameTimer>0)n.frameTimer--;
 // EnemyToBGCollisionDet returns outside this vertical range (SubtEnemyYPos).
 if(!(n.state&0x20)&&(((n.y&255)+0x3e)&255)>=0x44){
  if(i.supported&&n.frameTimer===0){n.state&=0x88;n.speed=0;n.force=0;n.y=(n.y&~15)|8;
   if(i.sideBlocked){n.speed=-6;n.state|=1;n.frameTimer=0x20;n.jumpTimer=i.random1|0xc0;gravity();steps++;}
  }
  else n.state|=1;
 }
 // RunNormalEnemies performs player contact after background collision and before ProcHammerBro.
 if(i.afterBackground?.())return {speed:0,steps:0};
 if(n.state&0x20){gravity();return {speed:0,steps:1};} // defeated horizontal speed is retained by MoveDefeatedEnemy, not Shimmy
 if(n.jumpTimer){
  n.jumpTimer--;
  if(i.onScreen){
   if(n.throwTimer===0){
    n.throwTimer=i.hard?0x1c:0x30;
    if(i.spawnHammer())n.state|=8;else n.throwTimer--;
   }else n.throwTimer--;
  }
 }else if((n.state&7)!==1){
  const y=n.y&255,weak=y<0x80&&(y<0x70||(i.random1&1)!==0),long=y<0x70;
  n.speed=weak?-3:-6;n.state|=1;n.frameTimer=i.hard&&long&&(i.random2&1)?0x37:0x20;n.jumpTimer=i.random1|0xc0;
 }
 const dx=i.x-i.marioX;
 const speed=dx>=0&&n.interval===0?-8:i.frame&0x40?-4:4;
 if((n.state&7)!==0)gravity();
 return {speed,steps};
}

/** PlayerEnemyCollision/ChkForPlayerInjury for ID5: its rising/still branch cannot use the ID>=7 above-enemy stomp. */
export function nativeHammerBroContact(n:{collision:boolean},i:{frame:number;blocked:boolean;player:NativeBox;enemy:NativeBox|undefined;star:boolean;injury:boolean;playerSpeed:number;stompTimer:number}):'none'|'hurt'|'stomp'|'star'{
 if(i.frame&1||i.blocked)return 'none';
 if(!i.enemy||!nativeBoxesOverlap(i.player,i.enemy)){n.collision=false;return 'none';}
 if(i.star)return 'star';
 if(n.collision)return 'none';n.collision=true;
 if(i.playerSpeed>0||i.stompTimer)return 'stomp';
 return i.injury?'none':'hurt';
}

/** InitHammerBro selects BoundBoxCtrlData11 ($04,$04,$0c,$1c). */
export function nativeHammerBroBox(x:number,y:number,camera:number):NativeBox|undefined{
 const relative=x-camera,mask=relative>0?0x44:0x48;
 if(nativeMiscOffscreen(x,y,camera)&mask)return undefined;
 let left=(relative+4)&255,right=(relative+12)&255;
 if(x>=camera+128){if(right<128){if(left<128)left=255;right=255;}}
 else if(left>=160){if(right>=128)right=0;left=0;}
 return [left,(y+4)&255,right,(y+28)&255];
}
