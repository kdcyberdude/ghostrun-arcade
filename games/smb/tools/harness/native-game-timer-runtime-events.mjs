/** Keep native timer digits/control on EVERY same-level PPU row, without an engine7 or000 exemption.
 * npx tsx tools/harness/native-game-timer-runtime-events.mjs --traces DIR --entrances DIR --levels 1-1,1-2,2-2,4-2,7-2,7-4 --out tests/fixtures/native-game-timer-runtime.json */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';import {decodeEntrance} from './native-entrance.mjs';
const {values:a}=parseArgs({options:{traces:{type:'string'},entrances:{type:'string'},levels:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.entrances||!a.levels||!a.out)throw Error('--traces, --entrances, --levels and --out required');
const runs=[];
for(const level of a.levels.split(',')){
 const dir=path.join(a.traces,level),ram=fs.readFileSync(path.join(dir,'ram.bin')),pads=fs.readFileSync(path.join(dir,'pads.bin')),entrance=decodeEntrance(fs.readFileSync(path.join(dir,'initial.ram')),JSON.parse(fs.readFileSync(path.join(a.entrances,level,'entrance.json'),'utf8'))),times=[],controls=[];
 for(let frame=0;frame<pads.length;frame++){
  const r=ram.subarray(frame*2048,(frame+1)*2048);if(![1,2].includes(r[0x770])||`${r[0x75f]+1}-${r[0x75c]+1}`!==level)break;
  times.push(r[0x7f8]*100+r[0x7f9]*10+r[0x7fa]);controls.push(r[0x787]);
 }
 runs.push({level,entrance,pads:Array.from(pads.subarray(0,times.length)),times,controls});
}
fs.writeFileSync(a.out,JSON.stringify({source:'Every same-level native timer digit/control row, including all entrances/deaths/pipes and automatic engine7 preloads; no engine7/blank000 exemption',runs})+'\n');console.log(`${runs.reduce((n,r)=>n+r.times.length,0)} native PPU timer rows`);
