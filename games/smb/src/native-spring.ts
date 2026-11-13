/** JumpspringAnimCtrl $070e, JumpspringTimer $0786 and force $06db.
 * TimerCore precedes PlayerBGCollision; activation writes3 after that tick.
 * JumpspringHandler moves Mario, draws, then advances an expired control. */
export type NativeSpring={control:number;timer:number;force:number;compression:number};
export const nativeSpring=():NativeSpring=>({control:1,timer:3,force:-7,compression:0});
export function advanceNativeSpring(n:NativeSpring,edgeA:boolean,tick=true){
 if(tick&&n.timer)n.timer--;
 const offset=n.control-1,dy=offset&2?-2:2;
 n.compression=[1,2,1,0][offset];
 if(offset>=1&&edgeA)n.force=-12;
 const launch=offset===3;
 if(launch)n.control=0;
 if(n.control&&n.timer===0){n.timer=4;n.control++;}
 return {dy,launch};
}
