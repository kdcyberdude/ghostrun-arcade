/** Source WarpZoneObject slot lifetime, with player Y after this row's player pass.
 * node tools/harness/native-warp-zone-events.mjs --traces DIR --out FILE */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const b=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<b.length/2048;frame++){
  const p=b.subarray((frame-1)*2048,frame*2048),r=b.subarray(frame*2048,(frame+1)*2048);
  if(p[0x770]!==1||p[0x772]!==3||r[0x772]!==3||r[14]!==8||p[0x747])continue;
  for(let slot=0;slot<5;slot++)if(p[0xf+slot]&&p[0x16+slot]===52)events.push({level,frame,slot,locked:Boolean(p[0x723]),y:r[0xce],page:r[0xb5],released:!(r[0xf+slot]&&r[0x16+slot]===52)});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events).replace(/\{"level"/g,'\n{"level"')+'\n');console.log(`${events.length} WarpZoneObject rows`);
