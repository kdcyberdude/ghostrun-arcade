/** GameOverMode/SetupGameOver/ScreenRoutines/RunGameOver.
 * TimerControl $0747 can outlive PlayerLoseLife; ScreenTimer $07a0 only ticks
 * on an unheld $077f interval turn. No elapsed screen duration is fitted. */
export type NativeGameOver={mode:number;task:number;engine:number;screen:number;disable:number;timer:number;master:number;timeUp:boolean;columns:number};
export type GameOverInput={start:boolean;canContinue:boolean};
export function decodeNativeGameOver(r:Uint8Array):NativeGameOver{
 return {mode:r[0x770],task:r[0x772],engine:r[14],screen:r[0x73c],disable:r[0x774],timer:r[0x7a0],master:r[0x747],timeUp:Boolean(r[0x759]),columns:r[0x71e]};
}
/** NMI decrements the master gate before deciding whether other timers run. */
export function tickNativeGameOverMaster(n:NativeGameOver){if(n.master)n.master=(n.master-1)&255;return n.master!==0;}
export function runNativeGameOver(n:NativeGameOver,input:GameOverInput):{eventQueue?:number;leave?:'title'|'continue';clearSprites?:boolean}{
 if(n.task===0){n.screen=0;n.disable=(n.disable+1)&255;n.task=1;return {eventQueue:2};}
 if(n.task===1){
  if(n.screen<4){const clearSprites=n.screen===0;n.screen++;return {clearSprites};}
  if(n.screen===4){if(n.timeUp){n.timeUp=false;n.screen=5;n.disable=0;n.timer=7;}else n.screen=6;}
  else if(n.screen===5){if(n.timer===0){n.screen=6;n.timer=7;}}
  else if(n.screen===6){n.timer=0x12;n.task=2;}
  return {};
 }
 if(n.task===2){
  n.disable=0;if(!input.start&&n.timer)return {};
  n.task=0;if(input.canContinue){n.mode=1;n.engine=0;n.master=0;return {eventQueue:128,leave:'continue'};}
  n.mode=0;n.timer=0;return {eventQueue:128,leave:'title'};
 }
 return {};
}
export function stepNativeGameOver(n:NativeGameOver,input:GameOverInput&{intervalTick:boolean}){
 const held=tickNativeGameOverMaster(n);if(!held&&input.intervalTick&&n.timer)n.timer--;
 return runNativeGameOver(n,input);
}
