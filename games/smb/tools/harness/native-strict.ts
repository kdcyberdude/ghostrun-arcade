/** Optional strict coverage audit for native-divergence.ts --strict. The legacy gate remains unchanged.
 * Current area comes from ROM AreaData pointers and native InitializeArea start pages, never from Mario's observed position.
 * Unsupported objects, unresolved native loads, and incomplete remake ownership produce explicit coverage gaps. */
import {victoryChecks,victoryLoadChecks} from './native-victory-readout.js';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import type {Button,Level} from '../../src/types.js';
import {initializeEntrance} from './native-entrance.mjs';
import {nativeAreaBindings,nativeAreaLoads,type NativeAreaLoad,type AreaBinding} from './native-area-identity.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage,type CoverageGap,type EntityMismatch} from './native-strict-entities.js';

export type StrictAreaVisit=NativeAreaLoad;
export function strictAreaVisits(level:Level,ram:Uint8Array):StrictAreaVisit[]{return nativeAreaLoads(level,ram).loads;}
export type StrictAudit={schema:'native-strict-audit-v1',status:'pass'|'diverged'|'incomplete',first:number|null,firstCoverageGap:number|null,
 fields:Record<string,number|null>,identity:{bindings:AreaBinding[],diagnostics:string[],continuations:{level:string,from:number,bindings:AreaBinding[],diagnostics:string[]}[]},coverage:{completeInputSequence:boolean,unsteppedFrames:number,ramFrames:number,flagFrames:number,continuationFrames:number,victoryFrames:number,uncomparedSameLevelFrames:number,nativeMappedFrames:number,inputFrames:number,endReason:string,frames:number,alignedFrames:number,nativeEntityRows:number,comparedEntityRows:number,nativeBirthRows:number,areaFrames:Record<string,number>,complete:boolean},
 diagnostics:{code:string,area:string,first:number,count:number,detail:string,slot?:number,id?:number}[],mismatches:{code:string,area:string,slot?:number,kind:string,first:number,count:number}[],samples:({frame:number,area:string}&EntityMismatch)[],visits:StrictAreaVisit[]};
