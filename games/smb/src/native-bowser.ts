import {nativeImposeGravity,type NativeMoveState} from './simulation.js';
/** InitBowser/BowserControl, using native enemy slot bytes and the global timers/counter.
 * PRandomRange and FlameTimerData are ROM tables, not per-level recordings. */
const RANGE=[33,65,17,49],FIRE=[191,64,191,191,191,64,64,191];
export interface NativeBowser {rearSlot?:number;
 x:number;y:number;origin:number;direction:number;speed:number;range:number;controls:number;feet:number;
 timer:number;fireTimer:number;fireCounter:number;move:NativeMoveState;
}
export function nativeBowserState(x:number,y:number,fraction=0):NativeBowser{
 return {x,y,origin:x&255,direction:223,speed:2,range:0,controls:0,feet:32,timer:32,fireTimer:223,fireCounter:0,move:{y,speed:0,force:0,fraction,timer:0}};
}
export function stepNativeBowser(m:NativeBowser,input:{frame:number;byte:number;playerX:number;world:number;hard:boolean;frozen?:boolean;tickTimers?:boolean}){
 const {frame,byte,playerX,world,hard,frozen}=input;
 if(!frozen&&input.tickTimers!==false){if(m.timer>0)m.timer--;if(m.fireTimer>0)m.fireTimer--;}
 let flame=false,hammer=false;
 if(!frozen){
  if(!(m.controls&128)){
   if(--m.feet===0){m.feet=32;m.controls^=1;}
   if((frame&15)===0)m.direction=2;
   let move=true;
   if(m.timer>0&&playerX>m.x){m.direction=1;m.speed=2;m.timer=32;m.fireTimer=32;if((m.x&255)>=200)move=false;}
   if(move&&(frame&3)===0){
    if((m.x&255)===m.origin)m.range=RANGE[byte&3];
    m.x=(m.x&~255)|((m.x+m.speed)&255);
    if(m.direction!==1){const diff=(((m.x&255)-m.origin)<<24)>>24;if(Math.abs(diff)>=m.range)m.speed=diff<0?1:-1;}
   }
  }
  if(m.timer===0){
   m.move.y=m.y;nativeImposeGravity(m.move,15,2);m.y=m.move.y;
   hammer=world>=6&&(frame&3)===0;
   if(m.y>=128)m.timer=RANGE[byte&3];
  }else if(m.timer===1){m.y--;m.move.y=m.y;m.move.speed=-2;m.move.force=0;}
 }
 if(world<6||world===8){
  if(m.fireTimer===0){
   m.fireTimer=32;m.controls^=128;
   if(!(m.controls&128)){m.fireTimer=FIRE[m.fireCounter]-(hard?16:0);m.fireCounter=(m.fireCounter+1)&7;flame=true;}
  }
 }
 return {flame,hammer};
}

/** BowserGfxHandler runs PlayerEnemyCollision once for each 16px half, bounding-box control10. */
export function nativeBowserHit(m:NativeBowser,p:{x:number;y:number;size:number;duck:boolean},counter:number){
 const y=Math.floor(p.y)-32;if(counter&1||y<0||y>=208)return false;
 const x=Math.floor(p.x),small=p.size===0,left=x+(small?3:2),right=x+(small?13:14),top=y+(small||p.duck?20:8),bottom=y+32;
 return [[m.x,m.y],[m.x+(m.direction&1?-16:16),m.y+8]].some(([bx,by])=>left<=bx+16&&bx<=right&&top<=by+21&&by+2<=bottom);
}
