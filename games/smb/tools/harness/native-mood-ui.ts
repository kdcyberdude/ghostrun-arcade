/** Compare every available picture frame of native mood entries, retaining JSON and optional evidence PNGs.
 * npx tsx tools/harness/native-mood-ui.ts --cache CACHE --runtime-ref SHA [--limit 2 --entries 0,7 --port 53971]
 * Capture native lossless picture streams first with native-mood-corpus.ts --pixels; then audit --write-traces to clip entries.
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {parseArgs} from 'node:util';
import {hash,type MoodRun} from './native-mood-corpus.js';
const {values:a}=parseArgs({options:{cache:{type:'string'},'runtime-ref':{type:'string'},limit:{type:'string'},hashes:{type:'string'},entries:{type:'string'},port:{type:'string',default:'53971'}}});
if(!a.cache||!a['runtime-ref'])throw Error('--cache and --runtime-ref required');
const runtimeCommit=execFileSync('git',['rev-parse',a['runtime-ref']],{encoding:'utf8'}).trim();execFileSync('git',['diff','--exit-code',runtimeCommit,'--','src','data','assets'],{stdio:'pipe'});
const uiToolSha256=hash(Buffer.concat(fs.readdirSync(new URL('.',import.meta.url)).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).sort().map(f=>fs.readFileSync(new URL(f,import.meta.url))))),inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8'));
const runs:MoodRun[]=a.hashes?inventory.runs.filter((r:MoodRun)=>a.hashes!.split(',').includes(r.sha256)):a.limit?inventory.runs.slice(0,Number(a.limit)):inventory.runs,selected=a.entries?.split(',').map(Number);
for(const run of runs){const dir=path.join(a.cache,'captures',run.sha256),file=path.join(dir,'audit.json');if(!fs.existsSync(file))continue;const audit=JSON.parse(fs.readFileSync(file,'utf8'));if(audit.runtimeCommit!==runtimeCommit)throw Error(`Native audit has a different runtime baseline: ${run.sha256}`);
 for(const entry of audit.entries){if(!entry.traceDirectory||selected&&!selected.includes(entry.index))continue;
  const base=path.join(dir,'entries',String(entry.index).padStart(4,'0')),resultFile=path.join(base,'ui.json'),pixelFile=path.join(entry.traceDirectory,'pixels.json');
  if(!fs.existsSync(pixelFile)){fs.writeFileSync(resultFile,JSON.stringify({status:'incomplete',runtimeCommit,uiToolSha256,sha256:run.sha256,entry:entry.index,reason:'native pixels not captured/clipped',results:[]})+'\n');continue;}
  if(fs.existsSync(resultFile)){const old=JSON.parse(fs.readFileSync(resultFile,'utf8'));if(old.uiToolSha256===uiToolSha256&&old.runtimeCommit===runtimeCommit&&old.results?.length)continue;}
  const temp=resultFile+'.partial';execFileSync('npx',['tsx',new URL('./native-pixels.ts',import.meta.url).pathname,'--traces',path.dirname(entry.traceDirectory),'--entrances',path.dirname(entry.receiptDirectory),'--levels',entry.level,'--all-frames','--out',path.join(base,'ui'),'--png','none','--json',temp,'--port',a.port!],{stdio:'inherit'});
  const results=JSON.parse(fs.readFileSync(temp,'utf8'));fs.writeFileSync(resultFile,JSON.stringify({runtimeCommit,uiToolSha256,sha256:run.sha256,entry:entry.index,sourceFrameOffset:entry.sourceFrameOffset,nativePixels:JSON.parse(fs.readFileSync(pixelFile,'utf8')),results})+'\n');fs.unlinkSync(temp);
 }
}
