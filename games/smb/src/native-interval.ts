/** NMI DecTimers: $0747 gates the shared $077F interval clock and $079F Star timer.
 * The decrement from control 1 to 0 runs timers on that same NMI. */
export function nativeIntervalStep(interval:number,star:number,control=0,paused=false){
 if(paused)return {interval,star,control,tick:false};
 if(control)control=(control-1)&255;
 if(control)return {interval,star,control,tick:false};
 interval=(interval-1)&255;
 const tick=Boolean(interval&128);
 if(tick){interval=20;if(star)star--;}
 return {interval,star,control,tick};
}
/** GameEngine checks after actor collisions and RunGameTimer, before the palette cycle. */
export function nativeStarMusic(star:number,interval:number,yHigh=1){return yHigh<2&&star===4&&interval===0;}
export const NATIVE_STAR_PICKUP=0x23;
