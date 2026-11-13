/** Native partial InitializeMemory clears $0388 speed before the next full actor-bank clear. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string',default:'tests/fixtures/native-firebar-partial-memory.json'}}});if(!a.traces)throw Error('--traces required');const events=[];
for(let world=1;world<=8;world++){
 const level=`${world}-4`,ram=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<ram.length/2048;frame++){
  const p=ram.subarray((frame-1)*2048,frame*2048),r=ram.subarray(frame*2048,(frame+1)*2048);
  for(let slot=0;slot<5;slot++)if(p[15+slot]===1&&r[15+slot]===1&&r[22+slot]>=27&&r[22+slot]<=31&&p[22+slot]===r[22+slot]&&p[0x388+slot]&&!r[0x388+slot]){
   const bytes=b=>({id:b[22+slot],high:b[0xa0+slot],low:b[0x58+slot],speed:b[0x388+slot],direction:b[0x34+slot]});events.push({level,frame,slot,x:r[0x6e+slot]*256+r[0x87+slot]+4,y:r[0xcf+slot]+4,before:bytes(p),after:bytes(r)});
  }
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Original v2 untouched PPU RAM transitions: live flags and ID retained while native partial memory clear zeroes0388',events})+'\n');console.log(events.length);
