/** Native actual-counter platform motor turns, including held/resumed epochs.
 * node tools/harness/native-platform-clock-events.mjs --traces DIR --out FILE */
import zlib from 'node:zlib';import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const state=(r,s)=>({id:r[0x16+s],x:r[0x6e+s]*256+r[0x87+s],y:(r[0xb6+s]-1)*256+r[0xcf+s],a:r[0xa0+s],b:r[0x58+s],c:r[0x401+s],d:r[0x434+s],e:r[0x417+s]}),events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<bytes.length/2048;frame++){
  const p=bytes.subarray((frame-1)*2048,frame*2048),r=bytes.subarray(frame*2048,(frame+1)*2048);
  if(p[0x770]!==1||r[0x770]!==1||p[0x772]!==3||r[0x772]!==3||r[14]===0||r[0x747]&&!p[0x747])continue;
  for(let slot=0;slot<5;slot++){
   const id=p[0x16+slot];if(!p[0xf+slot]||!r[0xf+slot]||r[0x16+slot]!==id||id<36||id>44)continue;
   if(id===36&&(p[0x1e+slot]>=128||r[0x46+slot]||p[0xcf+slot]<=45||p[0xcf+p[0x1e+slot]]<=45))continue;
   const before=state(p,slot),after=state(r,slot);if(Math.abs(after.x-before.x)>8)continue;
   const flag=r[0x3a2+slot],load=flag>=128?0:flag===slot?1:-1;
   events.push({level,frame,slot,counter:r[9],run:!r[0x747],load,before,after});
  }
 }
}
const byId={};for(const e of events)byId[e.before.id]=(byId[e.before.id]??0)+1;
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 actual-counter platform turns; raw RAM aliases. New TimerControl onsets excluded until per-slot observer coverage; held/running turns retained.',turns:events.length,heldTurns:events.filter(e=>!e.run).length,byId,gzipBase64:zlib.gzipSync(JSON.stringify(events),{level:9}).toString('base64')})+'\n');console.log(`${events.length} native actual-counter platform turns`);
