/** Retain the two assigned main-room native epochs, once seeded, with all rows.
 * node tools/harness/native-world11-player-bg-cases.mjs CATALOG OUTPUT */
import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';import{gzipSync}from'node:zlib';
const [catalog,out]=process.argv.slice(2);if(!catalog||!out)throw Error('CATALOG OUTPUT required');
const entries=new Map([['f25dd9e50ce8a2fd3b747ad5e358a0dd9c659381f045354003f48c7d6287baac',1],['9a3d23e2e274519969fd45896b4762ebd2125a7de3932262e5e8eec939ed5a0e',0]]),hash=b=>createHash('sha256').update(b).digest('hex'),cases=[];
for(const line of fs.readFileSync(catalog,'utf8').trim().split('\n')){
 const run=JSON.parse(line);if(!entries.has(run.sha256))continue;const e=run.entries.find(e=>e.index===entries.get(run.sha256)),d=e.diagnostic,start=d.sourceFrameOffset,end=d.endFrame;
 const ram=fs.readFileSync(path.join(run.sourceDirectory,'ram.bin')),pads=fs.readFileSync(path.join(run.sourceDirectory,'pads.bin'));if(hash(pads)!==run.sha256||hash(ram)!==run.capture.ramSha256)throw Error('source capture hash mismatch');
 const c={sha256:run.sha256,entry:e.index,sourceFrameOffset:start,endFrame:end,receipt:e.receipt,capture:run.capture};
 for(const[key,data]of[['initial',ram.subarray((start-1)*2048,start*2048)],['ram',ram.subarray(start*2048,end*2048)],['pads',pads.subarray(start,end)]]){c[key]=gzipSync(data,{level:9,mtime:0}).toString('base64');c[key+'Sha256']=hash(data);}cases.push(c);
}
if(cases.length!==2)throw Error('two assigned epochs required');fs.writeFileSync(out,JSON.stringify({role:'Full retained native World1-1 epochs after one entrance seed; NOT continuous POWER-ON proof. Every row compared independently after first mismatch; pictures/joint unchecked.',cases})+'\n');
