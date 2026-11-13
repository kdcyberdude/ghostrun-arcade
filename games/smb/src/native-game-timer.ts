/** Native NMI GameTimerCtrlTimer, InitializeGame timer fetch, and RunGameTimer. */
export interface NativeGameTimer {time:number;control:number;fetch:boolean}
export function tickNativeGameTimer(n:NativeGameTimer){if(n.control)n.control--;}
export function initializeNativeGameTimer(n:NativeGameTimer,setting:number){
 if(!setting||!n.fetch)return false;n.time=[0,400,300,200][setting]+1;n.fetch=false;return true;
}
export function runNativeGameTimer(n:NativeGameTimer,mode:number,engine:number,yHigh:number){
 if(mode===0||engine<8||engine===11||yHigh>=2||n.control)return {tick:false,timeUp:false,hurry:false};
 if(n.time===0)return {tick:false,timeUp:true,hurry:false};
 const hurry=n.time===100;n.control=24;n.time--;return {tick:true,timeUp:false,hurry};
}
