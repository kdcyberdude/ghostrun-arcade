/** Run only on root's final immutable batch; eight disjoint shards, no duplicate inputs. */
import fs from 'node:fs';import path from 'node:path';import {execFileSync,spawn} from 'node:child_process';import {parseArgs} from 'node:util';import {inventoryHash} from './combined-replay.mjs';import {policyHash} from './visual-check.mjs';import {aggregateLiveReports} from './live-aggregate.mjs';import {auditSourceHashes,verifyAuditSource} from './source-provenance.mjs';
const {values:a}=parseArgs({options:{runtime:{type:'string'},monitor:{type:'string'},out:{type:'string'},shards:{type:'string',default:'8'},'aggregate-only':{type:'boolean'},'base-port':{type:'string',default:'54100'}}});
if(!a.runtime||!a.monitor||!a.out)throw Error('--runtime IMMUTABLE_CHECKOUT --monitor DISPLAY_DIR --out PERSISTENT_OUTPUT required');
const runtime=path.resolve(a.runtime),out=path.resolve(a.out),monitor=path.resolve(a.monitor),n=Number(a.shards),read=p=>JSON.parse(fs.readFileSync(p));if(!Number.isInteger(n)||n<1||n>8)throw Error('shards1..8');
const pin=execFileSync('git',['rev-parse','HEAD'],{cwd:runtime,encoding:'utf8'}).trim();if(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:runtime,encoding:'utf8'}).trim())throw Error('Runtime must be clean');if(fs.existsSync(out)&&!a['aggregate-only'])throw Error('Refuse to overwrite an audit');if(!a['aggregate-only'])fs.mkdirSync(out,{recursive:true});
const inv=read(path.join(monitor,'combined-inputs.json')).runs;if(inv.length!==368||inv.reduce((s,r)=>s+r.frames,0)!==5178452)throw Error('Expected unchanged368-recording inventory');
const chunks=Array.from({length:n},()=>[]);inv.forEach((r,i)=>chunks[i%n].push(r.id));if(a['aggregate-only']){const plan=read(path.join(out,'plan.json'));if(plan.pin!==pin||plan.inventorySha256!==inventoryHash(inv)||JSON.stringify(plan.chunks)!==JSON.stringify(chunks))throw Error('Different saved plan');}else fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify({pin,inventorySha256:inventoryHash(inv),chunks},null,2)+'\n');
const sourceHashes=auditSourceHashes(path.join(runtime,'games/smb')),started=new Date().toISOString(),liveFile=path.join(out,'live-report.json');
const atomic=(file,value)=>{fs.writeFileSync(file+'.partial',JSON.stringify(value)+'\n');fs.renameSync(file+'.partial',file);};
function publish(status='running'){
 verifyAuditSource(runtime,pin,sourceHashes);
 const reports=chunks.flatMap((_,i)=>{const p=path.join(out,`shard-${i}.json`);return fs.existsSync(p)?[read(p)]:[];});
 const result=aggregateLiveReports(reports,inv,{pin,sourceHashes,policyHash,started,status,finished:status==='complete'?new Date().toISOString():null});
 if(status==='complete'&&(reports.length!==n||reports.some(r=>!['shard-complete','complete'].includes(r.progress.status))||result.report.runs.length!==368||result.report.errors.length||result.summary.progress.directlyComparedFrames!==5178452))throw Error('Incomplete native/source-verified aggregate');
 atomic(liveFile,result.report);atomic(path.join(out,'live-summary.json'),result.summary);return result;
}
if(!a['aggregate-only']){
 publish();fs.copyFileSync(path.join(monitor,'sources.json'),path.join(out,'display-sources-before-live.json'));
 execFileSync(process.execPath,[path.join(runtime,'games/smb/tools/harness/native-monitor/terminal.mjs'),'--monitor',monitor,'--follow-live',liveFile],{stdio:'inherit'});
 let heartbeatError;const heartbeat=setInterval(()=>{try{publish();}catch(error){heartbeatError=error;atomic(path.join(out,'heartbeat-error.json'),{error:String(error),at:new Date().toISOString()});}},5000);
 let results;try{results=await Promise.allSettled(chunks.map((ids,i)=>new Promise((resolve,reject)=>{const fd=fs.openSync(path.join(out,`shard-${i}.log`),'w'),p=spawn(path.join(runtime,'node_modules/.bin/tsx'),['games/smb/tools/harness/combined-monitor-audit.ts','--monitor',monitor,'--out',path.join(out,`shard-${i}.json`),'--ids',ids.join(','),'--jobs','1','--batch','8','--port',String(Number(a['base-port'])+i)],{cwd:runtime,stdio:['ignore',fd,fd]});p.on('error',reject);p.on('exit',code=>{fs.closeSync(fd);code===0?resolve():reject(Error(`Shard${i} failed${code}`));});})));}finally{clearInterval(heartbeat);}
 if(heartbeatError)throw heartbeatError;if(results.some(r=>r.status==='rejected')){publish('incomplete');throw Error('One or more shards failed; verified completed recordings remain published.');}
}
const {report,summary}=publish('complete');atomic(path.join(out,'combined-replay.json'),report);atomic(path.join(out,'summary.json'),summary);console.log(JSON.stringify({pin,matching:summary.matching,notMatching:summary.notMatching,unchecked:summary.unchecked,state:summary.state,picture:summary.picture,report:path.join(out,'combined-replay.json')}));
