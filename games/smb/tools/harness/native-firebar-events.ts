/** Validate instruction-observed ProcFirebar calls before retaining their raw inputs/outputs. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import assert from 'node:assert/strict';import {parseArgs} from 'node:util';
import {stepNativeFirebar} from '../../src/native-firebar.js';import {nativeMiscOffscreen} from '../../src/native-misc.js';
const {values:a}=parseArgs({options:{observations:{type:'string'},out:{type:'string',default:'tests/fixtures/native-firebar-calls.json'}}});if(!a.observations)throw Error('--observations comma-separated JSONL files required');
let checked=0,held=0,offscreen=0;const rows=[];
for(const file of a.observations.split(','))for(const line of fs.readFileSync(file,'utf8').trim().split('\n')){
 if(!line)continue;const r=JSON.parse(line),n={id:r.id,high:r.before[0],low:r.before[1],speed:r.speed,direction:r.direction},label=`${path.basename(file)} row${r.frame} slot${r.slot}`;
 assert.equal(nativeMiscOffscreen(r.x,r.y,r.camera),r.offscreen,label);stepNativeFirebar(n,r.x,r.y,r.camera,!r.master);assert.deepEqual([n.high,n.low],r.after,label);
 checked++;if(r.master)held++;if(r.offscreen&8)offscreen++;rows.push({...r,source:path.basename(file)});
}
fs.writeFileSync(a.out!,JSON.stringify({source:'Read-only CPU entry/return observations of source ProcFirebar during authenticated full-emulator v2 entrance replay. Every completed PPU RAM byte verified before observer output; every call checked against raw offscreen bits and A0/58 result.',checked,held,offscreen,gzipBase64:zlib.gzipSync(JSON.stringify(rows),{level:9}).toString('base64')})+'\n');console.log({checked,held,offscreen});
