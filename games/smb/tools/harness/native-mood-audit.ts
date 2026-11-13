/** Split POWER-ON mood captures on native InitializeArea epochs; audit supported entrances.
 * Every input frame remains accounted in native control spans. Unsupported entrances/UI are explicit incomplete coverage.
 * npx tsx tools/harness/native-mood-audit.ts --cache CACHE [--limit N --write-traces]
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {Simulation} from '../../src/simulation.js';
import {observedLevels} from '../../src/levels.js';
import {decodeEntrance,initializeEntrance} from './native-entrance.mjs';
import {compareRun} from './native-divergence.js';
import {strictCompare} from './native-strict.js';
import {auditNativeLoadPrefix} from './native-mood-load-prefix.js';
import {nativeAreaBindings,selectNativeAreaBinding} from './native-area-identity.js';
import {hash,type MoodRun} from './native-mood-corpus.js';
export const ramLevel=(r:Uint8Array)=>`${r[0x75f]+1}-${r[0x75c]+1}`;
export function nativeContext(r:Uint8Array){const digits=(a:number,n:number)=>Array.from(r.slice(a,a+n)).reduce((s,v)=>s*10+v,0);return {time:digits(0x7f8,3),score:digits(0x7dd,6)*10,coins:r[0x75e],gameTimer:r[0x787],parser:{task:r[0x71f],scroll:r[0x73d],vram:r[0x773]},vertical:{speed:r[0x9f]<128?r[0x9f]:r[0x9f]-256,force:r[0x433],fraction:r[0x416],gravity:r[0x70a]},misc:Array.from({length:9},(_,slot)=>({slot,state:r[0x2a+slot],x:256*r[0x7a+slot]+r[0x93+slot],y:256*r[0xc2+slot]+r[0xdb+slot],speed:r[0xac+slot],force:r[0x440+slot],fraction:r[0x423+slot]})),mode:r[0x770],task:r[0x772],engine:r[14],level:ramLevel(r),lives:r[0x75a]+1,loadedData:r[0xe7]+256*r[0xe8],startPage:r[0x71a],entrancePage:r[0x751],areaDestination:r[0x750],counter:r[9],timerControl:r[0x747],interval:r[0x77f],camera:256*r[0x71a]+r[0x71c],x:256*r[0x6d]+r[0x86],y:r[0xce],random:Array.from(r.slice(0x7a7,0x7ae)),enemies:Array.from({length:6},(_,slot)=>({slot,flag:r[0xf+slot],id:r[0x16+slot],state:r[0x1e+slot],x:256*r[0x6e+slot]+r[0x87+slot],y:256*r[0xb6+slot]+r[0xcf+slot],fraction:r[0x417+slot]}))};}
export function moodNativeTimeline(ram:Uint8Array){
 if(ram.length%2048)throw Error('Native RAM must contain whole PPU rows');
 const spans:{from:number,to:number,mode:number,task:number,engine:number,level:string,lives:number,data:number}[]=[],loads:number[]=[];let last='';
 for(let f=0;f<ram.length/2048;f++){
  const r=ram.subarray(f*2048,(f+1)*2048),p=f?ram.subarray((f-1)*2048,f*2048):undefined;
  const s={mode:r[0x770],task:r[0x772],engine:r[14],level:ramLevel(r),lives:r[0x75a]+1,data:r[0xe7]+256*r[0xe8]},key=JSON.stringify(s);
  if(key===last)spans[spans.length-1].to=f+1;else{spans.push({from:f,to:f+1,...s});last=key;}
  if(s.mode===1&&s.task===1&&(!p||p[0x770]!==1||p[0x772]===0))loads.push(f);
 }
 return {spans,loads};
}
function copyRange(source:string,target:string,offset:number,length:number){
 const input=fs.openSync(source,'r'),output=fs.openSync(target,'w'),buffer=Buffer.alloc(1024*1024);try{for(let n=0;n<length;){const got=fs.readSync(input,buffer,0,Math.min(buffer.length,length-n),offset+n);if(!got)throw Error('Truncated native stream');fs.writeSync(output,buffer,0,got);n+=got;}}finally{fs.closeSync(input);fs.closeSync(output);}
}
function nativeHudAt(dir:string,run:MoodRun,frame:number){
 const file=path.join(dir,'ppu-hud','readout.json');if(!fs.existsSync(file))return {};
 const data=JSON.parse(fs.readFileSync(file,'utf8')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));
 if(data.padSha256!==run.sha256||data.ramSha256!==capture.ramSha256||data.romSha256!==capture.romSha256)throw Error('Initial PPU HUD provenance mismatch');
 const nativeHud=data.entries.find((row:any)=>row.frame===frame);return nativeHud?{nativeHud,nativeHudEvidence:{padSha256:run.sha256,ramSha256:data.ramSha256,romSha256:data.romSha256,backendSha256:data.backendSha256,clock:data.clock}}:{};
}
function writeEntry(dir:string,index:number,level:string,initialFrame:number,end:number,pads:Buffer,ram:Buffer,run:MoodRun,binding:unknown,raw=false,role?:'control-prefix'){
 const start=initialFrame+1,base=path.join(dir,'entries',String(index).padStart(4,'0'),...(role?[role]:raw?['native-entry']:[])),trace=path.join(base,'traces',level),receipts=path.join(base,'receipts',level),initial=ram.subarray(initialFrame*2048,start*2048);
 fs.mkdirSync(trace,{recursive:true});fs.mkdirSync(receipts,{recursive:true});fs.writeFileSync(path.join(trace,'initial.ram'),initial);fs.writeFileSync(path.join(trace,'pads.bin'),pads.subarray(start,end));fs.writeFileSync(path.join(trace,'ram.bin'),ram.subarray(start*2048,end*2048));
 fs.writeFileSync(path.join(receipts,'entrance.json'),JSON.stringify({schema:'native-mood-entry-v1',level,...nativeHudAt(dir,run,start),initialRamSha256:hash(initial),actionsSha256:run.sha256,sourceFrameOffset:start,sourcePadSha256:run.sha256,areaBinding:binding,provenance:run.provenance,initializationRole:role??(raw?'native-entry':'gameplay'),initialization:role==='control-prefix'?'native ScreenRoutines seed at InitializeArea; every following loader-only input is replayed before the first engine7/8 row':raw?'first source engine7/8 row, regardless of initializer support':'first source engine7/8 row supported by snapshot initializer; no later convenient-pose search',notReconstructed:['full native machine state','hidden simulation state without an initializer']},null,2)+'\n');
 const pixelDir=path.join(dir,'pixels');if(fs.existsSync(path.join(pixelDir,'pixels.json'))){const meta=JSON.parse(fs.readFileSync(path.join(pixelDir,'pixels.json'),'utf8'));if(meta.step!==1)throw Error('Mood entry clipping requires all-frame native pixels');copyRange(path.join(pixelDir,'pixels.bin'),path.join(trace,'pixels.bin'),start*240*224,(end-start)*240*224);copyRange(path.join(pixelDir,'emph.bin'),path.join(trace,'emph.bin'),start*224,(end-start)*224);fs.writeFileSync(path.join(trace,'pixels.json'),JSON.stringify({...meta,frames:end-start,sourceFrameOffset:start})+'\n');}
 return {traceDirectory:trace,receiptDirectory:receipts};
}
const levels=observedLevels();
export function auditMoodCapture(dir:string,run:MoodRun,writeTraces=false){
 const pads=fs.readFileSync(path.join(dir,'pads.bin')),ram=fs.readFileSync(path.join(dir,'ram.bin')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));
 if(pads.length!==run.frames||ram.length!==pads.length*2048||hash(pads)!==run.sha256||hash(ram)!==capture.ramSha256)throw Error(`capture integrity failure ${run.sha256}`);
 const timeline=moodNativeTimeline(ram),entries:any[]=[];let comparedFrames=0;
 for(let index=0;index<timeline.loads.length;index++){
  const loadFrame=timeline.loads[index],endFrame=timeline.loads[index+1]??pads.length,load=ram.subarray(loadFrame*2048,(loadFrame+1)*2048),level=levels.find(l=>l.id===ramLevel(load));
  const candidates=level?selectNativeAreaBinding(level,nativeAreaBindings(level).bindings,load[0xe7]+256*load[0xe8],load[0x71a]):[];
  const entry:any={index,loadFrame,endFrame,level:ramLevel(load),native:nativeContext(load),areaBindings:candidates,coverage:'incomplete',diagnostics:[]};
  const nativeEntryFrame=Array.from({length:endFrame-loadFrame},(_,n)=>loadFrame+n).find(f=>{const r=ram.subarray(f*2048,(f+1)*2048);return r[0x770]===1&&r[0x772]===3&&[7,8].includes(r[14]);});
  if(nativeEntryFrame!==undefined){entry.nativeEntryFrame=nativeEntryFrame;if(writeTraces)entry.nativeTrace=writeEntry(dir,index,entry.level,nativeEntryFrame,endFrame,pads,ram,run,candidates[0],true);}
  try{entry.controlPrefix=auditNativeLoadPrefix(ram,pads,entry);if(entry.controlPrefix){comparedFrames+=entry.controlPrefix.strict.coverage.frames;if(writeTraces)Object.assign(entry.controlPrefix,writeEntry(dir,index,entry.level,loadFrame,entry.controlPrefix.endFrame,pads,ram,run,candidates[0],false,'control-prefix'));}}catch(error){entry.diagnostics.push({scope:'load-prefix',reason:String(error)});}
  let first=-1,entrance:ReturnType<typeof decodeEntrance>|undefined;
  if(!level)entry.diagnostics.push('unmapped native level');
  else if(candidates.length!==1)entry.diagnostics.push(`${candidates.length} static ROM area bindings`);
  else{
   const seenEngines=new Set<number>();
   for(let f=loadFrame;f<endFrame;f++){
    const r=ram.subarray(f*2048,(f+1)*2048);if(r[0x770]!==1||r[0x772]!==3||![7,8].includes(r[14])||seenEngines.has(r[14]))continue;
    seenEngines.add(r[14]);
    try{const e=decodeEntrance(r,{level:level.id,...nativeHudAt(dir,run,f+1)},candidates[0]),sim=new Simulation(levels);sim.reset(true);entry.initialization=initializeEntrance(sim,e);first=f;entrance=e;break;}
    catch(error){entry.diagnostics.push({frame:f,engine:r[14],reason:String(error)});}
    if(seenEngines.has(8))break; // Never search later movement for a conveniently matching pose.
   }
  }
  if(first<0||!entrance){entry.diagnostics.push(entry.controlPrefix?'no supported gameplay entry; source load prefix compared separately':'no supported source entry; all epoch frames remain un-compared');entries.push(entry);continue;}
  const start=first+1,initial=ram.subarray(first*2048,start*2048),segmentPads=pads.subarray(start,endFrame),segmentRam=ram.subarray(start*2048,endFrame*2048);
  const legacy=compareRun(entrance,segmentPads,f=>segmentRam.subarray(f*2048,(f+1)*2048),level!.id,true),strict=strictCompare(entrance,segmentPads,segmentRam,level!.id);
  entry.initialFrame=first;entry.sourceFrameOffset=start;entry.frames=segmentPads.length;entry.comparedFrames=strict.coverage.frames;entry.uncomparedPrefixFrames=start-loadFrame;entry.uncomparedTailFrames=segmentPads.length-strict.coverage.frames;
  comparedFrames+=strict.coverage.frames;entry.legacy=legacy;entry.strict={...strict,samples:strict.samples.slice(0,8)};
  entry.ui={status:'incomplete',reason:'native/rendered pixel comparison has not been run'};

  if(writeTraces)Object.assign(entry,writeEntry(dir,index,level!.id,first,endFrame,pads,ram,run,candidates[0]));
  entries.push(entry);
 }
 const deaths=timeline.spans.filter((s,i)=>s.mode===1&&s.engine===6&&(i===0||timeline.spans[i-1].engine!==6)).length;
 return {schema:'native-mood-audit-v1',sha256:run.sha256,frames:pads.length,provenance:run.provenance,native:{deaths,spans:timeline.spans},coverage:{status:'incomplete',comparedFrames,uncomparedFrames:pads.length-comparedFrames,reason:'control spans retain every POWER-ON input frame; unsupported entrances/control modes/UI remain explicit'},entries};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{cache:{type:'string'},limit:{type:'string'},'write-traces':{type:'boolean'},'runtime-ref':{type:'string'},hashes:{type:'string'}}});if(!a.cache)throw Error('--cache required');
 const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),runs:MoodRun[]=a.hashes?inventory.runs.filter((r:MoodRun)=>a.hashes!.split(',').includes(r.sha256)):a.limit?inventory.runs.slice(0,Number(a.limit)):inventory.runs,results:any[]=[];
 const runtimeCommit=execFileSync('git',['rev-parse',a['runtime-ref']??'HEAD'],{encoding:'utf8'}).trim();
 execFileSync('git',['diff','--exit-code',runtimeCommit,'--','src','data'],{stdio:'pipe'});
 const auditToolSha256=hash(Buffer.concat(fs.readdirSync(new URL('.',import.meta.url)).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).sort().map(f=>fs.readFileSync(new URL(f,import.meta.url)))));
 for(const run of runs){const dir=path.join(a.cache,'captures',run.sha256);if(!fs.existsSync(path.join(dir,'capture.json')))continue;
  const saved=path.join(dir,'audit.json'),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8')),pixelFile=path.join(dir,'pixels','pixels.json'),pixelSha=fs.existsSync(pixelFile)?JSON.parse(fs.readFileSync(pixelFile,'utf8')).pixelsSha256:undefined;
  const hudFile=path.join(dir,'ppu-hud','readout.json'),hudSha=fs.existsSync(hudFile)?hash(fs.readFileSync(hudFile)):undefined;
  const cached=fs.existsSync(saved)?JSON.parse(fs.readFileSync(saved,'utf8')):undefined;
  const result=cached&&cached.runtimeCommit===runtimeCommit&&cached.auditToolSha256===auditToolSha256&&cached.captureRamSha256===capture.ramSha256&&cached.pixelSha===pixelSha&&cached.hudSha===hudSha&&(!a['write-traces']||cached.tracesWritten)?cached:{...auditMoodCapture(dir,run,a['write-traces']),captureRamSha256:capture.ramSha256,pixelSha,hudSha,tracesWritten:Boolean(a['write-traces'])};fs.writeFileSync(path.join(dir,'audit.json'),JSON.stringify({...result,runtimeCommit,auditToolSha256},null,2)+'\n');results.push({sha256:run.sha256,frames:run.frames,coverage:result.coverage,entries:result.entries.length,comparedEntries:result.entries.filter((e:any)=>e.legacy).length,nativeDeaths:result.native.deaths});

  console.log(JSON.stringify(results[results.length-1]));
 }
 const report={schema:'native-mood-corpus-audit-v1',runtimeCommit,auditToolSha256,inventory:{files:inventory.files,unique:inventory.unique,frames:inventory.frames},capturedRuns:results.length,coverage:{status:'incomplete',comparedFrames:results.reduce((n,r)=>n+r.coverage.comparedFrames,0),uncomparedFrames:results.reduce((n,r)=>n+r.coverage.uncomparedFrames,0)},runs:results};
 fs.writeFileSync(path.join(a.cache,'audit-summary.json'),JSON.stringify(report,null,2)+'\n');
}
