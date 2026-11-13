/** Preserve the full native v2 1-2 input/RAM stream: one initial seed, no corrections at the exit or following level. */
import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},level:{type:'string',default:'1-2'},out:{type:'string',default:'tests/fixtures/native-pipe-rise-clock.json'}}});
if(!a.traces||!a.entrances)throw Error('--traces and --entrances required');
const level=a.level,read=n=>fs.readFileSync(path.join(a.traces,level,n)),initial=read('initial.ram'),pads=read('pads.bin'),ram=read('ram.bin'),hash=b=>createHash('sha256').update(b).digest('hex'),pack=b=>gzipSync(b).toString('base64');
if(ram.length!==pads.length*2048)throw Error('Input/RAM length mismatch');
fs.writeFileSync(a.out,JSON.stringify({source:'Unchanged retained native v2 capture; one initial RAM seed before all pads; no exit/level reseeding.',level,receipt:JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8')),initialRamSha256:hash(initial),padsSha256:hash(pads),ramSha256:hash(ram),initial:pack(initial),pads:pack(pads),ram:pack(ram)})+'\n');
