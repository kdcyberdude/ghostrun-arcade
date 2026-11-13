/** Native area identity for the strict audit. $0750 is a LOOK-AHEAD destination, not the currently loaded area.
 * GetAreaDataAddrs writes the loaded stream+2 to $e7/$e8; InitializeArea chooses its starting page before drawing.
 * Bindings follow ROM world routes and three-byte portal destinations through the remake's static scene graph.
 * No per-visit Mario position or first matching gameplay row is used to set an origin. */
import type {Level} from '../../src/types.js';
import {nativePhysicalAreas as physical,nativeAreaBindings,selectNativeAreaBinding,type AreaBinding} from '../../src/native-area-catalog.js';
export {nativeWorldStages,nativeAreaBindings,selectNativeAreaBinding,type AreaBinding} from '../../src/native-area-catalog.js';
export type NativeAreaLoad={frame:number,ptr:number,area?:string,offset?:number,method:string,candidates:AreaBinding[],context:{areaPointer:number,entrancePage:number,startPage:number,modeTask:number,physicalCode?:number},diagnostic?:string};
/** Native InitializeArea completes mode task 0 -> 1 and writes the starting ScreenLeft_PageLoc before the screen routines.
 * With continuationLevels, preserve the physical scene through logical-level changes and follow later native loads.
 * Repeated pipe entries into the same physical area are distinguished by this load epoch and page, not by an area-data-pointer change. */
export function nativeAreaLoads(level:Level,ram:Uint8Array,initialArea=level.main,continuationLevels?:Level[]):{loads:NativeAreaLoad[],bindings:AreaBinding[],diagnostics:string[]}{
 const {bindings,diagnostics}=nativeAreaBindings(level),loads:NativeAreaLoad[]=[];let previousPtr=-1,previousTask=-1;
 const byData=new Map(Object.values(physical).map(a=>[a.data,a]));
 for(let frame=0;frame<ram.length/2048;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048),id=`${r[0x75f]+1}-${r[0x75c]+1}`;
  if(!continuationLevels&&(r[0x770]!==1||id!==level.id))break;
  // Victory/GameOver do not load a new stream. A logical level change precedes InitializeArea:
  // keep the old physical binding until its pointer or task 0 -> 1 load epoch changes.
  if(r[0x770]!==1){previousTask=-1;continue;}
  const ptr=r[0xe7]+r[0xe8]*256,task=r[0x772],initializing=frame===0||task===1&&previousTask===0||ptr!==previousPtr;
  previousTask=task;previousPtr=ptr;if(!initializing)continue;
  const loadedLevel=continuationLevels?.find(l=>l.id===id)??level,loadedBindings=loadedLevel===level?bindings:nativeAreaBindings(loadedLevel).bindings;
  const native=byData.get(ptr),startPage=r[0x71a],context={areaPointer:r[0x750],entrancePage:r[0x751],startPage,modeTask:task,...(native?{physicalCode:native.code}:{})};
  const selected=frame===0&&initialArea!==level.main?selectNativeAreaBinding(loadedLevel,loadedBindings,ptr,startPage).filter(b=>b.area===initialArea):selectNativeAreaBinding(loadedLevel,loadedBindings,ptr,startPage,frame===0);
  const chosen=selected.length===1?selected[0]:undefined;
  loads.push({frame,ptr,candidates:selected,context,method:'ROM loaded-area pointer and InitializeArea start page',...(chosen?{area:chosen.area,offset:chosen.offset}:{diagnostic:!native?'loaded pointer is not in native ROM area table':`${selected.length} static scene bindings for loaded code ${native.code.toString(16)} page ${startPage}`})});
 }
 return {loads,bindings,diagnostics};
}
