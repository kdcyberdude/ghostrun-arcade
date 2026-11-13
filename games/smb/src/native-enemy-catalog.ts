/** Physical enemy records share one cursor across placed actors and frenzy. */
import catalog from '../data/native-enemy-streams.json';
const streams=new Map(catalog.streams.map(stream=>[stream.pointer,stream.bytes]));
export const nativeEnemyBytes=(pointer:number)=>streams.get(pointer);
/** Decode static source identity without consuming a live loader cursor. */
export function nativeEnemyRecords(bytes:readonly number[]){
 const records:{offset:number;id:number;x:number;y:number;hard:boolean}[]=[];let page=0,selected=false;
 for(let offset=0;bytes[offset]!==255;){
  const first=bytes[offset],second=bytes[offset+1],row=first&15;
  if(second&128&&!selected){page++;selected=true;}
  if(row===15&&!selected){page=second&63;selected=true;offset+=2;continue;}
  const id=second&63;if(row!==14)records.push({offset,id,x:page*256+(first&240),y:row*16+(id<21?8:0),hard:Boolean(second&64)});
  offset+=row===14?3:2;selected=false;
 }
 return records;
}
