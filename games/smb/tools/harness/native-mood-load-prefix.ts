/** Source ScreenRoutines prefixes from immutable mood captures. No later-pose search or runtime correction. */
import zlib from 'node:zlib';import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {execFileSync} from 'node:child_process';
import {decodeEntrance} from './native-entrance.mjs';import {strictCompare} from './native-strict.js';import {hash} from './native-mood-corpus.js';
export function auditNativeLoadPrefix(ram:Uint8Array,pads:Uint8Array,entry:any){
 const end=entry.nativeEntryFrame??entry.endFrame,start=entry.loadFrame+1;if(end<=start||entry.areaBindings.length!==1)return;
 const initial=ram.subarray(entry.loadFrame*2048,start*2048),entrance=decodeEntrance(initial,{level:entry.level},entry.areaBindings[0]);if(!entrance.nativeLoad)return;
 const input=pads.subarray(start,end),memory=ram.subarray(start*2048,end*2048);
 return {initialFrame:entry.loadFrame,sourceFrameOffset:start,endFrame:end,initialRamSha256:hash(initial),padsSha256:hash(input),ramSha256:hash(memory),strict:strictCompare(entrance,input,memory,entry.level)};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{cache:{type:'string'},out:{type:'string'},limit:{type:'string'},hashes:{type:'string'},fixture:{type:'string'}}});if(!a.cache||!a.out)throw Error('--cache CACHE --out FILE required');
 const runtimeCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();execFileSync('git',['diff','--exit-code',runtimeCommit,'--','src','data'],{stdio:'pipe'});
 const auditToolSha256=hash(Buffer.concat(fs.readdirSync(new URL('.',import.meta.url)).filter(f=>/^native-.*\.(ts|mjs)$/.test(f)).sort().map(f=>fs.readFileSync(new URL(f,import.meta.url)))));
 const inventory=JSON.parse(fs.readFileSync(path.join(a.cache,'inventory.json'),'utf8')),runs=a.hashes?inventory.runs.filter((r:any)=>a.hashes!.split(',').includes(r.sha256)):a.limit?inventory.runs.slice(0,Number(a.limit)):inventory.runs,results:any[]=[],cases:any[]=[];
 for(const run of runs){
  const dir=path.join(a.cache,'captures',run.sha256),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json'),'utf8')),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));
  if(hash(ram)!==capture.ramSha256||hash(pads)!==run.sha256)throw Error(`capture integrity ${run.sha256}`);
  for(const entry of audit.entries){try{const prefix=auditNativeLoadPrefix(ram,pads,entry);if(prefix){results.push({sha256:run.sha256,entry:entry.index,level:entry.level,area:entry.areaBindings[0].area,...prefix});if(a.fixture){const pack=(b:Uint8Array)=>zlib.gzipSync(b).toString('base64');cases.push({sha256:run.sha256,entry:entry.index,level:entry.level,binding:entry.areaBindings[0],initialFrame:prefix.initialFrame,sourceFrameOffset:prefix.sourceFrameOffset,endFrame:prefix.endFrame,initialRamSha256:prefix.initialRamSha256,padsSha256:prefix.padsSha256,ramSha256:prefix.ramSha256,initial:pack(ram.subarray(prefix.initialFrame*2048,prefix.sourceFrameOffset*2048)),pads:pack(pads.subarray(prefix.sourceFrameOffset,prefix.endFrame)),ram:pack(ram.subarray(prefix.sourceFrameOffset*2048,prefix.endFrame*2048))});}}}catch(error){results.push({sha256:run.sha256,entry:entry.index,level:entry.level,error:String(error)});}}
  console.log(JSON.stringify({sha256:run.sha256,entries:audit.entries.length,prefixes:results.filter(r=>r.sha256===run.sha256&&!r.error).length}));
 }
 const good=results.filter(r=>r.strict),report={schema:'native-load-prefix-audit-v1',runtimeCommit,auditToolSha256,runs:runs.length,prefixes:good.length,steppedFrames:good.reduce((n,r)=>n+r.strict.coverage.frames,0),coordinateComparedFrames:good.reduce((n,r)=>n+r.strict.coverage.alignedFrames,0),errors:results.filter(r=>r.error),results};if(a.fixture)fs.writeFileSync(a.fixture,JSON.stringify({schema:'native-load-prefix-cases-v1',source:'Unchanged raw native POWER-ON prefixes. One ScreenRoutines seed at each InitializeArea epoch; no future-state correction.',cases})+'\n');fs.writeFileSync(a.out,JSON.stringify(report,null,1)+'\n');console.log(JSON.stringify({...report,results:undefined}));
}
