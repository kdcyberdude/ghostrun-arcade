import {NativeRandom} from './native-random.js';
export type NativeStartupPalette={address:number;bytes:number[]};
/** Source state after the cold CPU initializer; no sampled future state enters step(). */
export type NativeTitleControls={mode:number;task:number;engine:number;screen:number;disable:number;columns:number;timer:number;demo:number;selectTimer:number;counter:number;interval:number;random:number[];players:number;joypadMasks:number[];fetchGameTimer:boolean;gameTimerSetting:number;time:number;colorRotate:number;ctrl:number;mask:number;initializing:boolean;queuedPalette:NativeStartupPalette[];pendingVertical?:boolean;unsupported?:string;reinit?:number};
export function nativeTitleControlsFromRam(r:Uint8Array):NativeTitleControls{
 return {mode:r[0x770],task:r[0x772],engine:r[14],screen:r[0x73c],disable:r[0x774],columns:r[0x71e],timer:r[0x7a0],demo:r[0x7a2],selectTimer:r[0x780],counter:r[9],interval:r[0x77f],random:Array.from(r.subarray(0x7a7,0x7ae)),players:r[0x77a],joypadMasks:[r[0x74a],r[0x74b]],fetchGameTimer:Boolean(r[0x757]),gameTimerSetting:r[0x715],time:r[0x7f8]*100+r[0x7f9]*10+r[0x7fa],colorRotate:r[0x6d4],ctrl:r[0x778],mask:r[0x779],initializing:false,queuedPalette:[]};
}
/** ReadJoypads reverses the supplied A..Right bit order, then masks repeated Start/Select. */
export function nativeMenuJoypad(n:NativeTitleControls,pad:number,port=0){
 let raw=0;for(let bit=0;bit<8;bit++)raw|=((pad>>bit)&1)<<(7-bit);
 if(raw&0x30&n.joypadMasks[port])return raw&0xcf;n.joypadMasks[port]=raw;return raw;
}
/** One ordinary NMI / TitleScreenMode dispatch. Cold CPU overruns are owned separately. */
export function stepNativeTitleControls(n:NativeTitleControls,pad:number,pad2=0){
 if(n.mode!==0)throw Error('Title controller does not own another operation mode');
 n.queuedPalette=[];const effect={renderColumns:false,primary:false,initPlayer:false,enginePass:false,startGame:false,continueGame:false,resetTitle:false,unsupportedDemo:false};
 if(n.pendingVertical!==undefined)n.ctrl=n.pendingVertical?n.ctrl|4:n.ctrl&~4;n.pendingVertical=undefined;
 n.mask=n.disable===0?0x1e:0;
 const joy=nativeMenuJoypad(n,pad)|nativeMenuJoypad(n,pad2,1);
 if(n.selectTimer)n.selectTimer--;n.interval--;if(n.interval<0){n.interval=20;if(n.timer)n.timer--;if(n.demo)n.demo--;}
 const random=new NativeRandom();random.bytes=[...n.random];random.frame=n.counter;random.tick();n.random=random.bytes;n.counter=random.frame;
 const palette=(backdrop:number)=>{n.queuedPalette.push({address:0x3f10,bytes:[backdrop,0x16,0x27,0x18]});n.pendingVertical=false;};
 if(n.task===1){
  switch(n.screen){
  case 0:n.screen=1;break;
  case 1:palette(0x0f);n.screen=2;break;
  case 2:n.pendingVertical=false;n.screen=3;break;
  case 3:n.pendingVertical=false;n.screen=4;break;
  case 4:n.screen=6;break;
  case 6:n.screen=8;break;
  case 8:n.disable=(n.disable+1)&255;effect.renderColumns=true;n.columns=(n.columns-1)&255;if(n.columns&128)n.screen=9;break;
  case 9:n.queuedPalette.push({address:0x3f00,bytes:[0x0f]});n.pendingVertical=false;n.screen=10;break;
  case 10:palette(0x22);n.screen=11;break;
  case 11:n.screen=12;break;
  case 12:n.screen=13;break;
  case 13:n.pendingVertical=true;n.screen=14;break;
  case 14:n.pendingVertical=false;n.task=2;break;
  default:throw Error(`Unsupported title screen task${n.screen}`);
  }
 }else if(n.task===2){n.fetchGameTimer=true;n.disable=0;n.task=3;n.ctrl&=~1;effect.primary=true;}
 else if(n.task===3){
  if(joy===0x10||joy===0x90){
   if(n.demo===0){n.task=0;n.disable=(n.disable+1)&255;effect.resetTitle=true;}
   else{n.mode=1;n.task=0;n.demo=0;n.fetchGameTimer=true;effect.startGame=true;effect.continueGame=joy===0x90;} // A with Start keeps the world of the last game over (68b5ca9f RAM 7012: $075F = $07FD = 1)
   return effect;
  }
  if(joy===0x20){
   if(n.demo===0){n.task=0;n.disable=(n.disable+1)&255;effect.resetTitle=true;return effect;}
   n.demo=24;if(n.selectTimer===0){n.selectTimer=16;n.players^=1;n.pendingVertical=true;}
  }else if(n.demo===0){effect.unsupportedDemo=true;return effect;}
  effect.enginePass=true;
  if(n.engine===0){n.engine=7;palette(0x22);effect.initPlayer=true;if(n.fetchGameTimer&&n.gameTimerSetting){n.time=[0,4,3,2][n.gameTimerSetting]*100+1;n.fetchGameTimer=false;}}
  else if(n.engine===7)n.engine=8;
  if((n.counter&7)===0){n.queuedPalette.push({address:0x3f0c,bytes:[0x0f,[0x27,0x27,0x27,0x17,0x07,0x17][n.colorRotate],0x17,0x0f]});n.colorRotate=(n.colorRotate+1)%6;n.pendingVertical=false;}
 }else throw Error(`Title task${n.task} requires cold CPU initialization`);
 return effect;
}
/** InitializeGame after RunGameOver has returned to the title (OperMode 0, task 0 on the leave row), on the rows after it
 * (c5564067 RAM 2801-2803, 68b5ca9f RAM 6811-6813; all 8 game-over captures): the first row's NMI ticks the clocks and InitializeMemory is
 * caught part-way (engine 6, screen 0); its overrun holds the clocks on the next two rows: FrameCounter 0 and DemoTimer $18, then
 * InitializeArea's task 1 with DisableScreenFlag 1 and ColumnSets 11 ($071E). 1-1's timer setting ($0715) is 1 from that row. */
