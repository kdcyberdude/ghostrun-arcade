/** Package an unmodified native replay prefix, starting at its recorded entrance.
 * npx tsx tools/harness/native-replay-prefix.ts --traces DIR --entrance JSON --frames N --out JSON */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrance:{type:'string'},frames:{type:'string'},out:{type:'string'}}});
if(!a.traces||!a.entrance||!a.out)throw Error('--traces, --entrance and --out required');
const frames=Number(a.frames),initial=fs.readFileSync(path.join(a.traces,'initial.ram')),pads=fs.readFileSync(path.join(a.traces,'pads.bin')),ram=fs.readFileSync(path.join(a.traces,'ram.bin'));
if(initial.length!==2048||!Number.isInteger(frames)||frames<1||frames>pads.length||frames*2048>ram.length)throw Error('Invalid native prefix length');
const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64'),sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
const prefix=ram.subarray(0,frames*2048),receipt=JSON.parse(fs.readFileSync(a.entrance,'utf8'));
fs.writeFileSync(a.out,JSON.stringify({source:'Unmodified recorded native entrance and first input/RAM rows; no later-pose initializer.',frames,receipt,initialRamSha256:sha(initial),sourceRamSha256:sha(ram),ramSha256:sha(prefix),initialRam:pack(initial),pads:pack(pads.subarray(0,frames)),ram:pack(prefix)})+'\n');
console.log(JSON.stringify({frames,initialRamSha256:sha(initial),ramSha256:sha(prefix)}));
