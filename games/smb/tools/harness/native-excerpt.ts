/** Multi-run native evidence: one compact excerpt per recorded run of a level (evidence/native-runs/<level>.<run>.json), replayed by
 * tests/native-runs.test.ts. Several runs of the same level (different decisions, so different random-register and frame-counter phases) are
 * all checked, so a rule has to hold for every run, not just the one it was fitted on.
 *   npx tsx tools/harness/native-excerpt.ts --traces DIR --entrances DIR --run v2 [--levels 1-1,4-3] [--out evidence/native-runs]
 * DIR/<level>/{initial.ram,pads.bin,ram.bin} come from ghostrun-lab scripts/recording/native_ram_trace.py. An excerpt keeps the full RAM before the first pad (decoded at replay time, so a better entrance decoder
 * applies to old runs), the pads and, per
 * frame until the level ends, only the RAM bytes the comparison reads (ADDRS) plus the random register and frame counter, gzip+base64.
 * `firsts` records each field's first divergence when the excerpt was taken: the test fails if any field diverges earlier (re-run this
 * tool to raise them after a fix). Read-only measurement tooling; never used by the browser game. */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {parseArgs} from 'node:util';
import {decodeEntrance} from './native-entrance.mjs';
import {compareRun,nativeRow,type Divergence} from './native-divergence.js';

const range=(a:number,n:number)=>Array.from({length:n},(_,i)=>a+i);
/** HUD digits, coins, camera, Mario, mode/level, engine, five enemy slots (active, id, state, x page, x, x sub, y), random register, frame counter. */
export const ADDRS=[...range(0x7f8,3),...range(0x7dd,6),0x75e,0x71a,0x71c,0x6d,0x86,0xce,0x770,0x772,0x0e,0x75f,0x75c,0x09,...range(0x7a7,7),
 ...range(0x0f,5),...range(0x16,5),...range(0x1e,5),...range(0x6e,5),...range(0x87,5),...range(0x401,5),...range(0xcf,5)];
export type Excerpt={schema:'native-run-excerpt-v2',level:string,run:string,source:Record<string,unknown>,initialRam:string,frames:number,addrs:number[],pads:string,ram:string,firsts:Divergence['fields']};
const pack=(b:Uint8Array)=>zlib.gzipSync(b,{level:9}).toString('base64'),unpack=(s:string)=>new Uint8Array(zlib.gunzipSync(Buffer.from(s,'base64')));

export function excerptReplay(x:Excerpt):Divergence{
 const pads=unpack(x.pads),ram=unpack(x.ram),n=x.addrs.length;
 const frameRam=(f:number)=>{const r=new Uint8Array(2048);if(f<x.frames)x.addrs.forEach((a,i)=>{r[a]=ram[f*n+i];});return r;};
 return compareRun(decodeEntrance(unpack(x.initialRam),{level:x.level},x.source.nativeAreaBinding),pads,frameRam,x.level);
}

if(import.meta.url===`file://${process.argv[1]}`){
 const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},run:{type:'string'},levels:{type:'string'},out:{type:'string',default:'evidence/native-runs'}}});
 if(!a.traces||!a.entrances||!a.run)throw Error('--traces, --entrances and --run are required');
 const levels=a.levels?.split(',')??fs.readdirSync(a.traces).filter(d=>/^\d-\d$/.test(d)).sort();
 for(const level of levels){
  const dir=path.join(a.traces,level),receipt=JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'));
  const raw=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),total=Math.min(pads.length,raw.length/2048);
  let frames=0;while(frames<total){const n=nativeRow(new Uint8Array(raw.buffer,raw.byteOffset+frames*2048,2048));if(n.mode!==1||n.level!==level)break;frames++;}
  const ram=new Uint8Array(frames*ADDRS.length);for(let f=0;f<frames;f++)ADDRS.forEach((ad,i)=>{ram[f*ADDRS.length+i]=raw[f*2048+ad];});
  const x:Excerpt={schema:'native-run-excerpt-v2',level,run:a.run,source:{...(receipt.areaBinding?{nativeAreaBinding:receipt.areaBinding}:{}),actionsSha256:receipt.actionsSha256,initialRamSha256:receipt.initialRamSha256,sourceFrameOffset:receipt.sourceFrameOffset,
   method:'pad bytes replayed one per PPU frame on the NeSLE CPU build from the saved level entrance (ghostrun-lab native_ram_trace.py)'},
   initialRam:pack(new Uint8Array(fs.readFileSync(path.join(dir,'initial.ram')))),frames,addrs:ADDRS,pads:pack(pads.subarray(0,frames+1)),ram:pack(ram),firsts:{}};
  x.firsts=excerptReplay(x).fields;
  const file=path.join(a.out,`${level}.${a.run}.json`);fs.writeFileSync(file,JSON.stringify(x)+'\n');
  console.log(level,frames,JSON.stringify(x.firsts),(fs.statSync(file).size/1024).toFixed(0)+'K');
 }
}
