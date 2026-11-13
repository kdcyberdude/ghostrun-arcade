/** Pure PRG0 world-route and portal bindings shared by runtime and native audits. */
import catalog from '../data/native-area-catalog.json';
import type {Area,Level} from './types.js';
export type PhysicalArea={code:number;type:number;index:number;data:number;enemy:number;header:number[];portals:{x:number;destination:number;world:number;page:number;offset:number}[]};
export const nativePhysicalAreas=catalog.areas as unknown as Record<number,PhysicalArea>;
const physical=nativePhysicalAreas;
export type AreaBinding={area:string;code:number;data:number;offset:number;entryPage:number;source:string};
const typeOf=(a:Area)=>a.theme==='water'?0:a.theme==='underground'?2:a.theme==='castle'?3:1;
export function nativeWorldStages(world:number):number[][]{
 const stages:number[][]=[];let pending:number[]=[];
 for(const code of catalog.worlds[world]??[]){pending.push(code);if(((physical[code].header[0]>>3)&7)!==7){stages.push(pending);pending=[];}}
 if(pending.length)stages.push(pending);return stages;
}
/** A binding's offset is a ROM EntrancePage origin, not a fitted Mario/camera correction. */
export function nativeAreaBindings(level:Level):{bindings:AreaBinding[],diagnostics:string[]}{
 const [world,stage]=level.id.split('-').map(Number),codes=nativeWorldStages(world-1)[stage-1],bindings:AreaBinding[]=[],diagnostics:string[]=[];
 if(!codes)return {bindings,diagnostics:['level has no native world-route entry']};
 const area=(id:string)=>level.areas.find(a=>a.id===id)!;
 const bind=(id:string,code:number,entryPage:number,offset:number,source:string)=>bindings.push({area:id,code,data:physical[code].data,entryPage,offset,source});
 bind(level.main,codes[0],0,0,'ROM WorldAddrOffsets / AreaAddrOffsets');
 let entry=area(level.main);
 for(const code of codes.slice(1)){
  const pipe=entry.pipes?.find(p=>!p.targetLevel);if(!pipe){diagnostics.push(`${entry.id}: native automatic entry has no remake pipe`);break;}
  bind(pipe.to,code,0,0,'ROM automatic-entry header and next world-route area');entry=area(pipe.to);
 }
 for(let index=0;index<bindings.length;index++){
  const binding=bindings[index],from=area(binding.area),native=physical[binding.code];
  const edges=[...(from.pipes??[]).filter(p=>!p.targetLevel),...(from.vines??[]).filter(v=>v.to),...(from.fallExit?[from.fallExit]:[])];
  for(const edge of edges){
   const targetId=edge.to!;if(bindings.some(b=>b.area===targetId))continue;
   const target=area(targetId);if(!target){diagnostics.push(`${from.id}: missing target ${targetId}`);continue;}
   const anchor='x' in edge?edge.x-binding.offset:undefined;
   const options=native.portals.filter(p=>p.world===world-1&&physical[p.destination]?.type===typeOf(target));
   const distance=(p:typeof options[number])=>anchor===undefined?0:Math.abs(p.x-anchor),best=Math.min(...options.map(distance)),selected=options.filter(p=>distance(p)===best);
   if(selected.length!==1){diagnostics.push(`${from.id}->${targetId}: ${selected.length} native portal candidates`);continue;}
   const portal=selected[0],camera=target.camera??('camera' in edge?edge.camera:undefined)??0;
   if(camera%256!==0){diagnostics.push(`${targetId}: static scene origin is not a whole page (${camera})`);continue;}
   bind(targetId,portal.destination,portal.page,camera-portal.page*256,`ROM ParseRow0e ${native.enemy.toString(16)}+${portal.offset}; static ${from.id} entrance ${anchor??'fall'}`);
  }
 }
 for(const a of level.areas)if(!bindings.some(b=>b.area===a.id))diagnostics.push(`${a.id}: no ROM scene binding`);
 return {bindings,diagnostics};
}
/** Entry page selects a static native scene; overlapping/duplicate origins stay ambiguous. */
export function selectNativeAreaBinding(level:Level,bindings:AreaBinding[],ptr:number,startPage:number,initial=false):AreaBinding[]{
 const candidates=bindings.filter(b=>b.data===ptr&&(initial?b.area===level.main:startPage*256+b.offset>=0&&startPage*256+b.offset<level.areas.find(a=>a.id===b.area)!.width));
 const exact=candidates.filter(b=>b.entryPage===startPage);return exact.length===1?exact:candidates;
}
