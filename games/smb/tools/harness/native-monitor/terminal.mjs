#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';import {emitKeypressEvents,cursorTo,clearScreenDown} from 'node:readline';
import {emptyResult,summarizeCombined,inventoryHash,sha,validateCombinedRegistration} from './combined-replay.mjs';import {renderCombined} from './combined-view.mjs';import {summarizeCurrent,failingRecordings} from './current-results.mjs';import {execFileSync} from 'node:child_process';import {policyHash} from './visual-check.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),read=p=>JSON.parse(fs.readFileSync(p));
const {values:args}=parseArgs({options:{monitor:{type:'string'},watch:{type:'boolean'},'add-combined':{type:'string'},'follow-live':{type:'string'},'await-v2':{type:'boolean'},'add-current':{type:'string'},'plan-failures':{type:'string'}}});
const configFile=path.join(path.resolve(args.monitor??path.join(dir,'.local')),'sources.json');if(!fs.existsSync(configFile)){console.error('Missing '+configFile+'. See README.md for setup, or pass --monitor /ABS/DATA_DIR.');process.exit(1);}
const config=read(configFile),latest=config.snapshots.at(-1),mood=read(latest.mood);
const inventory=mood.runs.map(r=>({id:`mood:${r.sha256}`,frames:r.frames,padsSha256:r.sha256,start:'power-on'}));
const references=path.join(path.dirname(latest.mood),'traces');
for(let w=1;w<=8;w++)for(let l=1;l<=4;l++){const level=`${w}-${l}`,pads=fs.readFileSync(path.join(references,level,'pads.bin')),initial=fs.readFileSync(path.join(references,level,'initial.ram'));inventory.push({id:`original:${level}`,frames:pads.length,padsSha256:sha(pads),initialRamSha256:sha(initial),start:'native-entrance'});}
const descriptor={schema:'smb-combined-inventory-v1',inventorySha256:inventoryHash(inventory),unit:'input-frame',runs:inventory};
const inventoryFile=path.join(path.dirname(configFile),'combined-inputs.json'),encoded=JSON.stringify(descriptor,null,2)+'\n';if(!fs.existsSync(inventoryFile)||fs.readFileSync(inventoryFile,'utf8')!==encoded)fs.writeFileSync(inventoryFile,encoded);
if(args['await-v2']){
 if(config.combined&&fs.existsSync(config.combined)&&read(config.combined).schema==='smb-combined-replay-v2')throw Error('Refuse to clear an existing v2 result');
 const notes=path.dirname(latest.mood),archive=path.join(notes,'legacy-sticky-reports',new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(archive,{recursive:true});
 fs.copyFileSync(configFile,path.join(archive,'sources-before-v2.json'));const moved=[];
 for(const name of fs.readdirSync(notes).filter(n=>/^combined-replay-[a-f0-9]+\.json$/.test(n))){const from=path.join(notes,name);if(read(from).schema==='smb-combined-replay-v1'){const bytes=fs.readFileSync(from),to=path.join(archive,name);fs.renameSync(from,to);moved.push({from,to,sha256:sha(bytes)});}}
 fs.writeFileSync(path.join(archive,'manifest.json'),JSON.stringify({reason:'Legacy sticky evidence retained outside automatic fallback discovery; no v2 measurements created',moved},null,2)+'\n');
 config.combined=null;fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');console.log('Awaiting v2; legacy pointer archived and '+moved.length+' legacy fallback receipts preserved outside discovery.');process.exit(0);
}
if(args['follow-live']){const file=path.resolve(args['follow-live']),r=read(file);validateCombinedRegistration(r,inventory,policyHash,{live:true});config.combined=file;fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');console.log('Following verified completed-recording live results; completion history unchanged.');process.exit(0);}
if(args['add-combined']){const file=path.resolve(args['add-combined']),r=read(file);validateCombinedRegistration(r,inventory,policyHash);config.combined=file;fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');console.log(r.scope?'Scoped combined report registered; other inventory frames remain unchecked.':'Combined report registered.');process.exit(0);}
const saveConfig=()=>{fs.writeFileSync(configFile+'.partial',JSON.stringify(config,null,2)+'\n');fs.renameSync(configFile+'.partial',configFile);};
// Newer-build receipts (state-only or level-scoped state+picture) are listed beside the historical full audit, never merged into it.
if(args['add-current']){
 const file=path.resolve(args['add-current']),summary=summarizeCurrent(read(file),inventory,policyHash),key=x=>x.kind+'|'+Object.keys(x.levels).sort().join(',');
 const same=f=>{try{return key(summarizeCurrent(read(f),inventory,policyHash))===key(summary);}catch{return false;}};
 config.current=(config.current??[]).filter(f=>path.resolve(f)!==file&&!same(f)).concat(file);saveConfig();
 console.log(`Registered ${summary.kind} results for ${Object.keys(summary.levels).join(', ')} · build ${summary.runtime.slice(0,7)}${summary.dirty?' (uncommitted changes)':''} · ${summary.recordings}/${summary.inventoryRecordings} recordings.`);process.exit(0);
}
if(args['plan-failures']){
 // Newest evidence for the level: a registered state+picture result, else state-only, else the historical full audit.
 const level=args['plan-failures'],sources=(config.current??[]).map(f=>({f,r:read(f)})).map(x=>({...x,s:summarizeCurrent(x.r,inventory,policyHash)})).filter(x=>x.s.levels[level]).sort((a,b)=>(a.s.kind==='state+picture'?0:1)-(b.s.kind==='state+picture'?0:1)||Date.parse(b.s.measured)-Date.parse(a.s.measured));
 const source=sources[0]?.r??read(config.combined),plan=failingRecordings(source,level),file=path.join(path.dirname(configFile),`targeted-${level}-plan.json`);
 fs.writeFileSync(file,JSON.stringify(plan,null,2)+'\n');
 console.log(`${plan.failing}/${plan.visiting} recordings visiting ${level} fail (${plan.measures}, build ${plan.sourceRuntime.slice(0,7)}); ${plan.failedFrames} failed frames. Plan: ${file}`);
 console.log(`Re-run them with --ids "$(node -p 'require(process.argv[1]).ids.join()' ${file})"`);process.exit(0);
}
// Frames per level over the whole inventory (native RAM labels: $075F world, $075C level, $0770 mode 1-3), cached by inventory hash.
function levelTotals(){
 const file=path.join(path.dirname(configFile),'level-frames.json');try{const c=read(file);if(c.inventorySha256===descriptor.inventorySha256)return c.levels;}catch{}
 const recovered=path.join(path.dirname(latest.mood),'recovered-native'),levels={},buf=Buffer.alloc(2048*4096);
 for(const r of inventory){
  const ram=r.id.startsWith('original:')?path.join(recovered,'original32/traces',r.id.slice(9),'ram.bin'):path.join(recovered,'moods/captures',r.padsSha256,'ram.bin');
  const fd=fs.openSync(ram,'r'),seen=new Set();let pos=0,got;
  while((got=fs.readSync(fd,buf,0,buf.length,pos))>0){for(let o=0;o+2048<=got;o+=2048){const w=buf[o+0x75f]+1,l=buf[o+0x75c]+1;if([1,2,3].includes(buf[o+0x770])&&w<=8&&l<=4){const k=`${w}-${l}`;(levels[k]??={frames:0,recordings:0}).frames++;seen.add(k);}}pos+=got;}
  fs.closeSync(fd);for(const k of seen)levels[k].recordings++;
 }
 fs.writeFileSync(file,JSON.stringify({inventorySha256:descriptor.inventorySha256,levels},null,1)+'\n');return levels;
}
let totals;try{totals=levelTotals();}catch{} // test fixtures have no recordings: the grid then omits totals
const repo=path.resolve(dir,'../../../../..'),git=(...a)=>execFileSync('git',a,{cwd:repo,encoding:'utf8'}).trim();
let currentCache=new Map();const sameGameCache=new Map();
// CURRENT = measured game code (src/, data/) equals HEAD's; tool-only commits do not age a result.
function sameGame(runtime,head){const k=runtime+'/'+head;if(!sameGameCache.has(k)){let same=runtime===head;if(!same)try{git('diff','--quiet',runtime,head,'--','games/smb/src','games/smb/data');same=true;}catch{}sameGameCache.set(k,same);}return sameGameCache.get(k);}
function currentResults(){
 let head='',dirty=true;try{head=git('rev-parse','HEAD');dirty=git('status','--porcelain','--untracked-files=no','--','games/smb/src','games/smb/data')!=='';}catch{}
 const out=[];
 for(const file of config.current??[]){try{const stat=fs.statSync(file),k=`${file}/${stat.size}/${stat.mtimeMs}`;let summary=currentCache.get(k);if(!summary){summary=summarizeCurrent(read(file),inventory,policyHash);currentCache.set(k,summary);}out.push({...summary,file,current:!summary.dirty&&!dirty&&sameGame(summary.runtime,head)});}catch(e){out.push({file,error:e.message});}}
 return {head,dirty,results:out};
}
const historyFiles={full:path.join(path.dirname(configFile),'last-completed-every-frame-audit.json'),scoped:path.join(path.dirname(configFile),'last-completed-scoped-every-frame-audit.json')};
const histories=Object.fromEntries(Object.entries(historyFiles).map(([key,file])=>[key,fs.existsSync(file)?read(file):null]));
let running=true,world=0,wake,cache;
function exit(){running=false;if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();if(args.watch&&process.stdout.isTTY)process.stdout.write('\x1b[?1049l\x1b[?25h');wake?.();}
process.on('SIGINT',exit);process.on('SIGTERM',exit);process.stdout.on('resize',()=>wake?.());
if(args.watch&&process.stdin.isTTY){emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();process.stdout.write('\x1b[?1049h\x1b[?25l');process.stdin.on('keypress',(text,key)=>{if(text==='q'||key?.ctrl&&key.name==='c')exit();else if(/^[0-8]$/.test(text??''))world=Number(text);wake?.();});}
while(running){
 try{
  const c=read(configFile),file=c.combined;config.current=c.current;
  // Also watch the durable notes folder for this exact combined-report convention.
  const backups=fs.readdirSync(path.dirname(latest.mood)).filter(n=>/^combined-replay-[a-f0-9]+\.json$/.test(n)).map(n=>path.join(path.dirname(latest.mood),n));
  const candidates=file?[file]:backups.sort((a,b)=>fs.statSync(a).mtimeMs-fs.statSync(b).mtimeMs);
  let result=emptyResult(inventory),invalid='';
  for(const candidate of candidates){try{const stat=fs.statSync(candidate),key=`${candidate}/${stat.size}/${stat.mtimeMs}`;if(cache?.key===key)result=cache.result;else{result=summarizeCombined(read(candidate),inventory,policyHash);cache={key,result};}invalid='';}catch(e){invalid=e.message;}}
  const historyKey=result.scope?'scoped':'full',lastCompletedFile=historyFiles[historyKey];let lastCompleted=histories[historyKey];
  if(['complete','scoped-complete'].includes(result.progress?.status)&&Number.isFinite(Date.parse(result.progress.finished))&&(!lastCompleted||Date.parse(result.progress.finished)>Date.parse(lastCompleted.finished))){
   lastCompleted={runtime:result.runtime,...(result.scope?{scope:result.scope}:{}),finished:result.progress.finished,started:result.progress.started};histories[historyKey]=lastCompleted;
   fs.writeFileSync(lastCompletedFile+'.partial',JSON.stringify(lastCompleted,null,2)+'\n');fs.renameSync(lastCompletedFile+'.partial',lastCompletedFile);
  }
  const current=currentResults();current.fullCurrent=Boolean(result.reported&&current.head&&!current.dirty&&sameGame(result.runtime,current.head));
  const text=renderCombined({moodCount:mood.runs.length,referenceCount:32,result,lastCompleted,current,totals},{world,width:process.stdout.columns||100,color:Boolean(process.stdout.isTTY)});
  if(args.watch&&process.stdout.isTTY){cursorTo(process.stdout,0,0);clearScreenDown(process.stdout);}
  process.stdout.write(text);if(invalid)process.stderr.write(`Rejected report: ${invalid}\n`);
 }catch(e){process.stderr.write(`No result accepted: ${e.message}\n`);if(!args.watch)process.exitCode=1;}
 if(!args.watch)break;await new Promise(resolve=>{const timer=setTimeout(resolve,5000);wake=()=>{clearTimeout(timer);resolve();};});
}