const digits=(r:Uint8Array,a:number,n:number)=>Array.from(r.subarray(a,a+n)).reduce((sum,v)=>sum*10+v,0);
export function strictCompare(entrance:unknown,pads:ArrayLike<number>,ram:Uint8Array,level:string):StrictAudit{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const nativeLevel=sim.level as Level,areaIdentity=nativeAreaLoads(nativeLevel,ram,(entrance as {area?:string}).area??nativeLevel.main),visits=areaIdentity.loads;
 const modelBindings=new Map<unknown,AreaBinding[]>();for(const model of sim.levels as Level[]){const bound=nativeAreaBindings(model).bindings;for(const area of model.areas)modelBindings.set(area,[...(modelBindings.get(area)??[]),...bound.filter(b=>b.area===area.id)]);}
 const fields:Record<string,number|null>={level:null,area:null,dead:null,time:null,score:null,coins:null,cam:null,x:null,y:null,missing:null,extra:null,kind:null,position:null,state:null};
 const coverage={completeInputSequence:false,unsteppedFrames:0,ramFrames:Math.floor(ram.length/2048),flagFrames:0,continuationFrames:0,victoryFrames:0,uncomparedSameLevelFrames:0,nativeMappedFrames:0,inputFrames:pads.length,endReason:'end of trace',frames:0,alignedFrames:0,nativeEntityRows:0,comparedEntityRows:0,nativeBirthRows:0,areaFrames:{} as Record<string,number>,complete:true};
 const diagnosticMap=new Map<string,StrictAudit['diagnostics'][number]>(),mismatchMap=new Map<string,StrictAudit['mismatches'][number]>(),samples:StrictAudit['samples']=[];let firstCoverageGap:number|null=null,index=-1;
 const gap=(f:number,area:string,g:CoverageGap)=>{coverage.complete=false;firstCoverageGap??=f;const key=`${g.code}:${area}:${g.id??''}:${g.slot??''}:${g.detail}`;
  const found=diagnosticMap.get(key);if(found)found.count++;else diagnosticMap.set(key,{...g,area,first:f,count:1});};
 const check=(key:string,native:unknown,remake:unknown,f:number)=>{fields[key]??=null;if(fields[key]!==null)return;const equal=Array.isArray(native)?Array.isArray(remake)&&native.length===remake.length&&native.every((v,i)=>v===remake[i]):native===remake;if(!equal)fields[key]=f;};
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 const continuations:StrictAudit['identity']['continuations']=[];let regionId=level,regionVisits=visits,lastVisit:NativeAreaLoad|undefined;
 let prev:Uint8Array|undefined,walkOwned=false;
 if(ram.length!==pads.length*2048)gap(0,(entrance as {area?:string}).area??nativeLevel.main,{code:'input-ram-length-mismatch',detail:`${pads.length} input frames require ${pads.length*2048} RAM bytes; got ${ram.length} (${coverage.ramFrames} complete rows)`});
 if(!pads.length)gap(0,nativeLevel.main,{code:'empty-native-input',detail:'no retained input frames to compare'});
 for(let f=0;f<Math.min(pads.length,coverage.ramFrames);f++){
  const raw=ram.subarray(f*2048,(f+1)*2048),nativeId=`${raw[0x75f]+1}-${raw[0x75c]+1}`;
  if(raw[0x770]!==1&&raw[0x770]!==2){
   for(let tail=f;tail<Math.min(pads.length,coverage.ramFrames);tail++){
    const r=ram.subarray(tail*2048,(tail+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==nativeId)break;coverage.uncomparedSameLevelFrames++;
   }
   coverage.endReason=`unsupported same-level native mode ${raw[0x770]} at frame ${f}`;
   gap(f,regionVisits[index]?.area??'unresolved',{code:'unsupported-native-mode',detail:`mode=${raw[0x770]}, task=${raw[0x772]}, engine=${raw[0x0e]}; ${coverage.uncomparedSameLevelFrames} remaining same-level frames are not compared`});
   break;
  }
  if(raw[0x770]===1&&raw[0x772]===3&&(raw[14]===4||raw[14]===5))coverage.flagFrames++;
  if(nativeId!==regionId){
   regionId=nativeId;index=-1;walkOwned=false;const model=(sim.levels as Level[]).find(l=>l.id===nativeId);
   if(model){const identity=nativeAreaLoads(model,ram.subarray(f*2048));regionVisits=identity.loads.map(v=>({...v,frame:v.frame+f,method:`${nativeId}: ${v.method}`}));continuations.push({level:nativeId,from:f,bindings:identity.bindings,diagnostics:identity.diagnostics});}
   else{regionVisits=[];gap(f,'unresolved',{code:'unsupported-native-level',detail:`no static level model for ${nativeId}; scalar replay continues`});}
  }
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);coverage.frames++;
  while(index+1<regionVisits.length&&regionVisits[index+1].frame<=f)index++;
  const ptr=raw[0xe7]+raw[0xe8]*256,currentVisit=regionVisits[index],fallback=(!currentVisit?.area||currentVisit.ptr!==ptr)&&lastVisit?.ptr===ptr&&nativeId!==level;
  const visit=fallback?lastVisit:currentVisit,area=visit?.area??'unresolved';
  if(fallback&&!modelBindings.get(sim.mazeSource)?.some(b=>b.data===ptr&&b.offset===visit?.offset))gap(f,area,{code:'post-level-scene-transition',detail:`logical next level retains AreaData=${ptr.toString(16)}, origin=${visit?.offset}; remake compiled scene does not own that native stream/origin`});
  if(nativeId!==level){coverage.continuationFrames++;if(raw[0x770]===1){for(const [key,native,remake]of victoryLoadChecks(raw,sim))check(`continuation.${key}`,native,remake,f);if(raw[0x772]<3&&!sim.levelLoad&&!sim.deathLoad)gap(f,area,{code:'native-load-control-not-owned',detail:`native next-area mode task=${raw[0x772]}, screen task=${raw[0x73c]}, engine=${raw[14]}; no source load-control object in remake`});}}
  if((entrance as {nativeLoad?:unknown}).nativeLoad){for(const [key,native,remake]of victoryLoadChecks(raw,sim))check(`prefix.${key}`,native,remake,f);check('prefix.load.timer',raw[0x7a0],sim.nativeScreen?.timer,f);check('prefix.load.columns',raw[0x71e],sim.nativeScreen?.columns,f);}
  coverage.areaFrames[area]=(coverage.areaFrames[area]??0)+1;
  check('level',nativeId,sim.level.id,f);check('dead',raw[14]===6||raw[14]===11,['dying','gameover'].includes(sim.phase),f);
  check('time',digits(raw,0x7f8,3),sim.time,f);check('score',digits(raw,0x7dd,6)*10,sim.score,f);check('coins',raw[0x75e],sim.coins,f);
  if(raw[0x770]===2){
   coverage.victoryFrames++;if(prev?.[0x770]===2&&prev[0x772]===2)walkOwned=true;
   for(const [key,native,remake]of victoryChecks(raw,sim,walkOwned,prev?.[0x770]===2,visit?.offset??0))check(`victory.${key}`,native,remake,f);
   if(!sim.nativeVictory)gap(f,area,{code:'native-victory-not-owned',detail:'native mode2 has no remake victory control state; replay continues without resetting gameplay'});
  }
  const native=strictNativeEntities(raw,visit?.offset??0);coverage.nativeEntityRows+=native.live;
  for(let slot=0;slot<6;slot++)if(raw[0x0f+slot]&&(!prev||!prev[0x0f+slot]))coverage.nativeBirthRows++;
  for(let slot=0;slot<9;slot++)if(raw[0x2a+slot]&&(!prev||!prev[0x2a+slot]))coverage.nativeBirthRows++;
  prev=raw;
  if(!visit||visit.ptr!==ptr||visit.area===undefined){
   gap(f,area,{code:'unresolved-native-area',detail:!visit?'no native block-buffer visit':visit.ptr!==ptr?'native area pointer changed before a mapped visit':`${visit.diagnostic??'no static native binding'}; data=${ptr.toString(16)}, destination=${raw[0x750].toString(16)}, EntrancePage=${raw[0x751]}, screenPage=${raw[0x71a]}, task=${raw[0x772]}`});
   for(const g of native.gaps)gap(f,area,g);continue;
  }
  lastVisit=visit;coverage.nativeMappedFrames++;check('area',visit.area,sim.area.id,f);
  if(sim.level.id!==nativeId||sim.area.id!==visit.area){gap(f,area,{code:'area-ownership-mismatch',detail:`native ${nativeId}/${visit.area}, remake ${sim.level.id}/${sim.area.id}; data=${ptr.toString(16)}, loaded page=${visit.context.startPage}, origin=${visit.offset}, load frame=${visit.frame}, task=${raw[0x772]}, look-ahead destination=${raw[0x750].toString(16)}`});for(const g of native.gaps)gap(f,area,g);continue;}
  coverage.alignedFrames++;coverage.comparedEntityRows+=native.entities.length;
  check('cam',raw[0x71a]*256+raw[0x71c]+visit.offset!,Math.floor(sim.camera),f);
  check('x',raw[0x6d]*256+raw[0x86]+visit.offset!,Math.floor(sim.player.x),f);
  check('y',(raw[0xb5]-1)*256+raw[0xce],Math.floor(sim.player.y)-32,f);
  const differences=strictEntityDifferences(native,strictSimEntities(sim));
  for(const g of [...differences.gaps,...strictSimCoverage(sim)])gap(f,area,g);
  for(const mismatch of differences.mismatches){
   if(fields[mismatch.code]===null)fields[mismatch.code]=f;
   const entity=mismatch.native??mismatch.sim!,key=`${mismatch.code}:${area}:${entity.bank}:${entity.slot}:${entity.kind}`,found=mismatchMap.get(key);
   if(found)found.count++;else mismatchMap.set(key,{code:mismatch.code,area,slot:entity.slot,kind:entity.kind,first:f,count:1});
   if(samples.length<100)samples.push({frame:f,area,...mismatch});
  }
 }
 coverage.unsteppedFrames=pads.length-coverage.frames;coverage.completeInputSequence=coverage.complete&&coverage.unsteppedFrames===0&&ram.length===pads.length*2048;
 const firsts=Object.values(fields).filter((v):v is number=>v!==null),first=firsts.length?Math.min(...firsts):null;
 return {schema:'native-strict-audit-v1',status:first!==null?'diverged':coverage.complete?'pass':'incomplete',first,firstCoverageGap,fields,identity:{bindings:areaIdentity.bindings,diagnostics:areaIdentity.diagnostics,continuations},coverage,diagnostics:[...diagnosticMap.values()],mismatches:[...mismatchMap.values()],samples,visits};
}
