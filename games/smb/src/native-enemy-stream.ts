/** ProcessEnemyData calls InitEnemyObject before deciding whether to execute
 * Inc2B. A placed record starts with flag1; frenzy/vine fallback starts with
 * the free slot's flag0 and never advances the data cursor. Queued frenzy
 * starts with flag1 but also bypasses ProcessEnemyData/Inc2B. */
import {NativeWaterStream,type WaterStreamEvent} from './native-water-stream.js';
export interface NativeEnemyContext {camera:number;hard:boolean;primaryHard:boolean;slot:number;frenzy:number;vine:number;queue:number}
export interface NativeEnemyInit {source:'placed'|'group'|'frenzy'|'queue';slot:number;id:number;flag:number;offset?:number;x?:number;y?:number}
export type NativeEnemyAttempt=WaterStreamEvent&{init?:NativeEnemyInit;flag?:number};
export class NativeEnemyStream extends NativeWaterStream {
 attempt(n:NativeEnemyContext,initialize:(event:NativeEnemyInit)=>number):NativeEnemyAttempt{
  if(n.queue){const init:NativeEnemyInit={source:'queue',slot:n.slot,id:n.queue,flag:1};n.queue=0;return {kind:'frenzy',init,flag:initialize(init)};}
  let init:NativeEnemyInit|undefined,flag:number|undefined;
  const event=super.next(n.camera,n.hard,n.slot,e=>{
   const group=e.id>=0x37&&e.id<0x3f,id=e.id===6&&n.primaryHard?2:e.id;
   init={source:group?'group':'placed',slot:n.slot,id,flag:group?0:1,offset:e.offset,x:e.x,y:e.y};flag=initialize(init);
   return group||flag!==0;
  });
  if(event.kind==='frenzy'&&(n.frenzy||n.vine===1)){
   init={source:'frenzy',slot:n.slot,id:n.frenzy||47,flag:0};flag=initialize(init);
  }
  return init?{...event,init,flag}:event;
 }
}
