/** VerticalPipeEntry/ScrollHandler: engine3 moves raw Y by1, reuses $06ff,
 * consumes $03a1, then decrements ChangeAreaTimer ($06de). X speed and both
 * player position fractions are untouched. */
import {PlayerMotor} from './native-player-motor.js';
import {motionOf} from './native-motor.js';
export type NativePipeState={y:number;change:number;camera:number;xScroll:number;platformScroll:number};
export function nativeSavedScroll(n:Pick<NativePipeState,'camera'|'xScroll'|'platformScroll'>,screen:number,sideTimer:number,locked:boolean){
 n.xScroll=(n.xScroll+n.platformScroll)&255;n.platformScroll=0;
 let amount=0;
 if(!locked&&screen>=0x50&&sideTimer===0&&((n.xScroll-1)&255)<128)amount=screen>=0x70||n.xScroll<2?n.xScroll:n.xScroll-1;
 n.camera=(n.camera+amount)&65535;
 return amount;
}
export function nativeVerticalPipe(n:NativePipeState,screen:number,sideTimer:number,locked:boolean){
 n.y=(n.y+1)&255;
 const amount=nativeSavedScroll(n,screen,sideTimer,locked);
 n.change=(n.change-1)&255;
 return amount;
}

/** EnterSidePipe preserves $0705 while replacing $57 with8, or0 once the
 * integer X low nibble reaches0. AutoControlPlayer then runs the normal motor. */
export function nativeSidePipe(m:PlayerMotor,x:number,grounded:boolean,water:boolean,entrance:boolean){
 const moving=(Math.floor(x)&15)!==0,timer=m.runningTimer;
 m.speed=(moving?8*256:0)+(m.speed&255);
 // Water X_Physics always chooses the walk class and leaves RunningTimer
 // alone apart from its NMI tick; engine7 overrides the right cap with12.
 if(water)m.runningTimer=0;
 m.step({direction:moving?1:0,ground:grounded,jump:false,b:false,down:false,buttons:moving,capRight:entrance?12:water?(grounded?16:24):undefined});
 if(water)m.runningTimer=Math.max(0,timer-1);
 m.clearContacts();
 return x+motionOf(m.speed);
}
/** ChgAreaPipe/IntroEntr decrement after AutoControlPlayer. The engine7
 * side-tile check refreshes AreaChangeTimer while X is still unaligned. */
export function nativeSidePipeTimer(change:number,x:number,camera:number,entrance:boolean){
 if(entrance&&(Math.floor(x)&15)!==0)change=camera<256?0xa0:0x34;
 return Math.max(0,change-1);
}
