/** Optional strict coverage audit for native-divergence.ts --strict. The legacy gate remains unchanged.
 * Area origin comes from native block-buffer geometry, constrained to whole pages, never from Mario's observed position.
 * Ambiguous geometry, unsupported objects, and incomplete area ownership produce explicit coverage gaps. */
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import type {Area,Button,Level} from '../../src/types.js';
import {initializeEntrance} from './native-entrance.mjs';
import {areaGrid,bufferValue,reconstruct,ROW0} from './native-level-map.js';
import {strictNativeEntities,strictSimEntities,strictEntityDifferences,strictSimCoverage,type CoverageGap,type EntityMismatch} from './native-strict-entities.js';

type AreaCandidate={area:string,offset:number,hits:number,conflicts:number};
export type StrictAreaVisit={frame:number,ptr:number,candidates:AreaCandidate[],area?:string,offset?:number,method?:string};
const themeType=(a:Area)=>a.theme==='water'?0:a.theme==='underground'?2:a.theme==='castle'?3:1;
/** Whole-page offsets keep coordinate normalization from concealing pixel errors. Ties stay unresolved. */
export function strictAreaCandidates(level:Level,cols:Map<number,number[]>,type:number):AreaCandidate[]{
 const keys=[...cols.keys()];if(!keys.length)return [];
 const first=Math.min(...keys),last=Math.max(...keys),candidates:AreaCandidate[]=[];
 for(const area of level.areas){
  if(themeType(area)!==type)continue;
  const grid=areaGrid(area).grid;
  // The block buffer stores collision metatiles, not decorative/free-piece overlays. Springs are native metatiles represented as objects.
  for(const spring of area.springs??[]){const col=spring.x/16,row=Math.floor((spring.y-24)/16);grid.set(`${col},${row}`,103);grid.set(`${col},${row+1}`,104);}
  for(let offset=-Math.ceil(last/16)*16;offset<=Math.ceil((area.width/16-first)/16)*16;offset+=16){
   let hits=0,conflicts=0;
   for(const [col,rows] of cols)for(let row=0;row<rows.length;row++){
    const x=col+offset,native=rows[row],inside=x>=0&&x*16<area.width;
    if(!inside){if(native)conflicts++;continue;}
    const remake=bufferValue(grid.get(`${x},${row+ROW0}`)??0);
    if(native!==remake)conflicts++;else if(native)hits++;
   }
   if(hits)candidates.push({area:area.id,offset:offset*16,hits,conflicts});
  }
 }
 const score=(c:AreaCandidate)=>c.hits-c.conflicts,best=Math.max(...candidates.map(score));
 return candidates.filter(c=>score(c)===best);
}
export function strictAreaVisits(level:Level,ram:Uint8Array):StrictAreaVisit[]{
 return reconstruct(ram,level.id).visits.map(v=>{
  const candidates=strictAreaCandidates(level,v.cols,ram[v.frame*2048+0x74e]),only=candidates.length===1&&candidates[0].conflicts===0?candidates[0]:undefined;
  return {frame:v.frame,ptr:v.ptr,candidates,...(v.frame===0?{area:level.main,offset:0,method:'entrance receipt'}:only?{area:only.area,offset:only.offset,method:'unique native collision-buffer geometry'}:{})};
 });
}
export type StrictAudit={schema:'native-strict-audit-v1',status:'pass'|'diverged'|'incomplete',first:number|null,firstCoverageGap:number|null,
 fields:Record<string,number|null>,coverage:{inputFrames:number,endReason:string,frames:number,alignedFrames:number,nativeEntityRows:number,comparedEntityRows:number,nativeBirthRows:number,areaFrames:Record<string,number>,complete:boolean},
 diagnostics:{code:string,area:string,first:number,count:number,detail:string,slot?:number,id?:number}[],mismatches:{code:string,area:string,slot?:number,kind:string,first:number,count:number}[],samples:({frame:number,area:string}&EntityMismatch)[],visits:StrictAreaVisit[]};
