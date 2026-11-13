/** Preserve full cold controller inputs plus bounded native RAM witnesses.
 * node tools/harness/native-pipe-rise-input-cases.mjs --captures DIR --windows SHA:FROM:TO,... --out JSON */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{captures:{type:'string'},windows:{type:'string'},out:{type:'string'}}});if(!a.captures||!a.windows||!a.out)throw Error('--captures, --windows and --out required');
const sha=b=>createHash('sha256').update(b).digest('hex'),pack=b=>gzipSync(b,{level:9}).toString('base64'),cases=[];
for(const spec of a.windows.split(',')){
 const [hash,start,end]=spec.split(':'),from=Number(start),to=Number(end),dir=path.join(a.captures,hash),pads=fs.readFileSync(path.join(dir,'pads.bin')),allRam=fs.readFileSync(path.join(dir,'ram.bin')),initial=fs.readFileSync(path.join(dir,'initial.ram'));
 if(sha(pads)!==hash||initial.length!==2048||!initial.every(b=>b===255)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<from||to>=pads.length)throw Error('Invalid authenticated cold witness');
 const ram=allRam.subarray(from*2048,(to+1)*2048);cases.push({sha256:hash,sourceRamSha256:sha(allRam),initialRamSha256:sha(initial),from,to,inputFrames:pads.length,pads:pack(pads),ram:pack(ram),windowSha256:sha(ram),capture:JSON.parse(fs.readFileSync(path.join(dir,'capture.json'),'utf8'))});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-pipe-rise-controller-cases-v1',role:'Continuous cold POWER-ON controller replay; no entrance seeding or later model correction. Only the declared native RAM windows are asserted in this focused fixture.',cases})+'\n');
