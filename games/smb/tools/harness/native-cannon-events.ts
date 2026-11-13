/** Read-only proof publisher. Build native-cannon-capi.cpp with the lab's normal
 * NROM headers, replay selected levels using native-enemy-cursor-traces.py, then:
 * npx tsx tools/harness/native-cannon-events.ts --calls DIR --traces DIR --entrances DIR --out JSON
 * No native state writes, prior-RNG reconstruction or fitted row schedules. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {createHash} from 'node:crypto';import {parseArgs} from 'node:util';import {nativeCannonOutside} from '../../src/native-cannon.js';
const {values:a}=parseArgs({options:{calls:{type:'string'},traces:{type:'string'},entrances:{type:'string'},out:{type:'string'}}});if(!a.calls||!a.traces||!a.entrances||!a.out)throw Error('--calls --traces --entrances --out required');
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64');
const levels=[['8-3',341],['7-1',443],['5-2',800]] as const,cases=[],prefixes=[],receipts=[];let calls=0,erasures=0;
for(const [id,frames]of levels){
 const directory=path.join(a.traces,id),data=fs.readFileSync(path.join(directory,'ram.bin')),initial=fs.readFileSync(path.join(directory,'initial.ram')),pads=fs.readFileSync(path.join(directory,'pads.bin')),raw=fs.readFileSync(path.join(a.calls,`${id}.jsonl`));
 const events=raw.toString().trim().split('\n').map(line=>JSON.parse(line));
 for(const e of events){if(!e.beforeFlag)continue;const expected=nativeCannonOutside(e.x,e.camera);if(expected!==!e.afterFlag)throw Error(`Source bounds mismatch ${id} row${e.frame} ${JSON.stringify(e)}`);cases.push({level:id,...e});calls++;erasures+=Number(!e.afterFlag);}
 receipts.push({id,frames:data.length/2048,ramSha256:sha(data),initialRamSha256:sha(initial),padsSha256:sha(pads),observerSha256:sha(raw),calls:events.length});
 prefixes.push({id,frames,entrance:JSON.parse(fs.readFileSync(path.join(a.entrances,id,'entrance.json'),'utf8')),initialRam:pack(initial),pads:pack(pads.subarray(0,frames)),ram:pack(data.subarray(0,frames*2048))});
}
fs.writeFileSync(a.out,JSON.stringify({schema:'native-cannon-bounds-v1',calls,erasures,receipts,cases,prefixes})+'\n');console.log(JSON.stringify({calls,erasures,levels:receipts}));
