/** RunStarFlagObj/PlayerEndLevel state, in native enemy-slot byte units. */
export type NativeStarFlag={task:number;y:number;state:number;interval:number};
export type NativeStarFlagInput={time:number;fireworks:number;music:number;endWalk:boolean;blocked:boolean};
/** NMI already decremented interval. PlayerEndLevel precedes this actor pass. */
export function runNativeStarFlag(s:NativeStarFlag,i:NativeStarFlagInput){
 const nextLevel=i.endWalk&&s.task===5;
 if(i.endWalk&&i.blocked&&s.task===0)s.task=1;
 let time=i.time,fireworks=i.fireworks,score=0,frenzy=0,draw=false;
 switch(s.task){
 case 1:{const digit=time%10;s.state=digit===1?5:digit===3?3:0;fireworks=[1,3,6].includes(digit)?digit:255;s.task++;break;}
 case 2:if(time===0)s.task++;else{time--;score=50;}break;
 case 3:draw=true;if(s.y>=0x72)s.y=(s.y-1)&255;else if(fireworks===0||fireworks&128){s.interval=6;s.task++;}else frenzy=22;break;
 case 4:draw=true;if(s.interval===0&&i.music===0)s.task++;break;
 }
 return {time,fireworks,score,frenzy,draw,nextLevel};
}
/** RunFireworks decrements the ordinary actor's byte counter, not an area clock. */
export function runNativeFirework(s:{timer:number;cell:number;active:boolean}){
 s.timer=(s.timer-1)&255;
 if(s.timer)return 0;
 s.timer=8;s.cell=(s.cell+1)&255;
 if(s.cell<3)return 0;
 s.active=false;return 500;
}
