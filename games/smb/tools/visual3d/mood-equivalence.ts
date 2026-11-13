/** Exact headless/2D/3D state+audio replay of supported native mood entry epochs.
 * npx tsx tools/visual3d/mood-equivalence.ts --cache CACHE --runtime-ref SHA [--hashes H,... --entries 0,1 --batch 16 --port 5565]
 * Requires native-mood-audit --write-traces. Every supported input is rendered; this is mutation/audio equivalence, not visual-image proof.
 * Unsupported initializers and epoch prefixes remain explicit gaps. Receipts are cached per entry with runtime/tool/input hashes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {hash,type MoodRun} from '../harness/native-mood-corpus.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},'runtime-ref':{type:'string'},hashes:{type:'string'},entries:{type:'string'},batch:{type:'string',default:'16'},port:{type:'string',default:'5565'}}});
if(!a.cache||!a['runtime-ref'])throw Error('--cache and --runtime-ref required');
const batch=Number(a.batch);if(!Number.isInteger(batch)||batch<1)throw Error('--batch must be a positive integer');
const runtimeCommit=execFileSync('git',['rev-parse',a['runtime-ref']],{encoding:'utf8'}).trim();execFileSync('git',['diff','--exit-code',runtimeCommit,'--','src','data','assets'],{stdio:'pipe'});
const toolSha256=hash(Buffer.concat([fs.readFileSync(new URL(import.meta.url)),fs.readFileSync(new URL('./equivalence.ts',import.meta.url)),fs.readFileSync(new URL('./lib.ts',import.meta.url)),...fs.readdirSync(new URL('../harness/',import.meta.url)).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).sort().map(f=>fs.readFileSync(new URL('../harness/'+f,import.meta.url)))]));
const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),selected=a.entries?.split(',').map(Number),rows:any[]=[],pending:any[]=[];
let nativeEpochFrames=0,entryEpochs=0;
for(const run of inventory.runs as MoodRun[]){
 if(a.hashes&&!a.hashes.split(',').includes(run.sha256))continue;
 const auditFile=path.join(a.cache,'captures',run.sha256,'audit.json');if(!fs.existsSync(auditFile)){rows.push({sha256:run.sha256,status:'incomplete',reason:'native entry audit missing',frames:run.frames});continue;}
 const audit=JSON.parse(fs.readFileSync(auditFile,'utf8'));if(audit.runtimeCommit!==runtimeCommit)throw Error(`Native audit runtime differs: ${run.sha256}`);
 for(const e of audit.entries){
  if(selected&&!selected.includes(e.index))continue;
  entryEpochs++;nativeEpochFrames+=e.endFrame-e.loadFrame;
  const row:any={id:run.sha256+'/'+e.index,sha256:run.sha256,entry:e.index,level:e.level,sourceFrameOffset:e.sourceFrameOffset,epochFrames:e.endFrame-e.loadFrame,prefixFrames:e.uncomparedPrefixFrames??e.endFrame-e.loadFrame,status:'incomplete'};rows.push(row);
  if(!e.legacy||!e.traceDirectory||!e.receiptDirectory){row.reason='unsupported initializer or missing clipped entry';row.diagnostics=e.diagnostics;continue;}
  const inputSha256=hash(Buffer.concat(['pads.bin','initial.ram'].map(f=>fs.readFileSync(path.join(e.traceDirectory,f))).concat([fs.readFileSync(path.join(e.receiptDirectory,'entrance.json'))]))),file=path.join(path.dirname(path.dirname(e.traceDirectory)),'3d-equivalence.json');
  Object.assign(row,{runtimeCommit,toolSha256,inputSha256,frames:fs.statSync(path.join(e.traceDirectory,'pads.bin')).size,visualCoverage:'not compared; state/audio equivalence only'});
  if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file,'utf8'));if(old.runtimeCommit===runtimeCommit&&old.toolSha256===toolSha256&&old.inputSha256===inputSha256&&old.status==='pass'){Object.assign(row,old);continue;}}
  pending.push({row,file,case:{id:row.id,level:e.level,traceDirectory:e.traceDirectory,receiptDirectory:e.receiptDirectory}});
 }
}
for(let start=0;start<pending.length;start+=batch){
 const entries=pending.slice(start,start+batch),manifest=path.join(a.cache,'3d-equivalence-cases.json'),receipt=path.join(a.cache,'3d-equivalence-batch.json');fs.writeFileSync(manifest,JSON.stringify(entries.map(e=>e.case))+'\n');fs.rmSync(receipt,{force:true});
 const result=spawnSync('npx',['tsx',new URL('./equivalence.ts',import.meta.url).pathname,'--cases='+manifest,'--out='+receipt],{stdio:'inherit',env:{...process.env,V25_PORT:a.port!}});
 if(!fs.existsSync(receipt))throw Error(`Equivalence batch failed without receipt: ${result.status}`);
 const proof=JSON.parse(fs.readFileSync(receipt,'utf8'));
 for(const e of entries){const replay=proof.levels.find((l:any)=>l.id===e.row.id);Object.assign(e.row,{status:replay&&Object.values(replay.checks).every(v=>v===-1)&&!proof.errors.orig.length&&!proof.errors.v25.length?'pass':'diverged',replay,renderer:proof.renderer,errors:proof.errors});fs.writeFileSync(e.file,JSON.stringify(e.row,null,1)+'\n');}
}
const comparedFrames=rows.reduce((n,r)=>n+(r.replay?.frames??0),0),report={kind:'render-state-audio-equivalence',runtimeCommit,toolSha256,status:rows.some(r=>r.status==='diverged')?'diverged':'incomplete',coverage:{nativeEpochFrames,entryEpochs,comparedFrames,uncomparedEpochFrames:nativeEpochFrames-comparedFrames,passedEntries:rows.filter(r=>r.status==='pass').length,unsupportedEntries:rows.filter(r=>r.status==='incomplete').length,visualFramesCompared:0,reason:'Independent supported entry initialization; epoch prefixes, unsupported entries and visual images remain unverified.'},entries:rows};
fs.writeFileSync(path.join(a.cache,'3d-equivalence-report.json'),JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify(report.coverage));if(rows.some(r=>r.status==='diverged'))process.exitCode=1;
