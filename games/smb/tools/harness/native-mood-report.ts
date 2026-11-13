/** Fast repeatable corpus report from immutable cached native/audit evidence; no policy or replay runs.
 * npx tsx tools/harness/native-mood-report.ts --cache CACHE --runtime-ref SHA
 * Legacy and strict fields remain separate. Native/provenance statistics are descriptive, never alignment corrections. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
import {execFileSync} from 'node:child_process';
import {nativeContext} from './native-mood-audit.js';
import {hash,type MoodRun} from './native-mood-corpus.js';
export function moodCorpusReport(cache:string,runtimeCommit:string){
 const inventory=JSON.parse(fs.readFileSync(path.join(cache,'inventory.json'),'utf8')),clusters=new Map<string,any>(),coverageGaps=new Map<string,any>(),unsupported=new Map<string,any>(),runs:any[]=[],modes:Record<string,number>={};
 let nativeFrames=0,stepped=0,coordinates=0,nativeEntries=0,comparedEntries=0,pixelCaptured=0,pixelCompared=0,supportedEntityRows=0,controlPrefixes=0,controlPrefixFrames=0,controlPrefixCoordinates=0;
 for(const run of inventory.runs as MoodRun[]){
  const dir=path.join(cache,'captures',run.sha256),file=path.join(dir,'audit.json');if(!fs.existsSync(file))continue;
  const audit=JSON.parse(fs.readFileSync(file,'utf8'));if(audit.runtimeCommit!==runtimeCommit)continue;
  const ram=fs.readFileSync(path.join(dir,'ram.bin'));nativeFrames+=run.frames;stepped+=audit.coverage.comparedFrames;nativeEntries+=audit.entries.length;
  for(const span of audit.native.spans)modes[String(span.mode)]=(modes[String(span.mode)]??0)+span.to-span.from;
  const pm=path.join(dir,'pixels','pixels.json');if(fs.existsSync(pm))pixelCaptured+=JSON.parse(fs.readFileSync(pm,'utf8')).frames;
  const nativeDeaths=audit.native.deaths,provenance=run.provenance[0].summary as any;
  const out:any={auditToolSha256:audit.auditToolSha256,sha256:run.sha256,frames:run.frames,provenance:run.provenance,steppedFrames:audit.coverage.comparedFrames,coordinateComparedFrames:0,nativeDeaths,provenanceDeathCheck:!provenance||provenance.end==='running'?'unfinished/not-authoritative':nativeDeaths===provenance.deaths?'match':'mismatch',entries:[]};
  for(const e of audit.entries){
   const entry:any={index:e.index,level:e.level,area:e.areaBindings[0]?.area,loadFrame:e.loadFrame,nativeEntryFrame:e.nativeEntryFrame,initialFrame:e.initialFrame,sourceFrameOffset:e.sourceFrameOffset,endFrame:e.endFrame,diagnostics:e.diagnostics,initialization:e.initialization,ui:{status:'incomplete',reason:'no pixel comparison recorded'}};
   if(e.controlPrefix){const p=e.controlPrefix,s=p.strict;controlPrefixes++;controlPrefixFrames+=s.coverage.frames;controlPrefixCoordinates+=s.coverage.alignedFrames;coordinates+=s.coverage.alignedFrames;out.coordinateComparedFrames+=s.coverage.alignedFrames;supportedEntityRows+=s.coverage.comparedEntityRows;entry.controlPrefix={initialFrame:p.initialFrame,sourceFrameOffset:p.sourceFrameOffset,endFrame:p.endFrame,status:s.status,fields:s.fields,coverage:s.coverage,diagnostics:s.diagnostics,mismatches:s.mismatches};}
   for(const comparison of [
    ...(e.controlPrefix?[{scope:'control-prefix',fields:e.controlPrefix.strict.fields,strict:e.controlPrefix.strict,...e.controlPrefix}]:[]),
    ...(e.legacy?[{scope:'legacy',fields:e.legacy.fields,strict:e.strict,...e},{scope:'strict',fields:e.strict.fields,strict:e.strict,...e}]:[])
   ]){
    const {scope,fields,strict,sourceFrameOffset,traceDirectory,receiptDirectory}=comparison;
    for(const [field,local]of Object.entries(fields) as [string,number|null][]){if(local===null)continue;
     const sourceFrame=sourceFrameOffset+local,native=nativeContext(ram.subarray(sourceFrame*2048,(sourceFrame+1)*2048)),m=strict.mismatches.filter((m:any)=>m.code===field).sort((a:any,b:any)=>a.first-b.first)[0],kind=m?.kind??'',key=`${scope}/${e.level}/${entry.area}/${field}/${kind}/${native.engine}`;
     const earlierFields=Object.entries(fields).filter(([,first])=>first!==null&&Number(first)<local).map(([f,first])=>({field:f,localFrame:first}));
     const c=clusters.get(key)??{scope,level:e.level,area:entry.area,field,kind,engine:native.engine,count:0,suspectedMechanic:field==='time'&&native.engine===7?'HUD preload/readout vs logical timer':['missing','extra','kind','enemy'].includes(field)?'enemy allocation/area parser':field==='position'?'actor motion':field==='x'||field==='y'?'Mario motion/contact or entry-state ownership':field==='score'||field==='coins'?'award/collision ordering':'control/area ownership',examples:[]};c.count++;
     if(c.examples.length<3)c.examples.push({sha256:run.sha256,entry:e.index,sourceFrame,localFrame:local,earlierFields,native,entity:m?{kind:m.kind,slot:m.slot,bank:m.bank}:undefined,traceDirectory,receiptDirectory});clusters.set(key,c);
    }
    if(scope!=='legacy')for(const gap of strict.diagnostics){
     const kind=gap.kind??gap.detail?.split(':')[0]??'',key=[scope,e.level,entry.area,gap.code,kind].join('/'),g=coverageGaps.get(key)??{scope,level:e.level,area:entry.area,code:gap.code,kind,count:0,frames:0,examples:[]};g.count++;g.frames+=gap.count??0;
     if(g.examples.length<3)g.examples.push({sha256:run.sha256,entry:e.index,sourceFrame:sourceFrameOffset+gap.first,localFrame:gap.first,detail:gap.detail,traceDirectory,receiptDirectory});coverageGaps.set(key,g);
    }
   }
   if(!e.legacy){const reason=e.diagnostics.find((d:any)=>typeof d==='string')??e.diagnostics.at(-1)?.reason??'unknown initialization gap',key=`${e.level}/${entry.area??'unresolved'}/${reason}`;const u=unsupported.get(key)??{level:e.level,area:entry.area,reason,count:0,examples:[]};u.count++;if(u.examples.length<3)u.examples.push({sha256:run.sha256,entry:e.index,loadFrame:e.loadFrame,native:e.native});unsupported.set(key,u);out.entries.push(entry);continue;}
   comparedEntries++;coordinates+=e.strict.coverage.alignedFrames;out.coordinateComparedFrames+=e.strict.coverage.alignedFrames;supportedEntityRows+=e.strict.coverage.comparedEntityRows;
   entry.legacy=e.legacy.fields;entry.strict=e.strict.fields;entry.strictStatus=e.strict.status;entry.coverage=e.strict.coverage;
   const uiFile=path.join(dir,'entries',String(e.index).padStart(4,'0'),'ui.json');if(fs.existsSync(uiFile)){const u=JSON.parse(fs.readFileSync(uiFile,'utf8')),rows=u.results??u;entry.ui={status:!rows.length||rows.some((r:any)=>r.status==='incomplete'||r.coverage?.completeInputSequence!==true||r.pctAligned===null||r.coverage?.noOverlapFrames>0)||u.runtimeCommit!==runtimeCommit?'incomplete':rows.every((r:any)=>r.status==='pass')?'pass':'diverged',reports:rows.map(({rows,...r}:any)=>r)};pixelCompared+=rows.reduce((n:number,r:any)=>n+r.compared,0);}
   out.entries.push(entry);
  }
  runs.push(out);
 }
 return {schema:'native-mood-report-v1',runtimeCommit,reportToolSha256:hash(fs.readFileSync(new URL(import.meta.url))),auditToolVersions:[...new Set(runs.map(r=>r.auditToolSha256))],inventory:{files:inventory.files,unique:inventory.unique,frames:inventory.frames},runsAudited:runs.length,coverage:{status:'incomplete',nativeFramesCaptured:nativeFrames,stateSteppedFrames:stepped,initializedControlPrefixes:controlPrefixes,controlPrefixFrames,controlPrefixCoordinateFrames:controlPrefixCoordinates,unsteppedFrames:nativeFrames-stepped,coordinateComparedFrames:coordinates,noCoordinateComparisonFrames:nativeFrames-coordinates,supportedNativeEntityRows:supportedEntityRows,nativeEntryEpochs:nativeEntries,initializedEntries:comparedEntries,nativePixelFramesCaptured:pixelCaptured,pixelFramesCompared:pixelCompared,fullyVerifiedAllFieldAndPixelFrames:0,reason:'Independent native entry snapshots; hidden state/control modes/object families/pixels still have explicit gaps. Stepped frames do not mean every field or every object was compared.'},nativeModes:modes,unsupportedInitializers:[...unsupported.values()].sort((a,b)=>b.count-a.count),clusters:[...clusters.values()].sort((a,b)=>b.count-a.count),coverageGaps:[...coverageGaps.values()].sort((a,b)=>b.count-a.count),runs};
}
if(import.meta.url===`file://${process.argv[1]}`){const {values:a}=parseArgs({options:{cache:{type:'string'},'runtime-ref':{type:'string'}}});if(!a.cache||!a['runtime-ref'])throw Error('--cache and --runtime-ref required');const ref=execFileSync('git',['rev-parse',a['runtime-ref']],{encoding:'utf8'}).trim(),report=moodCorpusReport(a.cache,ref);fs.writeFileSync(path.join(a.cache,'corpus-report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({runs:report.runsAudited,...report.coverage,clusters:report.clusters.length,unsupportedInitializers:report.unsupportedInitializers.length}));}
