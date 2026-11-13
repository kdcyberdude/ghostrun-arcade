/** Exact headless/2D/3D state+audio replay of supported native mood entry epochs.
 * npx tsx tools/visual3d/mood-equivalence.ts --cache CACHE --runtime-ref SHA [--hashes H,... --entries 0,1 --batch 16 --port 5565]
 * Requires native-mood-audit --write-traces. Every supported input is rendered; this is mutation/audio equivalence, not visual-image proof.
 * Control prefixes use separate cases; seeds and unsupported transitions remain explicit gaps. Receipts are cached per entry with runtime/tool/input hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {sourceCoverage} from './mood-equivalence-coverage.js';
import {hash,type MoodRun} from '../harness/native-mood-corpus.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},'runtime-ref':{type:'string'},hashes:{type:'string'},entries:{type:'string'},batch:{type:'string',default:'16'},port:{type:'string',default:'5565'}}});
if(!a.cache||!a['runtime-ref'])throw Error('--cache and --runtime-ref required');
const batch=Number(a.batch);if(!Number.isInteger(batch)||batch<1)throw Error('--batch must be a positive integer');
const runtimeCommit=execFileSync('git',['rev-parse',a['runtime-ref']],{encoding:'utf8'}).trim();execFileSync('git',['diff','--exit-code',runtimeCommit,'--','src','data','assets'],{stdio:'pipe'});
const toolSha256=hash(Buffer.concat([fs.readFileSync(new URL(import.meta.url)),fs.readFileSync(new URL('./equivalence.ts',import.meta.url)),fs.readFileSync(new URL('./equivalence-snapshot.ts',import.meta.url)),fs.readFileSync(new URL('./lib.ts',import.meta.url)),fs.readFileSync(new URL('./mood-equivalence-coverage.ts',import.meta.url)),...fs.readdirSync(new URL('../harness/',import.meta.url)).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).sort().map(f=>fs.readFileSync(new URL('../harness/'+f,import.meta.url)))]));
const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),selected=a.entries?.split(',').map(Number),rows:any[]=[],pending:any[]=[],epochs:any[]=[],runs:any[]=[];
let nativeEpochFrames=0,entryEpochs=0;
for(const run of inventory.runs as MoodRun[]){
 if(a.hashes&&!a.hashes.split(',').includes(run.sha256))continue;
 runs.push({sha256:run.sha256,frames:run.frames});
 const auditFile=path.join(a.cache,'captures',run.sha256,'audit.json');if(!fs.existsSync(auditFile)){rows.push({sha256:run.sha256,status:'incomplete',reason:'native entry audit missing',frames:run.frames});continue;}
 const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));if(audit.runtimeCommit!==runtimeCommit)throw Error(`Native audit runtime differs: ${run.sha256}`);
 for(const e of audit.entries){
  if(selected&&!selected.includes(e.index))continue;
  entryEpochs++;nativeEpochFrames+=e.endFrame-e.loadFrame;
  const epoch={sha256:run.sha256,entry:e.index,level:e.level,start:e.loadFrame,end:e.endFrame};epochs.push(epoch);
  for(const [role,segment]of [['control-prefix',e.controlPrefix],['gameplay',e.legacy?e:undefined]] as const){
   const row:any={id:run.sha256+'/'+e.index+'/'+role,sha256:run.sha256,entry:e.index,role,level:e.level,sourceFrameOffset:segment?.sourceFrameOffset,epochFrames:e.endFrame-e.loadFrame,status:'incomplete'};rows.push(row);
   if(!segment?.traceDirectory||!segment?.receiptDirectory){row.reason='unsupported initializer or missing clipped '+role;row.diagnostics=e.diagnostics;continue;}
   const trace=segment.traceDirectory,receipts=segment.receiptDirectory,inputSha256=hash(Buffer.concat(['pads.bin','initial.ram'].map(f=>fs.readFileSync(path.join(trace,f))).concat([fs.readFileSync(path.join(receipts,'entrance.json'))]))),file=path.join(path.dirname(path.dirname(trace)),'3d-equivalence.json');
   Object.assign(row,{runtimeCommit,toolSha256,inputSha256,frames:fs.statSync(path.join(trace,'pads.bin')).size,nativeAudit:{status:segment.strict?.status,coverage:segment.strict?.coverage},visualCoverage:'not compared; state/audio renderer equivalence only'});
   if(!row.frames){row.reason='seed-only source span has no following input frame';continue;}
   sourceCoverage(epoch.start,epoch.end,[{sourceFrameOffset:row.sourceFrameOffset,frames:row.frames}]);
   if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file,'utf8'));if(old.runtimeCommit===runtimeCommit&&old.toolSha256===toolSha256&&old.inputSha256===inputSha256&&old.status==='pass'){Object.assign(row,old);continue;}}
   pending.push({row,file,case:{id:row.id,level:e.level,traceDirectory:trace,receiptDirectory:receipts}});
  }
 }
}
for(let start=0;start<pending.length;start+=batch){
 const entries=pending.slice(start,start+batch),manifest=path.join(a.cache,'3d-equivalence-cases.json'),receipt=path.join(a.cache,'3d-equivalence-batch.json');fs.writeFileSync(manifest,JSON.stringify(entries.map(e=>e.case))+'\n');fs.rmSync(receipt,{force:true});
 const result=spawnSync('npx',['tsx',new URL('./equivalence.ts',import.meta.url).pathname,'--cases='+manifest,'--out='+receipt],{stdio:'inherit',env:{...process.env,V25_PORT:a.port!}});
 if(!fs.existsSync(receipt))throw Error(`Equivalence batch failed without receipt: ${result.status}`);
 const proof=JSON.parse(fs.readFileSync(receipt,'utf8'));
 for(const e of entries){const replay=proof.levels.find((l:any)=>l.id===e.row.id);Object.assign(e.row,{status:replay&&Object.values(replay.checks).every(v=>v===-1)&&!proof.errors.orig.length&&!proof.errors.v25.length?'pass':'diverged',replay,renderer:proof.renderer,errors:proof.errors});fs.writeFileSync(e.file,JSON.stringify(e.row,null,1)+'\n');}
}
const spans=(entries:any[])=>entries.filter(r=>r.replay).map(r=>({sourceFrameOffset:r.sourceFrameOffset,frames:r.replay.frames}));
const epochCoverage=epochs.map(e=>({...e,...sourceCoverage(e.start,e.end,spans(rows.filter(r=>r.sha256===e.sha256&&r.entry===e.entry)))})),runCoverage=runs.map(run=>({...run,...sourceCoverage(0,run.frames,spans(rows.filter(r=>r.sha256===run.sha256)))}));
const comparedFrames=epochCoverage.reduce((n,e)=>n+e.comparedFrames,0),nativeInputFrames=runs.reduce((n,r)=>n+r.frames,0),comparedInputFrames=runCoverage.reduce((n,r)=>n+r.comparedFrames,0),diverged=rows.some(r=>r.status==='diverged');
const report={kind:'render-state-audio-equivalence',runtimeCommit,toolSha256,status:diverged?'diverged':comparedInputFrames===nativeInputFrames&&rows.length&&rows.every(r=>r.status==='pass')?'pass':'incomplete',scope:{inventoryRuns:inventory.runs.length,selectedRuns:runs.length,hashes:a.hashes,entries:selected},coverage:{nativeInputFrames,nativeEpochFrames,entryEpochs,comparedFrames,comparedInputFrames,comparedCaseFrames:rows.reduce((n,r)=>n+(r.replay?.frames??0),0),uncomparedEpochFrames:nativeEpochFrames-comparedFrames,uncomparedInputFrames:nativeInputFrames-comparedInputFrames,passedCases:rows.filter(r=>r.status==='pass').length,passedControlPrefixes:rows.filter(r=>r.role==='control-prefix'&&r.status==='pass').length,passedGameplayCases:rows.filter(r=>r.role==='gameplay'&&r.status==='pass').length,unsupportedCases:rows.filter(r=>r.status==='incomplete').length,visualFramesCompared:0,reason:'Independent one-time source initialization; seed rows, unsupported transitions, unselected epochs and pre-entry inputs stay explicit. Renderer state/audio equivalence does not prove native fields, objects or visual images.'},epochCoverage,runCoverage,entries:rows};
fs.writeFileSync(path.join(a.cache,'3d-equivalence-report.json'),JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report.coverage));if(diverged)process.exitCode=1;
