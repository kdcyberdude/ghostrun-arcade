/** Native area identity for the strict audit. $0750 is a LOOK-AHEAD destination, not the currently loaded area.
 * GetAreaDataAddrs writes the loaded stream+2 to $e7/$e8; InitializeArea chooses its starting page before drawing.
 * Bindings follow ROM world routes and three-byte portal destinations through the remake's static scene graph.
 * No per-visit Mario position or first matching gameplay row is used to set an origin. */
import catalog from '../../data/native-area-catalog.json';
import type {Area,Level} from '../../src/types.js';
type PhysicalArea={code:number,type:number,index:number,data:number,enemy:number,header:number[],portals:{x:number,destination:number,world:number,page:number,offset:number}[]};
const physical=catalog.areas as unknown as Record<number,PhysicalArea>;
export type AreaBinding={area:string,code:number,data:number,offset:number,entryPage:number,source:string};
export type NativeAreaLoad={frame:number,ptr:number,area?:string,offset?:number,method:string,candidates:AreaBinding[],context:{areaPointer:number,entrancePage:number,startPage:number,modeTask:number,physicalCode?:number},diagnostic?:string};
const typeOf=(a:Area)=>a.theme==='water'?0:a.theme==='underground'?2:a.theme==='castle'?3:1;
export function nativeWorldStages(world:number):number[][]{
 const stages:number[][]=[];let pending:number[]=[];
 for(const code of catalog.worlds[world]){pending.push(code);if(((physical[code].header[0]>>3)&7)!==7){stages.push(pending);pending=[];}}
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
/** Native InitializeArea completes mode task 0 -> 1 and writes the starting ScreenLeft_PageLoc before the screen routines.
 * Repeated pipe entries into the same physical area are distinguished by this load epoch and page, not by an area-data-pointer change. */
export function nativeAreaLoads(level:Level,ram:Uint8Array,initialArea=level.main):{loads:NativeAreaLoad[],bindings:AreaBinding[],diagnostics:string[]}{
 const {bindings,diagnostics}=nativeAreaBindings(level),loads:NativeAreaLoad[]=[];let previousPtr=-1,previousTask=-1;
 const byData=new Map(Object.values(physical).map(a=>[a.data,a]));
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);if(r[0x770]!==1||`${r[0x75f]+1}-${r[0x75c]+1}`!==level.id)break;
  const ptr=r[0xe7]+r[0xe8]*256,task=r[0x772],initializing=frame===0||task===1&&previousTask===0||ptr!==previousPtr;
  previousTask=task;previousPtr=ptr;if(!initializing)continue;
  const native=byData.get(ptr),startPage=r[0x71a],context={areaPointer:r[0x750],entrancePage:r[0x751],startPage,modeTask:task,...(native?{physicalCode:native.code}:{})};
  const selected=frame===0&&initialArea!==level.main?selectNativeAreaBinding(level,bindings,ptr,startPage).filter(b=>b.area===initialArea):selectNativeAreaBinding(level,bindings,ptr,startPage,frame===0);
  const chosen=selected.length===1?selected[0]:undefined;
  loads.push({frame,ptr,candidates:selected,context,method:'ROM loaded-area pointer and InitializeArea start page',...(chosen?{area:chosen.area,offset:chosen.offset}:{diagnostic:!native?'loaded pointer is not in native ROM area table':`${selected.length} static scene bindings for loaded code ${native.code.toString(16)} page ${startPage}`})});
 }
 return {loads,bindings,diagnostics};
}
