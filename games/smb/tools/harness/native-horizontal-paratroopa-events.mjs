/** Read-only native id16 motion evidence. node tools/harness/native-horizontal-paratroopa-events.mjs --traces DIR */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-horizontal-paratroopa-events.json'}}});
if(!a.traces)throw Error('--traces is required');
const events=[],state=(r,s)=>({x:r[0x6e+s]*256+r[0x87+s]+r[0x401+s]/256,y:r[0xb6+s]*256+r[0xcf+s]-256+24,primary:r[0xa0+s],secondary:r[0x58+s]});
for(const level of fs.readdirSync(a.traces).sort()){
 const file=path.join(a.traces,level,'ram.bin');if(!fs.existsSync(file))continue;const data=fs.readFileSync(file);
 for(let frame=1;frame<data.length/2048;frame++){
  const p=data.subarray((frame-1)*2048,frame*2048),r=data.subarray(frame*2048,(frame+1)*2048);
  if(p[14]!==8||r[14]!==8||((r[9]-p[9])&255)!==1)continue;
  for(let slot=0;slot<5;slot++)if(p[15+slot]===1&&r[15+slot]===1&&p[22+slot]===16&&r[22+slot]===16&&p[30+slot]===0&&r[30+slot]===0)events.push({level,frame,slot,counter:r[9],before:state(p,slot),after:state(r,slot)});
 }
}
fs.writeFileSync(a.out,JSON.stringify(events)+'\n');console.log(`${events.length} native horizontal Paratroopa rows`);
