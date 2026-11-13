/** Capture source ExecGameLoopback→KillAllEnemies bank erasure, retaining movement aliases. */
import fs from 'node:fs';import path from 'node:path';import {parseArgs} from 'node:util';
const {values:a}=parseArgs({options:{traces:{type:'string'},out:{type:'string'}}});if(!a.traces||!a.out)throw Error('--traces and --out required');
const word=(r,h,l)=>r[h]*256+r[l],bank=r=>Array.from({length:5},(_,slot)=>({slot,flag:r[15+slot],id:r[22+slot],state:r[30+slot],a:r[160+slot],b:r[88+slot],c:r[0x401+slot],d:r[0x434+slot],e:r[0x417+slot]})),events=[];
for(const level of fs.readdirSync(a.traces).filter(s=>/^\d-\d$/.test(s)).sort()){
 const bytes=fs.readFileSync(path.join(a.traces,level,'ram.bin'));
 for(let frame=1;frame<bytes.length/2048;frame++){
  const before=bytes.subarray((frame-1)*2048,frame*2048),after=bytes.subarray(frame*2048,(frame+1)*2048);
  if(`${before[0x75f]+1}-${before[0x75c]+1}`!==level||`${after[0x75f]+1}-${after[0x75c]+1}`!==level||before[0x772]!==3||after[0x772]!==3||before[0x770]!==1||after[0x770]!==1||before[14]!==8||after[14]!==8||word(after,0x71a,0x71c)-word(before,0x71a,0x71c)>-1000||word(after,0x71a,0x71c)-word(before,0x71a,0x71c)<-1024)continue;
  events.push({level,frame,before:bank(before),after:bank(after)});
 }
}
fs.writeFileSync(a.out,JSON.stringify({source:'Native PRG0 ProcLoopCommand→ExecGameLoopback→KillAllEnemies. Raw bank before/after a four-page screen rewind; no model-frame alignment.',events})+'\n');console.log(events.length+' loop bank erasures');
