#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {parseArgs} from 'node:util';import {emitKeypressEvents,cursorTo,clearScreenDown} from 'node:readline';
import {emptyResult,summarizeCombined,inventoryHash,sha} from './combined-replay.mjs';import {renderCombined} from './combined-view.mjs';import {policyHash} from './visual-check.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url)),read=p=>JSON.parse(fs.readFileSync(p));
const {values:args}=parseArgs({options:{monitor:{type:'string'},watch:{type:'boolean'},'add-combined':{type:'string'}}});
const configFile=path.join(path.resolve(args.monitor??dir),'sources.json'),config=read(configFile),latest=config.snapshots.at(-1),mood=read(latest.mood);
const inventory=mood.runs.map(r=>({id:`mood:${r.sha256}`,frames:r.frames,padsSha256:r.sha256,start:'power-on'}));
const references=path.join(path.dirname(latest.mood),'traces');
for(let w=1;w<=8;w++)for(let l=1;l<=4;l++){const level=`${w}-${l}`,pads=fs.readFileSync(path.join(references,level,'pads.bin')),initial=fs.readFileSync(path.join(references,level,'initial.ram'));inventory.push({id:`original:${level}`,frames:pads.length,padsSha256:sha(pads),initialRamSha256:sha(initial),start:'native-entrance'});}
const descriptor={schema:'smb-combined-inventory-v1',inventorySha256:inventoryHash(inventory),unit:'input-frame',runs:inventory};
const inventoryFile=path.join(path.dirname(configFile),'combined-inputs.json'),encoded=JSON.stringify(descriptor,null,2)+'\n';if(!fs.existsSync(inventoryFile)||fs.readFileSync(inventoryFile,'utf8')!==encoded)fs.writeFileSync(inventoryFile,encoded);
if(args['add-combined']){const file=path.resolve(args['add-combined']),r=read(file);if(r.progress?.status!=='complete'||r.runs.length!==inventory.length||r.errors?.length)throw Error('Only completed ALL368 every-frame reports may be registered');summarizeCombined(r,inventory,policyHash);config.combined=file;fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');console.log('Combined report registered.');process.exit(0);}
const lastCompletedFile=path.join(path.dirname(configFile),'last-completed-every-frame-audit.json');
let lastCompleted=fs.existsSync(lastCompletedFile)?read(lastCompletedFile):null;
let running=true,world=0,wake,cache;
function exit(){running=false;if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();if(args.watch&&process.stdout.isTTY)process.stdout.write('\x1b[?1049l\x1b[?25h');wake?.();}
process.on('SIGINT',exit);process.on('SIGTERM',exit);process.stdout.on('resize',()=>wake?.());
if(args.watch&&process.stdin.isTTY){emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();process.stdout.write('\x1b[?1049h\x1b[?25l');process.stdin.on('keypress',(text,key)=>{if(text==='q'||key?.ctrl&&key.name==='c')exit();else if(/^[0-8]$/.test(text??''))world=Number(text);wake?.();});}
while(running){
 try{
  const c=read(configFile),file=c.combined;
  // Also watch the durable notes folder for this exact combined-report convention.
  const backups=fs.readdirSync(path.dirname(latest.mood)).filter(n=>/^combined-replay-[a-f0-9]+\.json$/.test(n)).map(n=>path.join(path.dirname(latest.mood),n));
  const candidates=[...backups,...(file?[file]:[])].sort((a,b)=>fs.statSync(a).mtimeMs-fs.statSync(b).mtimeMs);
  let result=emptyResult(inventory),invalid='';
  for(const candidate of candidates){try{const stat=fs.statSync(candidate),key=`${candidate}/${stat.size}/${stat.mtimeMs}`;if(cache?.key===key)result=cache.result;else{result=summarizeCombined(read(candidate),inventory,policyHash);cache={key,result};}}catch(e){invalid=e.message;}}
  if(result.progress?.status==='complete'&&Number.isFinite(Date.parse(result.progress.finished))&&(!lastCompleted||Date.parse(result.progress.finished)>Date.parse(lastCompleted.finished))){
   lastCompleted={runtime:result.runtime,finished:result.progress.finished,started:result.progress.started};
   fs.writeFileSync(lastCompletedFile+'.partial',JSON.stringify(lastCompleted,null,2)+'\n');fs.renameSync(lastCompletedFile+'.partial',lastCompletedFile);
  }
  const text=renderCombined({moodCount:mood.runs.length,referenceCount:32,result,lastCompleted},{world,width:process.stdout.columns||100,color:Boolean(process.stdout.isTTY)});
  if(args.watch&&process.stdout.isTTY){cursorTo(process.stdout,0,0);clearScreenDown(process.stdout);}
  process.stdout.write(text);if(invalid)process.stderr.write(`Rejected report: ${invalid}\n`);
 }catch(e){process.stderr.write(`No result accepted: ${e.message}\n`);if(!args.watch)process.exitCode=1;}
 if(!args.watch)break;await new Promise(resolve=>{const timer=setTimeout(resolve,5000);wake=()=>{clearTimeout(timer);resolve();};});
}
