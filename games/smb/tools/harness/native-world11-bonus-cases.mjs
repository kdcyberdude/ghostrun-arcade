/** Retain authentic bonus-room diagnostics from the shared World1-1 catalog.
 * node tools/harness/native-world11-bonus-cases.mjs --catalog entries.jsonl --hashes SHA,... --out fixture.json
 * Each clip has one declared entrance initialization, with every remaining native row retained. */
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{catalog:{type:'string'},hashes:{type:'string'},out:{type:'string'}}});
if(!a.catalog||!a.hashes||!a.out)throw Error('--catalog, --hashes and --out required');
const hashes=new Set(a.hashes.split(',')),sha=b=>createHash('sha256').update(b).digest('hex'),pack=b=>gzipSync(b,{level:9}).toString('base64'),cases=[];
for(const line of fs.readFileSync(a.catalog,'utf8').trim().split('\n')){
 const run=JSON.parse(line);if(!hashes.has(run.sha256))continue;
 for(const e of run.entries){if(e.bindings[0]?.area!=='bonus-coins'||!e.diagnostic)continue;
  const d=e.diagnostic,s=d.sourceFrameOffset,end=d.endFrame,rows=fs.readFileSync(path.join(run.sourceDirectory,'ram.bin')),allPads=fs.readFileSync(path.join(run.sourceDirectory,'pads.bin')),initial=rows.subarray((s-1)*2048,s*2048),ram=rows.subarray(s*2048,end*2048),pads=allPads.subarray(s,end);
  if(sha(allPads)!==run.sha256)throw Error('Native input hash mismatch');
  cases.push({sha256:run.sha256,entry:e.index,sourceFrameOffset:s,frames:end-s,receipt:e.receipt,capture:run.capture,initialRamSha256:sha(initial),ramSha256:sha(ram),padsSha256:sha(pads),initialRam:pack(initial),ram:pack(ram),pads:pack(pads)});
 }
}
if(cases.length!==hashes.size)throw Error('Expected one bonus clip per requested input');
fs.writeFileSync(a.out,JSON.stringify({schema:'native-world11-bonus-cases-v1',role:'Native entrance-seeded diagnostics; not continuous POWER-ON/dashboard/pixel proof. No subsequent state corrections.',cases})+'\n');console.log(`Retained${cases.length} full native bonus clips`);
