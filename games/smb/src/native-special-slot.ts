/** Native enemy slot5 and AreaFrenzy queue ownership (FlagpoleObject, Setup_Vine, SetupPowerUp,
 * ChkEnemyFrenzy, EndFrenzy, VineObjectHandler). No replay frame or camera thresholds. */
import {nativeMiscOffscreen} from './native-misc';
export type AreaControl={x:number;id:number};
export class NativeSpecialSlot {
 vineSlots:number[]=[];flag=0;id=0;state=0;x=0;y=0;yHigh=0;vineHeight=0;vineCount=0;vineStartY=0;frenzyQueue=0;frenzyBuffer=0;
 claimPowerup(x:number,y:number){this.state=1;this.yHigh=1;this.flag=1;this.id=46;this.x=x;this.y=y;}
 claimVine(x:number,y:number){this.flag=1;this.id=47;this.x=x;this.y=y;if(!this.vineCount)this.vineStartY=y;this.vineCount++;this.vineSlots.push(5);}
 addVineSegment(slot:number){this.vineCount++;this.vineSlots.push(slot);}
 claimFlag(column:number){this.flag=(this.flag+1)&255;this.id=48;this.x=column-8;this.y=48;}
 erase(){this.flag=0;this.id=0;this.state=0;}
 areaCommand(id:number,enemyIds:ReadonlyArray<number>){this.frenzyQueue=enemyIds.includes(id)?0:id;}
 /** A queued object goes into the first free enemy slot, including5. It is distinct from CheckFrenzyBuffer, which does not set a flag. */
 consumeFrenzy(slot:number){
  if(!this.frenzyQueue||slot>5)return undefined;
  const id=this.frenzyQueue;this.frenzyQueue=0;this.frenzyBuffer=id===24?0:id;
  if(slot===5){this.state=0;this.flag=id===24?0:1;this.id=id;}
  return {slot,id};
 }
 stepVine(frame:number,camera:number){
  if(!this.flag||this.id!==47)return;
  const limit=this.vineCount===1?48:96;
  if(this.vineHeight!==limit&&(frame&2)){this.y=(this.y-1)&255;this.vineHeight=(this.vineHeight+1)&255;}
  if(this.vineHeight>=8&&(nativeMiscOffscreen(this.x,this.y,camera)&12)){this.erase();this.vineHeight=0;this.vineCount=0;this.vineSlots=[];}
 }
}
/** AreaParserTaskHandler: the two native columns are parsed on tasks7 and3, four rows apart. */
export function nativeControlColumn(crossCamera:number,rowsSinceCross:number){
 return rowsSinceCross===0?crossCamera+352:rowsSinceCross===4?crossCamera+368:undefined;
}
