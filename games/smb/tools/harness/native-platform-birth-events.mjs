/** Native platform initialization rows, before their first movement.
 * node tools/harness/native-platform-birth-events.mjs --traces DIR --out FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));let p=fs.readFileSync(path.join(a.traces,level,'initial.ram'));
 for(let frame=0;frame<b.length/2048;frame++){
  const r=b.subarray(frame*2048,(frame+1)*2048);
  for(let slot=0;slot<5;slot++){
   const id=r[0x16+slot];if(!r[0xf+slot]||id<36||id>44||p[0xf+slot]&&p[0x16+slot]===id)continue;
   events.push({level,frame,slot,id,x:r[0x6e+slot]*256+r[0x87+slot],y:r[0xcf+slot],camera:r[0x71a]*256+r[0x71c],task:p[0x71f],counter:r[9]});
  }
  p=r;
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} native platform initialization rows`);