export function nativeTitleFromGameOver(clock:{counter:number;interval:number;random:number[];players:number;time:number},disable=0):NativeTitleControls{
 return {mode:0,task:0,engine:6,screen:0,disable,columns:0,timer:0,demo:0,selectTimer:0,counter:clock.counter,interval:clock.interval,random:[...clock.random],players:clock.players,joypadMasks:[0,0],fetchGameTimer:false,gameTimerSetting:0,time:clock.time,colorRotate:0,ctrl:16,mask:0x1e,initializing:true,queuedPalette:[],reinit:2};
}
export function stepNativeTitleReinit(n:NativeTitleControls){
 n.queuedPalette=[];
 if(n.reinit===2){n.engine=0;n.counter=0;n.demo=24;}
 else{n.task=1;n.disable=1;n.columns=11;n.gameTimerSetting=1;}
 n.reinit=n.reinit!-1||undefined;
}
/** DemoEngine as RAM shows it: DemoAction $0717 steps when DemoActionTimer $0718 has run out and loads the next duration, and
 * SavedJoypad1Bits $06FC holds that action's buttons (af0ba437 RAM 57649-58743 and 1bfc3ee2 RAM 69017-70111, alike; action 1 is
 * loaded on the row DemoTimer reaches 0). Rows, buttons (A $80, B $40, Select $20, Start $10, Up $08, Down $04, Left $02, Right $01).
 * Both demos end in Mario's death within action 21; past the last action DemoEngine reports the demo over. */
export const NATIVE_DEMO_ACTIONS:readonly (readonly [number,number])[]=[[155,0x01],[16,0x80],[24,0x02],[5,0x81],[44,0x41],[32,0x80],[36,0x01],[21,0x42],[90,0xc2],[16,0x02],[32,0x80],[40,0x41],[48,0xc1],[32,0x41],[16,0xc1],[128,0x01],[32,0xc1],[48,0x01],[48,0x02],[1,0x80],[255,0x00]];
export type NativeDemo={action:number;timer:number};
/** One DemoEngine call: the joypad byte, or undefined once the demo is over. */
export function stepNativeDemo(d:NativeDemo):number|undefined{
 if(d.timer===0){d.action++;if(d.action>NATIVE_DEMO_ACTIONS.length)return undefined;d.timer=NATIVE_DEMO_ACTIONS[d.action-1][0];}
 d.timer--;return NATIVE_DEMO_ACTIONS[d.action-1][1];
}
/** ReadJoypads' Start/Select mask without storing it (the menu decision of the next row). */
export function peekNativeMenuJoypad(n:NativeTitleControls,pad:number){
 let raw=0;for(let bit=0;bit<8;bit++)raw|=((pad>>bit)&1)<<(7-bit);
 return raw&0x30&n.joypadMasks[0]?raw&0xcf:raw;
}
