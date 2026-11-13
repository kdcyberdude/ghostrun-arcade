import type {Simulation} from '../../src/simulation.js';
/** Read stored simulation state, never platformPosition/verticalState or other memoizing motor queries.
 * Static level/area definitions and the separately compared emitted-audio buffer are outside the state hash.
 * Maps/Sets and non-finite counters retain their values instead of collapsing to {} or null.
 * Keep this function self-contained: its source also runs unchanged in the browser. */
export function renderEquivalenceSnapshot(s:Simulation){
 const state=Object.fromEntries(Object.entries(s).filter(([key,value])=>!['levels','area','mazeSource','events'].includes(key)&&typeof value!=='function'));
 const readout=s as any,motor=readout.platformMotion,platformCopy=Object.assign(Object.create(Object.getPrototypeOf(motor)),motor);
 // artworkPosition only memoizes nativeStart/startCounter. Query a separate map copy; never the live motor/getters.
 for(const [key,value]of Object.entries(motor))if(value instanceof Map)platformCopy[key]=new Map(value);else if(value instanceof Set)platformCopy[key]=new Set(value);
 const platforms=(s.area.platforms??[]).map(spec=>({current:platformCopy.artworkPosition(spec,readout.platformFrame),previous:platformCopy.artworkPosition(spec,readout.platformFrame-1)}));
 const firebars=(s.area.firebars??[]).map(bar=>s.firebarCenters(bar)),springs=(s.area.springs??[]).map(spring=>({x:spring.x,y:spring.y,compression:s.springCompression(spring)}));
 return JSON.stringify({platforms,firebars,springs,level:s.level.id,area:s.area.id,state,pictures:{
  bubbles:s.bubbles,castleFlag:s.castleFlag,fireworks:s.flagFireworks,
  nativeCastleFlag:readout.nativeCastleFlag,nativeFireworks:readout.nativeFireworks,
  nativeFireworksCounter:readout.nativeFireworksCounter,nativeEndLevelMusic:readout.nativeEndLevelMusic,nativeFrenzyTimer:readout.nativeFrenzyTimer,
  nativeEndLevelMusicQueue:readout.nativeEndLevelMusicQueue,nativeEndLevelMusicAreaQueue:readout.nativeEndLevelMusicAreaQueue,
  retainer:s.castleRetainer,spriteOwner:s.spritePictureOwner,screen:s.nativeScreen,
 }},(_key,value)=>value instanceof Map?{type:'Map',entries:[...value]}:value instanceof Set?{type:'Set',values:[...value]}:typeof value==='number'&&!Number.isFinite(value)?{type:'Number',value:String(value)}:value);
}
