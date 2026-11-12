import {nativeImposeGravity,type NativeMoveState} from './simulation.js';
/** VictoryModeSubroutines: source task bytes and timers, independent of world geometry.
 * The caller owns AutoControlPlayer and the bridge metatile/OAM writes. */
export interface NativeVictory {
 task:number;destination:number;walk:number;scrollFraction:number;primary:number;secondary:number;endTimer:number;
 feet:number;controls:number;bridge:number;bossState:number;boss:NativeMoveState;
}
export interface VictoryInput {
 world:number;camera:number;playerX:number;bossPresent:boolean;intervalTick:boolean;
 /** PlayerCtrlRoutine can touch the axe again while its metatile is being erased. */
 autoControl?:(walk:boolean)=>{playerX:number;axe:boolean};
}
export function stepNativeVictory(n:NativeVictory,i:VictoryInput){
 let camera=i.camera,remove=-1,kill=false,fall=false,message=-1,music=false,advance=false;
 if(i.intervalTick&&n.endTimer)n.endTimer--;
 switch(n.task){
 case 0:
  if(!i.bossPresent||n.bossState!==0&&(!(n.bossState&64)||n.boss.y>=224)){n.task++;kill=true;break;}
  if(n.bossState){nativeImposeGravity(n.boss,15,2);break;}
  n.feet=(n.feet-1)&255;
  if(n.feet===0){n.feet=4;n.controls^=1;remove=n.bridge++;
   if(n.bridge===15){n.boss.speed=0;n.boss.force=0;n.bossState=64;fall=true;}
  }
  break;
 case 1:n.destination=((Math.floor(camera)+255)>>8)+1;n.task++;music=true;break;
 case 2:{
  n.walk=0;const walk=(i.playerX>>8)!==n.destination||(i.playerX&255)<96;
  if(walk)n.walk++;
  const result=i.autoControl?.(walk);if(result?.axe)n.task=0;
  if((camera>>8)!==n.destination){n.scrollFraction+=128;camera+=1+(n.scrollFraction>>8);n.scrollFraction&=255;n.walk++;}
  if(n.walk===0)n.task++;
  break;
 }
 case 3:
  if(n.secondary===0){
   if(n.primary===0)message=0;
   else if(i.world===8){if(n.primary>=3)message=n.primary;}
   else if(n.primary>=4){n.endTimer=6;n.task++;break;}
   else if(n.primary===2)message=2;
  }
  n.secondary+=4;n.primary=(n.primary+(n.secondary>>8))&255;n.secondary&=255;
  if(n.primary>=7){n.endTimer=6;n.task++;}
  break;
 case 4:advance=n.endTimer===0&&i.world<8;if(advance)n.task=0;break;
 }
 return {camera,remove,kill,fall,message,music,advance};
}

/** VRAM text addresses $2548/$25c5/$2605 and $25a7/$25e3/$264a/$2688. */
export function nativeVictoryText(n:NativeVictory,messages:readonly number[],player:number){
 const rows:{text:string;x:number;y:number}[]=[];
 for(const part of messages){
  if(part===0)rows.push({text:'THANK YOU '+(player?'LUIGI':'MARIO')+'!',x:64,y:80});
  if(part===2)rows.push({text:'BUT OUR PRINCESS IS IN',x:40,y:112},{text:'ANOTHER CASTLE!',x:40,y:128});
  if(part===3)rows.push({text:'YOUR QUEST IS OVER.',x:56,y:104});
  if(part===4)rows.push({text:'WE PRESENT YOU A NEW QUEST.',x:24,y:120});
  if(part===5)rows.push({text:'PUSH BUTTON B',x:80,y:144});
  if(part===6)rows.push({text:'TO SELECT A WORLD',x:64,y:160});
 }
 return rows.map(row=>({...row,x:row.x+n.destination*256}));
}
