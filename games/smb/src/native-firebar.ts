import {nativeMiscOffscreen} from './native-misc.js';
import {nativeAreaBindings,nativePhysicalAreas} from './native-area-catalog.js';import {nativeEnemyBytes} from './native-enemy-catalog.js';import type {Level} from './types.js';
export interface NativeFirebarBytes {id:number;high:number;low:number;speed:number;direction:number}
export interface NativeFirebarProfile {x:number;y:number;id:number;speed:number;direction:number}
/** InitShortFirebar ROM tables: ID27/29/31 use $28, ID28/30 use $38. */
export function nativeFirebarParameters(id:number){return {speed:[40,56,40,56,40][id-27],direction:[0,0,16,16,0][id-27]};}
/** ProcFirebar uses the same raw pivot offscreen bits as other enemy objects.
 * FirebarSpin modifies $58, carries/borrows into $A0, then masks its high byte.
 * The long-arm horizontal-angle correction also runs while TimerControl holds. */
export function stepNativeFirebar(n:NativeFirebarBytes,x:number,y:number,camera:number,run=true){
 if(nativeMiscOffscreen(x,y,camera)&8)return;
 if(run){const low=n.low+(n.direction?-n.speed:n.speed);n.low=low&255;n.high=(n.high+(low<0?-1:low>255?1:0))&31;}
 if(n.id>=31&&(n.high===8||n.high===24))n.high++;
}
export const nativeFirebarUnits=(n:Pick<NativeFirebarBytes,'high'|'low'>)=>(((n.high&31)+24)%32)*32+n.low/8;
/** Exact source record binding; initialization adds4 to the raw object X/Y and
 * the pictured pivot center adds4 more. No nearest-object or phase fitting. */
export function nativeFirebarProfiles(level:Level,area:string):NativeFirebarProfile[]{
 if(!/^[1-8]-[1-4]$/.test(level.id))return [];
 const binding=nativeAreaBindings(level).bindings.find(b=>b.area===area);if(!binding)return [];
 const bytes=nativeEnemyBytes(nativePhysicalAreas[binding.code].enemy);if(!bytes)return [];
 const out:NativeFirebarProfile[]=[];let page=0,selected=false;
 for(let offset=0;offset<bytes.length&&bytes[offset]!==255;){
  const first=bytes[offset],second=bytes[offset+1],row=first&15;
  if(second&128&&!selected){page++;selected=true;}
  if(row===15&&!selected){page=second&63;selected=true;offset+=2;continue;}
  const id=second&63;if(row!==14&&id>=27&&id<=31)out.push({id,x:page*256+(first&240)+8+binding.offset,y:row*16+8,...nativeFirebarParameters(id)});
  offset+=row===14?3:2;selected=false;
 }
 return out;
}
