/** Native platform bank on every retained FlagpoleSlide/PlayerEndLevel row.
 * node tools/harness/native-flag-platform-events.mjs --traces DIR --levels 3-3,4-3 --out FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},levels:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.levels||!a.out)throw Error('--traces, --levels and --out required');
const events=[];
for(const level of a.levels.split(',')){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=0;frame<b.length/2048;frame++){
  const r=b.subarray(frame*2048,(frame+1)*2048);
  if(r[0x770]!==1||r[0x772]!==3||![4,5].includes(r[14]))continue;
  const platforms=[];
  for(let slot=0;slot<5;slot++){const id=r[0x16+slot];if(r[0xf+slot]&&!(r[0xf+slot]&128)&&id>=36&&id<=44)platforms.push({slot,id,x:r[0x6e+slot]*256+r[0x87+slot],y:(r[0xb6+slot]-1)*256+r[0xcf+slot]});}
  events.push({level,frame,platforms});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native flag platform rows`);
