/** Capture independent native end-walk regression windows, starting at engine 4 -> 5 (after flag points).
 * npx tsx tools/harness/native-flag-walk.ts --traces DIR --out data/native-flag-walk.json
 * Measurements are test evidence only; the game never reads these native poses or frame numbers. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'data/native-flag-walk.json'}}});
if(!a.traces)throw Error('--traces is required');
const digits=(r:Uint8Array,start:number,n:number)=>Array.from(r.subarray(start,start+n)).reduce((s,v)=>s*10+v,0);
const row=(r:Uint8Array)=>[r[0x6d]*256+r[0x86]+r[0x400]/256,r[0xce],r[0x57]*256+r[0x705],r[0x71a]*256+r[0x71c],digits(r,0x7f8,3),digits(r,0x7dd,6)*10];
const cases=[];
for(const level of fs.readdirSync(a.traces).filter(l=>/^\d-\d$/.test(l)).sort()){
 const bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 const ram=(f:number)=>new Uint8Array(bytes.buffer,bytes.byteOffset+f*2048,2048);
 for(let f=1;f<bytes.length/2048;f++){
  const r=ram(f);if(r[14]!==5||ram(f-1)[14]!==4)continue;
  const rows=[];let end=f;
  do{end++;rows.push(row(ram(end)));}while(end+1<bytes.length/2048&&ram(end-1)[0x746]<2);
  cases.push({level,first:f,seed:{row:row(r),fraction:r[0x416],absolute:r[0x700],running:r[0x703],gravity:r[0x70a],size:r[0x756]},rows});break;
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native v2 RAM: engine 4 -> 5 through first castle tally row; x includes $0400, speed $57/$0705, gravity $070a, y fraction $0416. Never runtime corrections.',cases})+'\n');
console.log(`Wrote ${cases.length} native flag end-walk windows to ${a.out}`);
