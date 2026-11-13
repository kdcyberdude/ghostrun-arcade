/** Retain representative unchanged loader prefixes with native slot5 pole births. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {parseArgs} from 'node:util';import {hash} from './native-mood-corpus.js';
const {values:a}=parseArgs({options:{report:{type:'string'},cache:{type:'string'},out:{type:'string'}}});if(!a.report||!a.cache||!a.out)throw Error('--report PREFIX_REPORT --cache CACHE --out FILE required');
const report=JSON.parse(fs.readFileSync(a.report,'utf8')),selected=new Map<string,any>();for(const e of report.results)if(e.strict?.mismatches.some((m:any)=>m.kind==='flagpole-flag')){const k=`${e.level}/${e.area}`;if(!selected.has(k))selected.set(k,e);}
const pack=(b:Uint8Array)=>zlib.gzipSync(b).toString('base64'),cases=[];
for(const e of selected.values()){
 const dir=path.join(a.cache,'captures',e.sha256),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),audit=JSON.parse(fs.readFileSync(path.join(dir,'audit.json'),'utf8')),entry=audit.entries.find((x:any)=>x.index===e.entry),capture=JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'));if(hash(ram)!==capture.ramSha256||hash(pads)!==e.sha256)throw Error('Native capture integrity');
 const initial=ram.subarray(e.initialFrame*2048,e.sourceFrameOffset*2048),input=pads.subarray(e.sourceFrameOffset,e.endFrame),memory=ram.subarray(e.sourceFrameOffset*2048,e.endFrame*2048);
 cases.push({level:e.level,area:e.area,sourcePadSha256:e.sha256,sourceRamSha256:capture.ramSha256,initialFrame:e.initialFrame,sourceFrameOffset:e.sourceFrameOffset,endFrame:e.endFrame,binding:entry.areaBindings[0],initialSha256:hash(initial),padsSha256:hash(input),ramSha256:hash(memory),initial:pack(initial),pads:pack(input),ram:pack(memory)});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Unchanged native POWER-ON loader prefixes; one unique statically bound scene per input level, no later-pose fit.',cases})+'\n');console.log(`${cases.length} native pole-birth prefixes`);