const digits=(r:Uint8Array,a:number,n:number)=>Array.from(r.subarray(a,a+n)).reduce((sum,v)=>sum*10+v,0);
export function strictCompare(entrance:unknown,pads:ArrayLike<number>,ram:Uint8Array,level:string):StrictAudit{
 const sim:any=new Simulation(observedLevels());sim.reset(true);initializeEntrance(sim,entrance);sim.step([],0);sim.inputs=[];
 const nativeLevel=sim.level as Level,visits=strictAreaVisits(nativeLevel,ram);
 const fields:Record<string,number|null>={level:null,area:null,dead:null,time:null,score:null,coins:null,cam:null,x:null,y:null,missing:null,extra:null,kind:null,position:null,state:null};
 const coverage={inputFrames:pads.length,endReason:'end of trace',frames:0,alignedFrames:0,nativeEntityRows:0,comparedEntityRows:0,nativeBirthRows:0,areaFrames:{} as Record<string,number>,complete:true};
 const diagnosticMap=new Map<string,StrictAudit['diagnostics'][number]>(),mismatchMap=new Map<string,StrictAudit['mismatches'][number]>(),samples:StrictAudit['samples']=[];let firstCoverageGap:number|null=null,index=-1;
 const gap=(f:number,area:string,g:CoverageGap)=>{coverage.complete=false;firstCoverageGap??=f;const key=`${g.code}:${area}:${g.id??''}:${g.slot??''}:${g.detail}`;
  const found=diagnosticMap.get(key);if(found)found.count++;else diagnosticMap.set(key,{...g,area,first:f,count:1});};
 const check=(key:string,native:unknown,remake:unknown,f:number)=>{if(native!==remake&&fields[key]===null)fields[key]=f;};
 const buttons:Button[]=['a','b','select','start','up','down','left','right'];
 let prev:Uint8Array|undefined;
 for(let f=0;f<Math.min(pads.length,ram.length/2048);f++){
  const raw=ram.subarray(f*2048,(f+1)*2048),nativeId=`${raw[0x75f]+1}-${raw[0x75c]+1}`;if(raw[0x770]!==1||nativeId!==level){coverage.endReason=raw[0x770]!==1?`native mode changed to ${raw[0x770]}`:`native level changed to ${nativeId}`;break;}
  sim.step(buttons.filter((_,bit)=>pads[f]&(1<<bit)),1);coverage.frames++;
  while(index+1<visits.length&&visits[index+1].frame<=f)index++;
  const visit=visits[index],ptr=raw[0xe7]+raw[0xe8]*256,area=visit?.area??'unresolved';
  coverage.areaFrames[area]=(coverage.areaFrames[area]??0)+1;
  check('level',nativeId,sim.level.id,f);check('dead',raw[14]===6||raw[14]===11,['dying','gameover'].includes(sim.phase),f);
  check('time',digits(raw,0x7f8,3),sim.time,f);check('score',digits(raw,0x7dd,6)*10,sim.score,f);check('coins',raw[0x75e],sim.coins,f);
  const native=strictNativeEntities(raw,visit?.offset??0);coverage.nativeEntityRows+=native.live;
  for(let slot=0;slot<6;slot++)if(raw[0x0f+slot]&&(!prev||!prev[0x0f+slot]))coverage.nativeBirthRows++;
  for(let slot=0;slot<9;slot++)if(raw[0x2a+slot]&&(!prev||!prev[0x2a+slot]))coverage.nativeBirthRows++;
  prev=raw;
  if(!visit||visit.ptr!==ptr||visit.area===undefined){
   gap(f,area,{code:'unresolved-native-area',detail:!visit?'no native block-buffer visit':visit.ptr!==ptr?'native area pointer changed before a mapped visit':`geometry has ${visit.candidates.length} best candidates (${visit.candidates.map(c=>`${c.area}@${c.offset}, conflicts ${c.conflicts}`).join('; ')})`});
   for(const g of native.gaps)gap(f,area,g);continue;
  }
  check('area',visit.area,sim.area.id,f);
  if(sim.level.id!==level||sim.area.id!==visit.area){gap(f,area,{code:'area-ownership-mismatch',detail:`native ${level}/${visit.area}, remake ${sim.level.id}/${sim.area.id}`});for(const g of native.gaps)gap(f,area,g);continue;}
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
 const firsts=Object.values(fields).filter((v):v is number=>v!==null),first=firsts.length?Math.min(...firsts):null;
 return {schema:'native-strict-audit-v1',status:first!==null?'diverged':coverage.complete?'pass':'incomplete',first,firstCoverageGap,fields,coverage,diagnostics:[...diagnosticMap.values()],mismatches:[...mismatchMap.values()],samples,visits};
}
