/** Native platform-bank readout samples: creation, Y-page changes, and every128th row.
 * node tools/harness/native-strict-platform-events.mjs --traces DIR --out FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));let p=fs.readFileSync(path.join(a.traces,level,'initial.ram'));
 for(let frame=0;frame<b.length/2048;frame++){
  const r=b.subarray(frame*2048,(frame+1)*2048);
  for(let slot=0;slot<6;slot++){
   const flag=r[0xf+slot],id=r[0x16+slot];if(!flag||flag&128||id<36||id>44)continue;
   if(frame%128&&!(!p[0xf+slot]||p[0x16+slot]!==id)&&p[0xb6+slot]===r[0xb6+slot])continue;
   events.push([level,frame,slot,flag,id,r[0x87+slot],r[0x6e+slot],r[0xcf+slot],r[0xb6+slot],r[0x1e+slot]]);
  }
  p=r;
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 RAM; tuples: level,frame,slot,flag,id,xLow,xPage,yLow,yPage,state',events})+'\n');console.log(`${events.length} native platform samples`);
