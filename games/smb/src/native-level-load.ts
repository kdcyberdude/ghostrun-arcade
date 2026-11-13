/** InitializeArea, ScreenRoutines, SecondaryGameSetup and InitializeGame after PlayerEndWorld.
 * InitializeMemory spans two sampled PPU rows: screen/camera bytes clear before the page0 player/engine bytes. */
export interface NativeLevelLoad {task:number;engine:number;screen:number;disable:number;timer:number;columns:number;timeUp?:boolean;skipIntermediate?:boolean}
export function nativeLevelLoad():NativeLevelLoad{return {task:0,engine:8,screen:12,disable:0,timer:0,columns:11};}
export function stepNativeLevelLoad(n:NativeLevelLoad,intervalTick:boolean){
 let camera=false,clear=false,preload=false,ready=false;
 if(intervalTick&&n.timer)n.timer--;
 if(n.task===0){
  if(n.screen!==0){n.screen=0;n.columns=0;camera=true;}
  else{n.task=1;n.engine=0;n.disable=1;n.columns=11;n.timer=0;clear=true;}
 }else if(n.task===1){
  if(n.screen<4)n.screen++;
  else if(n.screen===4){if(n.timeUp){n.timeUp=false;n.screen=5;n.disable=0;n.timer=7;}else n.screen=6;}
  else if(n.screen===5||n.screen===7){if(n.timer===0){n.screen++;n.timer=7;}}
  else if(n.screen===6){if(n.skipIntermediate)n.screen=8;else{n.screen=7;n.disable=0;n.timer=7;}}
  else if(n.screen===8){n.disable++;n.columns=(n.columns-1)&255;if(n.columns&128)n.screen=9;}
  else if(n.screen<12)n.screen++;
  else n.task=2;
 }else if(n.task===2){n.task=3;n.disable=0;}
 else if(n.engine===0){n.engine=7;preload=true;}
 else if(n.engine===7){n.engine=8;ready=true;}
 return {camera,clear,preload,ready};
}
