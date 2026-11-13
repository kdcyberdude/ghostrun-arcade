/** Retain one complete native entrance→victory scope for the continuous strict audit regression.
 * npx tsx tools/harness/native-strict-victory-fixture.ts --traces DIR [--level 1-4 --out FILE]
 * Stores only captured input/RAM, including every earlier gameplay row; never seeds at victory. */
import fs from 'node:fs';import path from 'node:path';import zlib from 'node:zlib';import {parseArgs} from 'node:util';import {hash} from './native-mood-corpus.js';
const {values:a}=parseArgs({options:{traces:{type:'string'},level:{type:'string',default:'1-4'},out:{type:'string',default:'tests/fixtures/native-strict-victory.json'}}});if(!a.traces)throw Error('--traces required');
const dir=path.join(a.traces,a.level!),initial=fs.readFileSync(path.join(dir,'initial.ram')),allPads=fs.readFileSync(path.join(dir,'pads.bin')),allRam=fs.readFileSync(path.join(dir,'ram.bin'));let frames=0,victoryFrames=0,victoryFirst=-1,levelChange=-1;
for(;frames<allPads.length;frames++){const r=allRam.subarray(frames*2048,(frames+1)*2048);if(`${r[0x75f]+1}-${r[0x75c]+1}`!==a.level&&levelChange<0)levelChange=frames;if(r[0x770]===2){if(victoryFirst<0)victoryFirst=frames;victoryFrames++;}}
const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64'),pads=allPads.subarray(0,frames),ram=allRam.subarray(0,frames*2048);
fs.writeFileSync(a.out!,JSON.stringify({schema:'native-strict-victory-v1',level:a.level,frames,victoryFirst,victoryFrames,levelChange,source:{method:'all original retained native PPU input/RAM rows from level entrance through victory and following world load; no level-number truncation',padSha256:hash(pads),ramSha256:hash(ram)},initial:pack(initial),pads:pack(pads),ram:pack(ram)})+'\n');
console.log(a.level,frames,victoryFirst,victoryFrames);
